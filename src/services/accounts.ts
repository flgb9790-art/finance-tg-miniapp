import { supabase } from "../lib/supabase.js";
import type { AccountType } from "../shared/domain.js";

export interface AccountRow {
  id: string;
  user_id: string;
  workspace_id?: string;
  name: string;
  type: AccountType;
  currency_code: string;
  balance: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountInput {
  workspaceId: string;
  createdByUserId: string;
  name: string;
  type: AccountType;
  currencyCode: string;
  balance: number;
}

export interface UpdateAccountInput {
  accountId: string;
  workspaceId: string;
  name: string;
  type: AccountType;
  currencyCode: string;
  balance: number;
}

export async function createAccount(
  input: CreateAccountInput
): Promise<AccountRow> {
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: input.createdByUserId,
      workspace_id: input.workspaceId,
      created_by_user_id: input.createdByUserId,
      name: input.name,
      type: input.type,
      currency_code: input.currencyCode,
      balance: input.balance
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Supabase did not return the created account");
  }

  return data as AccountRow;
}

export async function listAccounts(workspaceId: string): Promise<AccountRow[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AccountRow[];
}

export async function getAccountById(
  accountId: string,
  workspaceId: string
): Promise<AccountRow | null> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", accountId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as AccountRow | null;
}

export async function updateAccountBalance(
  accountId: string,
  workspaceId: string,
  balance: number
): Promise<AccountRow> {
  const { data, error } = await supabase
    .from("accounts")
    .update({
      balance
    })
    .eq("id", accountId)
    .eq("workspace_id", workspaceId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Supabase did not return the updated account");
  }

  return data as AccountRow;
}

export async function updateAccount(
  input: UpdateAccountInput
): Promise<AccountRow> {
  const { data, error } = await supabase
    .from("accounts")
    .update({
      name: input.name,
      type: input.type,
      currency_code: input.currencyCode,
      balance: input.balance
    })
    .eq("id", input.accountId)
    .eq("workspace_id", input.workspaceId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Supabase did not return the updated account");
  }

  return data as AccountRow;
}

export async function deleteAccount(
  accountId: string,
  workspaceId: string
): Promise<void> {
  const existing = await getAccountById(accountId, workspaceId);

  if (!existing) {
    throw new Error("Счёт не найден или уже удалён.");
  }

  const { error: entriesError } = await supabase
    .from("entries")
    .delete()
    .eq("account_id", accountId)
    .eq("workspace_id", workspaceId);

  if (entriesError) {
    throw entriesError;
  }

  const { error: transfersFromError } = await supabase
    .from("transfers")
    .delete()
    .eq("from_account_id", accountId)
    .eq("workspace_id", workspaceId);

  if (transfersFromError) {
    throw transfersFromError;
  }

  const { error: transfersToError } = await supabase
    .from("transfers")
    .delete()
    .eq("to_account_id", accountId)
    .eq("workspace_id", workspaceId);

  if (transfersToError) {
    throw transfersToError;
  }

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", accountId)
    .eq("workspace_id", workspaceId);

  if (error) {
    throw error;
  }
}
