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

export interface RecordAuditEventInput {
  workspaceId: string;
  actorUserId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  summary: string;
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
  created_at: string;
  actor: AuditActorProfile | null;
}

export interface AuditEventDto {
  id: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  summary: string;
  createdAt: string;
  actor: OperationCreatedByDto | null;
}

const AUDIT_EVENT_SELECT = `
  id,
  action,
  entity_type,
  entity_id,
  summary,
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

export function formatEntryAuditSummary(action: AuditAction, entry: EntryListItem): string {
  return withActionPrefix(action, "операция", describeEntryCore(entry));
}

export function formatTransferAuditSummary(action: AuditAction, transfer: TransferListItem): string {
  return withActionPrefix(action, "перевод", describeTransferCore(transfer));
}

function toAuditEventDto(row: AuditEventRow): AuditEventDto {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    summary: row.summary,
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
    summary
  });

  if (error) {
    throw error;
  }
}

export async function listAuditEvents(workspaceId: string, limit = 50): Promise<AuditEventDto[]> {
  const cappedLimit = Math.min(Math.max(1, limit), 100);

  const { data, error } = await supabase
    .from("audit_events")
    .select(AUDIT_EVENT_SELECT)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(cappedLimit);

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as AuditEventRow[]).map(toAuditEventDto);
}
