import type { OperationKind } from "../shared/domain.js";
import { supabase } from "../lib/supabase.js";
import { getExchangeRate } from "./exchange-rates.js";
import { ENTRY_LIST_SELECT, type EntryListItem } from "./entries.js";
import {
  enrichEntryForClientList,
  enrichTransferForClientList,
  type EntryForClient,
  type TransferForClient
} from "./operation-photos.js";
import {
  toOperationCreatedByDto,
  type OperationCreatedByDto
} from "./operation-created-by.js";
import { TRANSFER_LIST_SELECT, type TransferListItem } from "./transfers.js";

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function defaultDateRange(): { from: string; to: string } {
  const end = endOfDay(new Date());
  const start = startOfDay(new Date());
  start.setDate(start.getDate() - 6);
  return { from: start.toISOString(), to: end.toISOString() };
}

function parseIsoOrDateOnly(raw: string): Date {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T12:00:00`);
  }
  return new Date(trimmed);
}

export type OperationsKindFilter = "all" | "income" | "expense" | "transfer";

export interface OperationsListQuery {
  from: string;
  to: string;
  kind: OperationsKindFilter;
  accountId?: string;
  categoryId?: string;
  q?: string;
  limit: number;
  offset: number;
  /** Вкладка «История»: лимит строк на стороне БД, те же фильтры что и в обычном режиме */
  historyScope: boolean;
}

export type OperationTimelineItem =
  | { kind: "entry"; occurredAt: string; entry: EntryListItem }
  | { kind: "transfer"; occurredAt: string; transfer: TransferListItem };

export type OperationTimelineItemDto = {
  kind: "entry" | "transfer";
  occurredAt: string;
  createdAt: string;
  createdBy: OperationCreatedByDto | null;
  entry?: EntryForClient;
  transfer?: TransferForClient;
};

export interface OperationsListResult {
  reportingCurrency: string;
  items: OperationTimelineItemDto[];
  total: number;
  summary: {
    operationsCount: number;
    incomeReporting: number;
    expenseReporting: number;
    netReporting: number;
  };
}

function firstQueryString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const t = value.trim();
    return t.length > 0 ? t : undefined;
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    const t = value[0].trim();
    return t.length > 0 ? t : undefined;
  }
  return undefined;
}

/** Legacy in-memory path when text search is active. */
const HISTORY_SEARCH_DB_CAP = 2000;
/** Per-table fetch cap for paginated history (merge then slice). */
const HISTORY_MERGE_FETCH_CAP = 800;

type EntrySummaryRow = {
  amount: string;
  currency_code: string;
  kind: OperationKind;
};

export function parseOperationsListQuery(
  query: Record<string, unknown>
): OperationsListQuery {
  const scope = (firstQueryString(query.scope) ?? "").toLowerCase();
  const historyScope = scope === "history";

  const fromRaw = firstQueryString(query.from);
  const toRaw = firstQueryString(query.to);
  const { from: defaultFrom, to: defaultTo } = defaultDateRange();

  let fromIso: string;
  let toIso: string;

  if (historyScope) {
    if (fromRaw && toRaw) {
      fromIso = startOfDay(parseIsoOrDateOnly(fromRaw)).toISOString();
      toIso = endOfDay(parseIsoOrDateOnly(toRaw)).toISOString();
    } else {
      const start = startOfDay(new Date("2000-01-01"));
      fromIso = start.toISOString();
      toIso = endOfDay(new Date()).toISOString();
    }
  } else {
    fromIso = fromRaw ? startOfDay(parseIsoOrDateOnly(fromRaw)).toISOString() : defaultFrom;
    toIso = toRaw ? endOfDay(parseIsoOrDateOnly(toRaw)).toISOString() : defaultTo;
  }

  const fromMs = new Date(fromIso).getTime();
  const toMs = new Date(toIso).getTime();
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
    throw new Error("Некорректный диапазон дат");
  }
  if (fromMs > toMs) {
    throw new Error("Дата «с» позже даты «по»");
  }
  if (!historyScope) {
    const maxSpan = 93 * 24 * 60 * 60 * 1000;
    if (toMs - fromMs > maxSpan) {
      throw new Error("Интервал не больше 93 дней");
    }
  } else if (fromRaw && toRaw) {
    const maxSpanHistory = 400 * 24 * 60 * 60 * 1000;
    if (toMs - fromMs > maxSpanHistory) {
      throw new Error("Интервал не больше 400 дней");
    }
  }

  const kindRaw = (firstQueryString(query.kind) ?? "all").toLowerCase();
  const kind: OperationsKindFilter = ["all", "income", "expense", "transfer"].includes(kindRaw)
    ? (kindRaw as OperationsKindFilter)
    : "all";

  const accountId = firstQueryString(query.accountId);
  const categoryId = firstQueryString(query.categoryId);
  const q = firstQueryString(query.q);

  const limitRaw = firstQueryString(query.limit);
  const offsetRaw = firstQueryString(query.offset);
  let limit = Number(limitRaw ?? 25);
  let offset = Number(offsetRaw ?? 0);
  if (!Number.isFinite(limit) || limit < 1) {
    limit = 25;
  }
  if (limit > 100) {
    limit = 100;
  }
  if (!Number.isFinite(offset) || offset < 0) {
    offset = 0;
  }

  return {
    from: fromIso,
    to: toIso,
    kind,
    accountId,
    categoryId,
    q,
    limit,
    offset,
    historyScope
  };
}

async function fetchEntriesWindow(
  workspaceId: string,
  opts: {
    from: string;
    to: string;
    kind?: OperationKind;
    accountId?: string;
    categoryId?: string;
    maxRows?: number;
  }
): Promise<EntryListItem[]> {
  let q = supabase
    .from("entries")
    .select(ENTRY_LIST_SELECT)
    .eq("workspace_id", workspaceId)
    .gte("occurred_at", opts.from)
    .lte("occurred_at", opts.to);

  if (opts.kind) {
    q = q.eq("kind", opts.kind);
  }
  if (opts.accountId) {
    q = q.eq("account_id", opts.accountId);
  }
  if (opts.categoryId) {
    q = q.eq("category_id", opts.categoryId);
  }

  q = q.order("occurred_at", { ascending: false });

  if (opts.maxRows !== undefined) {
    q = q.limit(opts.maxRows);
  }

  const { data, error } = await q;

  if (error) {
    throw error;
  }

  return (data ?? []) as EntryListItem[];
}

async function fetchTransfersWindow(
  workspaceId: string,
  opts: {
    from: string;
    to: string;
    accountId?: string;
    maxRows?: number;
  }
): Promise<TransferListItem[]> {
  let q = supabase
    .from("transfers")
    .select(TRANSFER_LIST_SELECT)
    .eq("workspace_id", workspaceId)
    .gte("occurred_at", opts.from)
    .lte("occurred_at", opts.to);

  if (opts.accountId) {
    q = q.or(
      `from_account_id.eq.${opts.accountId},to_account_id.eq.${opts.accountId}`
    );
  }

  q = q.order("occurred_at", { ascending: false });

  if (opts.maxRows !== undefined) {
    q = q.limit(opts.maxRows);
  }

  const { data, error } = await q;

  if (error) {
    throw error;
  }

  return (data ?? []) as TransferListItem[];
}

function matchesSearch(item: OperationTimelineItem, needle: string): boolean {
  const n = needle.trim().toLowerCase();
  if (!n) {
    return true;
  }

  if (item.kind === "entry") {
    const e = item.entry;
    const hay = [
      e.note,
      e.category?.name,
      e.account?.name,
      e.kind,
      e.currency_code
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(n);
  }

  const t = item.transfer;
  const hay = [t.note, t.from_account?.name, t.to_account?.name, t.from_currency_code, t.to_currency_code]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(n);
}

function serializeTimelineItem(item: OperationTimelineItem): OperationTimelineItemDto {
  if (item.kind === "entry") {
    return {
      kind: "entry",
      occurredAt: item.occurredAt,
      createdAt: item.entry.created_at,
      createdBy: toOperationCreatedByDto(item.entry),
      entry: enrichEntryForClientList(item.entry)
    };
  }

  return {
    kind: "transfer",
    occurredAt: item.occurredAt,
    createdAt: item.transfer.created_at,
    createdBy: toOperationCreatedByDto(item.transfer),
    transfer: enrichTransferForClientList(item.transfer)
  };
}

async function countEntriesInRange(
  workspaceId: string,
  opts: {
    from: string;
    to: string;
    kind?: OperationKind;
    accountId?: string;
    categoryId?: string;
  }
): Promise<number> {
  let q = supabase
    .from("entries")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("occurred_at", opts.from)
    .lte("occurred_at", opts.to);

  if (opts.kind) {
    q = q.eq("kind", opts.kind);
  }
  if (opts.accountId) {
    q = q.eq("account_id", opts.accountId);
  }
  if (opts.categoryId) {
    q = q.eq("category_id", opts.categoryId);
  }

  const { count, error } = await q;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function countTransfersInRange(
  workspaceId: string,
  opts: {
    from: string;
    to: string;
    accountId?: string;
  }
): Promise<number> {
  let q = supabase
    .from("transfers")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("occurred_at", opts.from)
    .lte("occurred_at", opts.to);

  if (opts.accountId) {
    q = q.or(
      `from_account_id.eq.${opts.accountId},to_account_id.eq.${opts.accountId}`
    );
  }

  const { count, error } = await q;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function fetchEntrySummaryRows(
  workspaceId: string,
  opts: {
    from: string;
    to: string;
    kind?: OperationKind;
    accountId?: string;
    categoryId?: string;
  }
): Promise<EntrySummaryRow[]> {
  let q = supabase
    .from("entries")
    .select("amount, currency_code, kind")
    .eq("workspace_id", workspaceId)
    .gte("occurred_at", opts.from)
    .lte("occurred_at", opts.to);

  if (opts.kind) {
    q = q.eq("kind", opts.kind);
  }
  if (opts.accountId) {
    q = q.eq("account_id", opts.accountId);
  }
  if (opts.categoryId) {
    q = q.eq("category_id", opts.categoryId);
  }

  const { data, error } = await q;

  if (error) {
    throw error;
  }

  return (data ?? []) as EntrySummaryRow[];
}

async function sumEntrySummaryRowsReporting(
  rows: EntrySummaryRow[],
  reportingCurrency: string
): Promise<{ income: number; expense: number }> {
  const rateCache = new Map<string, number>();

  async function convert(amount: number, from: string, to: string): Promise<number> {
    const key = `${from}:${to}`;
    if (!rateCache.has(key)) {
      rateCache.set(key, await getExchangeRate(from, to));
    }
    return Number((amount * (rateCache.get(key) ?? 1)).toFixed(2));
  }

  let income = 0;
  let expense = 0;

  for (const e of rows) {
    const c = await convert(Number(e.amount), e.currency_code, reportingCurrency);
    if (e.kind === "income") {
      income += c;
    } else {
      expense += c;
    }
  }

  return { income, expense };
}

async function sumEntriesReporting(
  entries: EntryListItem[],
  reportingCurrency: string
): Promise<{ income: number; expense: number }> {
  const rateCache = new Map<string, number>();

  async function convert(amount: number, from: string, to: string): Promise<number> {
    const key = `${from}:${to}`;
    if (!rateCache.has(key)) {
      rateCache.set(key, await getExchangeRate(from, to));
    }
    return Number((amount * (rateCache.get(key) ?? 1)).toFixed(2));
  }

  let income = 0;
  let expense = 0;

  for (const e of entries) {
    const c = await convert(Number(e.amount), e.currency_code, reportingCurrency);
    if (e.kind === "income") {
      income += c;
    } else {
      expense += c;
    }
  }

  return { income, expense };
}

async function listOperationsTimelineHistoryPaginated(
  workspaceId: string,
  reportingCurrency: string,
  query: OperationsListQuery
): Promise<OperationsListResult> {
  const base = {
    from: query.from,
    to: query.to,
    accountId: query.accountId
  };

  const entryKind =
    query.kind === "income" || query.kind === "expense"
      ? (query.kind as OperationKind)
      : undefined;

  const mergeFetch = Math.min(
    query.offset + query.limit + 40,
    HISTORY_MERGE_FETCH_CAP
  );

  let entryTotal = 0;
  let transferTotal = 0;
  let entryRows: EntryListItem[] = [];
  let transferRows: TransferListItem[] = [];

  if (query.categoryId) {
    entryTotal = await countEntriesInRange(workspaceId, {
      ...base,
      categoryId: query.categoryId,
      kind: entryKind
    });
    entryRows = await fetchEntriesWindow(workspaceId, {
      ...base,
      categoryId: query.categoryId,
      kind: entryKind,
      maxRows: mergeFetch
    });
  } else if (query.kind === "transfer") {
    transferTotal = await countTransfersInRange(workspaceId, base);
    transferRows = await fetchTransfersWindow(workspaceId, {
      ...base,
      maxRows: mergeFetch
    });
  } else if (query.kind === "income" || query.kind === "expense") {
    entryTotal = await countEntriesInRange(workspaceId, {
      ...base,
      kind: entryKind
    });
    entryRows = await fetchEntriesWindow(workspaceId, {
      ...base,
      kind: entryKind,
      maxRows: mergeFetch
    });
  } else {
    [entryTotal, transferTotal, entryRows, transferRows] = await Promise.all([
      countEntriesInRange(workspaceId, base),
      countTransfersInRange(workspaceId, base),
      fetchEntriesWindow(workspaceId, { ...base, maxRows: mergeFetch }),
      fetchTransfersWindow(workspaceId, { ...base, maxRows: mergeFetch })
    ]);
  }

  const merged: OperationTimelineItem[] = [
    ...entryRows.map(
      (entry): OperationTimelineItem => ({
        kind: "entry",
        occurredAt: entry.occurred_at,
        entry
      })
    ),
    ...transferRows.map(
      (transfer): OperationTimelineItem => ({
        kind: "transfer",
        occurredAt: transfer.occurred_at,
        transfer
      })
    )
  ].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );

  const total = entryTotal + transferTotal;
  const page = merged.slice(query.offset, query.offset + query.limit);
  const items = page.map((row) => serializeTimelineItem(row));

  const summaryRows = await fetchEntrySummaryRows(workspaceId, {
    from: query.from,
    to: query.to,
    accountId: query.accountId,
    categoryId: query.categoryId,
    kind: entryKind
  });
  const { income, expense } = await sumEntrySummaryRowsReporting(
    summaryRows,
    reportingCurrency
  );

  return {
    reportingCurrency,
    items,
    total,
    summary: {
      operationsCount: total,
      incomeReporting: income,
      expenseReporting: expense,
      netReporting: Number((income - expense).toFixed(2))
    }
  };
}

export async function listOperationsTimeline(
  workspaceId: string,
  reportingCurrency: string,
  query: OperationsListQuery
): Promise<OperationsListResult> {
  const q = query.q?.trim() ?? "";

  if (query.historyScope && !q) {
    return listOperationsTimelineHistoryPaginated(workspaceId, reportingCurrency, query);
  }

  const cap = query.historyScope ? HISTORY_SEARCH_DB_CAP : undefined;
  const base = {
    from: query.from,
    to: query.to,
    accountId: query.accountId,
    maxRows: cap
  };

  let entryRows: EntryListItem[] = [];
  let transferRows: TransferListItem[] = [];

  if (query.categoryId) {
    entryRows = await fetchEntriesWindow(workspaceId, {
      ...base,
      categoryId: query.categoryId,
      kind:
        query.kind === "income" || query.kind === "expense"
          ? (query.kind as OperationKind)
          : undefined
    });
    transferRows = [];
  } else if (query.kind === "transfer") {
    entryRows = [];
    transferRows = await fetchTransfersWindow(workspaceId, base);
  } else if (query.kind === "income" || query.kind === "expense") {
    entryRows = await fetchEntriesWindow(workspaceId, {
      ...base,
      kind: query.kind as OperationKind
    });
    transferRows = [];
  } else if (query.kind === "all") {
    [entryRows, transferRows] = await Promise.all([
      fetchEntriesWindow(workspaceId, base),
      fetchTransfersWindow(workspaceId, base)
    ]);
  }

  const merged: OperationTimelineItem[] = [
    ...entryRows.map(
      (entry): OperationTimelineItem => ({
        kind: "entry",
        occurredAt: entry.occurred_at,
        entry
      })
    ),
    ...transferRows.map(
      (transfer): OperationTimelineItem => ({
        kind: "transfer",
        occurredAt: transfer.occurred_at,
        transfer
      })
    )
  ];

  const filtered = merged
    .filter((item) => matchesSearch(item, q))
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );

  const entryOnlyForTotals = filtered
    .filter((item): item is OperationTimelineItem & { kind: "entry" } => item.kind === "entry")
    .map((item) => item.entry);

  const { income, expense } = await sumEntriesReporting(
    entryOnlyForTotals,
    reportingCurrency
  );

  const total = filtered.length;
  const page = filtered.slice(query.offset, query.offset + query.limit);

  const items = page.map((row) => serializeTimelineItem(row));

  return {
    reportingCurrency,
    items,
    total,
    summary: {
      operationsCount: total,
      incomeReporting: income,
      expenseReporting: expense,
      netReporting: Number((income - expense).toFixed(2))
    }
  };
}
