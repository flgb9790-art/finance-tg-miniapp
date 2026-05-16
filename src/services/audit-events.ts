import { supabase } from "../lib/supabase.js";
import type { EntryListItem } from "./entries.js";
import {
  toOperationCreatedByDto,
  type OperationCreatedByDto
} from "./operation-created-by.js";
import type { TransferListItem } from "./transfers.js";

export type AuditAction =
  | "created"
  | "updated"
  | "deleted"
  | "photo_added"
  | "photo_removed";

export type AuditEntityType = "entry" | "transfer";

export interface AuditEventDetails {
  operationLabel?: string | null;
  operationKindLabel?: string | null;
  kind?: "income" | "expense" | "transfer" | null;
  amount?: string | null;
  currencyCode?: string | null;
  accountName?: string | null;
  categoryName?: string | null;
  fromAmount?: string | null;
  fromCurrencyCode?: string | null;
  toAmount?: string | null;
  toCurrencyCode?: string | null;
}

export interface RecordAuditEventInput {
  workspaceId: string;
  actorUserId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  summary: string;
  details?: AuditEventDetails | null;
}

interface AuditActorProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
}

interface AuditEventRow {
  id: string;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: string;
  summary: string;
  details: AuditEventDetails | null;
  created_at: string;
  actor: AuditActorProfile | null;
}

export interface AuditEventDto {
  id: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  summary: string;
  details: AuditEventDetails;
  createdAt: string;
  actor: OperationCreatedByDto | null;
}

export type AuditActionKindFilter = "created" | "modified";

export interface ListAuditEventsOptions {
  limit?: number;
  entityType?: AuditEntityType;
  entityId?: string;
  ascending?: boolean;
  from?: string;
  to?: string;
  actorUserId?: string;
  actionKind?: AuditActionKindFilter;
}

const MODIFIED_AUDIT_ACTIONS: AuditAction[] = [
  "updated",
  "deleted",
  "photo_added",
  "photo_removed"
];

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

