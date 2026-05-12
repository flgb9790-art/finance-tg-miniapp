import { supabase } from "../lib/supabase.js";
import type { AccountType } from "../shared/domain.js";

export interface AccountRow {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  currency_code: string;
  balance: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountInput {
  userId: string;
  name: string;
  type: AccountType;
  currencyCode: string;
  balance: number;
}

export interface UpdateAccountInput {
  accountId: string;
  userId: string;
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
      user_id: input.userId,
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

export async function listAccounts(userId: string): Promise<AccountRow[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AccountRow[];
}

export async function getAccountById(
  accountId: string,
  userId: string
): Promise<AccountRow | null> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", accountId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as AccountRow | null;
}

export async function updateAccountBalance(
  accountId: string,
  userId: string,
  balance: number
): Promise<AccountRow> {
  const { data, error } = await supabase
    .from("accounts")
    .update({
      balance
    })
    .eq("id", accountId)
    .eq("user_id", userId)
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
    .eq("user_id", input.userId)
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
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", accountId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}
