import type { OperationKind } from "../shared/domain.js";
import { supabase } from "../lib/supabase.js";
import { getExchangeRate } from "./exchange-rates.js";
import type { EntryListItem } from "./entries.js";
import type { TransferListItem } from "./transfers.js";

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
  /** Полная лента (вкладка «История»): широкий период, без фильтров, с лимитом строк на стороне БД */
  historyScope: boolean;
}

export type OperationTimelineItem =
  | { kind: "entry"; occurredAt: string; entry: EntryListItem }
  | { kind: "transfer"; occurredAt: string; transfer: TransferListItem };

export interface OperationsListResult {
  reportingCurrency: string;
  items: OperationTimelineItem[];
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

const HISTORY_DB_CAP = 4000;

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
    const start = startOfDay(new Date("2000-01-01"));
    fromIso = start.toISOString();
    toIso = endOfDay(new Date()).toISOString();
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
  }

  const kindRaw = (firstQueryString(query.kind) ?? "all").toLowerCase();
  let kind: OperationsKindFilter = ["all", "income", "expense", "transfer"].includes(kindRaw)
    ? (kindRaw as OperationsKindFilter)
    : "all";

  if (historyScope) {
    kind = "all";
  }

  let accountId = firstQueryString(query.accountId);
  let categoryId = firstQueryString(query.categoryId);
  let q = firstQueryString(query.q);

  if (historyScope) {
    accountId = undefined;
    categoryId = undefined;
    q = undefined;
  }

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
  userId: string,
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
    .select(
      `
        *,
        account:accounts(name, currency_code),
        category:categories(name, kind)
      `
    )
    .eq("user_id", userId)
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
  userId: string,
  opts: {
    from: string;
    to: string;
    accountId?: string;
    maxRows?: number;
  }
): Promise<TransferListItem[]> {
  let q = supabase
    .from("transfers")
    .select(
      `
        *,
        from_account:accounts!transfers_from_account_id_fkey(name, currency_code),
        to_account:accounts!transfers_to_account_id_fkey(name, currency_code)
      `
    )
    .eq("user_id", userId)
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

export async function listOperationsTimeline(
  userId: string,
  reportingCurrency: string,
  query: OperationsListQuery
): Promise<OperationsListResult> {
  const cap = query.historyScope ? HISTORY_DB_CAP : undefined;
  const base = {
    from: query.from,
    to: query.to,
    accountId: query.historyScope ? undefined : query.accountId,
    maxRows: cap
  };

  let entryRows: EntryListItem[] = [];
  let transferRows: TransferListItem[] = [];

  if (query.historyScope) {
    const [e, tr] = await Promise.all([
      fetchEntriesWindow(userId, { ...base }),
      fetchTransfersWindow(userId, { ...base })
    ]);
    entryRows = e;
    transferRows = tr;
  } else if (query.categoryId) {
    entryRows = await fetchEntriesWindow(userId, {
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
    transferRows = await fetchTransfersWindow(userId, base);
  } else if (query.kind === "income" || query.kind === "expense") {
    entryRows = await fetchEntriesWindow(userId, {
      ...base,
      kind: query.kind as OperationKind
    });
    transferRows = [];
  } else {
    const [e, tr] = await Promise.all([
      fetchEntriesWindow(userId, base),
      fetchTransfersWindow(userId, base)
    ]);
    entryRows = e;
    transferRows = tr;
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

  const q = query.historyScope ? "" : query.q?.trim() ?? "";
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

  return {
    reportingCurrency,
    items: page,
    total,
    summary: {
      operationsCount: total,
      incomeReporting: income,
      expenseReporting: expense,
      netReporting: Number((income - expense).toFixed(2))
    }
  };
}