function parseIsoOrDateOnly(raw: string): Date {
  const trimmed = raw.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T12:00:00`);
  }

  return new Date(trimmed);
}

function firstQueryString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    const trimmed = value[0].trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return undefined;
}

export function parseAuditEventsListQuery(
  query: Record<string, unknown>
): Pick<ListAuditEventsOptions, "from" | "to" | "actorUserId" | "actionKind"> {
  const fromRaw = firstQueryString(query.from);
  const toRaw = firstQueryString(query.to);
  const actorUserId = firstQueryString(query.actorUserId);
  const actionKindRaw = firstQueryString(query.actionKind);

  const actionKind =
    actionKindRaw === "created" || actionKindRaw === "modified" ? actionKindRaw : undefined;

  let from: string | undefined;
  let to: string | undefined;

  if (fromRaw) {
    from = startOfDay(parseIsoOrDateOnly(fromRaw)).toISOString();
  }

  if (toRaw) {
    to = endOfDay(parseIsoOrDateOnly(toRaw)).toISOString();
  }

  if (from && to && new Date(from).getTime() > new Date(to).getTime()) {
    throw new Error("Дата «С» не может быть позже даты «По»");
  }

  return {
    from,
    to,
    actorUserId,
    actionKind
  };
}

const AUDIT_EVENT_SELECT = `
  id,
  action,
  entity_type,
  entity_id,
  summary,
  details,
  created_at,
  actor:app_users!actor_user_id(id, first_name, last_name, username)
`;

function formatAuditMoney(amount: string | number, currencyCode: string): string {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return String(amount);
  }

  const formatted = value.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  const currency = String(currencyCode ?? "").trim().toUpperCase();

  return currency ? `${formatted} ${currency}` : formatted;
}

function describeEntryCore(entry: Pick<EntryListItem, "kind" | "amount" | "currency_code" | "category" | "account">): string {
  const kindLabel = entry.kind === "income" ? "Доход" : "Расход";
  const amount = formatAuditMoney(entry.amount, entry.currency_code);
  const category = entry.category?.name ?? "Без категории";
  const account = entry.account?.name ?? "Счёт";

  return `${kindLabel} ${amount} · ${category} · ${account}`;
}

function describeTransferCore(
  transfer: Pick<
    TransferListItem,
    "from_amount" | "from_currency_code" | "to_amount" | "to_currency_code" | "from_account" | "to_account"
  >
): string {
  const fromAccount = transfer.from_account?.name ?? "Счёт";
  const toAccount = transfer.to_account?.name ?? "Счёт";
  const fromAmount = formatAuditMoney(transfer.from_amount, transfer.from_currency_code);
  const toAmount = formatAuditMoney(transfer.to_amount, transfer.to_currency_code);

  return `Перевод ${fromAmount} → ${toAmount} · ${fromAccount} → ${toAccount}`;
}

function withActionPrefix(action: AuditAction, entityLabel: string, core: string): string {
  switch (action) {
    case "created":
      return `Создан ${entityLabel}: ${core}`;
    case "updated":
      return `Изменён ${entityLabel}: ${core}`;
    case "deleted":
      return `Удалён ${entityLabel}: ${core}`;
    case "photo_added":
      return `Фото прикреплено к ${entityLabel}: ${core}`;
    case "photo_removed":
      return `Фото удалено у ${entityLabel}: ${core}`;
    default:
      return core;
  }
}

export function buildEntryAuditDetails(entry: EntryListItem): AuditEventDetails {
  return {
    kind: entry.kind,
    operationLabel: entry.category?.name ?? "Без категории",
    operationKindLabel: entry.kind === "income" ? "Доход" : "Расход",
    amount: String(entry.amount),
    currencyCode: entry.currency_code,
    accountName: entry.account?.name ?? null,
    categoryName: entry.category?.name ?? null
  };
}

export function buildTransferAuditDetails(transfer: TransferListItem): AuditEventDetails {
  const fromAccount = transfer.from_account?.name ?? "Счёт";
  const toAccount = transfer.to_account?.name ?? "Счёт";

  return {
    kind: "transfer",
    operationLabel: `Перевод: ${fromAccount} → ${toAccount}`,
    operationKindLabel: "Перевод",
    amount: String(transfer.from_amount),
    currencyCode: transfer.from_currency_code,
    fromAmount: String(transfer.from_amount),
    fromCurrencyCode: transfer.from_currency_code,
    toAmount: String(transfer.to_amount),
    toCurrencyCode: transfer.to_currency_code,
    accountName: `${fromAccount} → ${toAccount}`
  };
}

export function formatEntryAuditSummary(action: AuditAction, entry: EntryListItem): string {
  return withActionPrefix(action, "операция", describeEntryCore(entry));
}

export function formatTransferAuditSummary(action: AuditAction, transfer: TransferListItem): string {
  return withActionPrefix(action, "перевод", describeTransferCore(transfer));
}

function normalizeAuditDetails(value: unknown): AuditEventDetails {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as AuditEventDetails;
}

function toAuditEventDto(row: AuditEventRow): AuditEventDto {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    summary: row.summary,
    details: normalizeAuditDetails(row.details),
    createdAt: row.created_at,
    actor: toOperationCreatedByDto({
      created_by: row.actor
    })
  };
}

export async function recordAuditEvent(input: RecordAuditEventInput): Promise<void> {
  const summary = input.summary.trim();

  if (!summary) {
    return;
  }

  const { error } = await supabase.from("audit_events").insert({
    workspace_id: input.workspaceId,
    actor_user_id: input.actorUserId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    summary,
    details: input.details ?? {}
  });

  if (error) {
    throw error;
  }
}

export async function listAuditEvents(
  workspaceId: string,
  options: ListAuditEventsOptions = {}
): Promise<AuditEventDto[]> {
  const cappedLimit = Math.min(Math.max(1, options.limit ?? 50), 100);
  const entityId = String(options.entityId ?? "").trim();
  const entityType = options.entityType;

  let query = supabase
    .from("audit_events")
    .select(AUDIT_EVENT_SELECT)
    .eq("workspace_id", workspaceId);

  if (entityType && entityId) {
    query = query.eq("entity_type", entityType).eq("entity_id", entityId);
  }

  const actorUserId = String(options.actorUserId ?? "").trim();

  if (actorUserId) {
    query = query.eq("actor_user_id", actorUserId);
  }

  if (options.from) {
    query = query.gte("created_at", options.from);
  }

  if (options.to) {
    query = query.lte("created_at", options.to);
  }

  if (options.actionKind === "created") {
    query = query.eq("action", "created");
  } else if (options.actionKind === "modified") {
    query = query.in("action", MODIFIED_AUDIT_ACTIONS);
  }

  const { data, error } = await query
    .order("created_at", { ascending: Boolean(options.ascending) })
    .limit(cappedLimit);

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as AuditEventRow[]).map(toAuditEventDto);
}
