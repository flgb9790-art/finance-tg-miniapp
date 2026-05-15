import { supabase } from "../lib/supabase.js";
import { convertAmount, getExchangeRate } from "./exchange-rates.js";
import { getAccountById, updateAccountBalance } from "./accounts.js";

export interface TransferRow {
  id: string;
  user_id: string;
  created_by_user_id: string | null;
  from_account_id: string;
  to_account_id: string;
  from_amount: string;
  to_amount: string;
  from_currency_code: string;
  to_currency_code: string;
  rate: string | null;
  note: string | null;
  photo_url: string | null;
  occurred_at: string;
  created_at: string;
}

export interface TransferListItem extends TransferRow {
  created_by: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
  } | null;
  from_account: {
    name: string;
    currency_code: string;
  } | null;
  to_account: {
    name: string;
    currency_code: string;
  } | null;
}

export const TRANSFER_LIST_SELECT = `
        *,
        created_by:app_users!created_by_user_id(id, first_name, last_name, username),
        from_account:accounts!transfers_from_account_id_fkey(name, currency_code),
        to_account:accounts!transfers_to_account_id_fkey(name, currency_code)
      `;

export interface CreateTransferInput {
  workspaceId: string;
  createdByUserId: string;
  fromAccountId: string;
  toAccountId: string;
  fromAmount: number;
  toAmount?: number | null;
  note: string | null;
  occurredAt: string;
}

function roundAmount(value: number): number {
  return Number(value.toFixed(2));
}

export async function listRecentTransfers(
  workspaceId: string,
  limit = 10
): Promise<TransferListItem[]> {
  const { data, error } = await supabase
    .from("transfers")
    .select(TRANSFER_LIST_SELECT)
    .eq("workspace_id", workspaceId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as TransferListItem[];
}

export async function createTransfer(
  input: CreateTransferInput
): Promise<TransferListItem> {
  const fromAccount = await getAccountById(input.fromAccountId, input.workspaceId);
  const toAccount = await getAccountById(input.toAccountId, input.workspaceId);

  if (!fromAccount || !toAccount) {
    throw new Error("One of the selected accounts was not found");
  }

  if (fromAccount.id === toAccount.id) {
    throw new Error("Transfer accounts must be different");
  }

  const currentFromBalance = Number(fromAccount.balance);
  const currentToBalance = Number(toAccount.balance);

  if (currentFromBalance < input.fromAmount) {
    throw new Error("There is not enough money on the source account");
  }

  let resolvedRate = 1;
  let resolvedToAmount = input.toAmount ? roundAmount(input.toAmount) : null;

  if (fromAccount.currency_code === toAccount.currency_code) {
    resolvedRate = 1;
    resolvedToAmount = roundAmount(input.fromAmount);
  } else if (resolvedToAmount && resolvedToAmount > 0) {
    resolvedRate = Number((resolvedToAmount / input.fromAmount).toFixed(8));
  } else {
    resolvedRate = await getExchangeRate(
      fromAccount.currency_code,
      toAccount.currency_code
    );
    resolvedToAmount = await convertAmount(
      input.fromAmount,
      fromAccount.currency_code,
      toAccount.currency_code
    );
  }

  if (!resolvedToAmount || resolvedToAmount <= 0) {
    throw new Error("Transfer target amount must be greater than 0");
  }

  await updateAccountBalance(
    fromAccount.id,
    input.workspaceId,
    roundAmount(currentFromBalance - input.fromAmount)
  );

  try {
    await updateAccountBalance(
      toAccount.id,
      input.workspaceId,
      roundAmount(currentToBalance + resolvedToAmount)
    );
  } catch (error) {
    await updateAccountBalance(fromAccount.id, input.workspaceId, currentFromBalance);
    throw error;
  }

  const { data, error } = await supabase
    .from("transfers")
    .insert({
      user_id: input.createdByUserId,
      workspace_id: input.workspaceId,
      created_by_user_id: input.createdByUserId,
      from_account_id: fromAccount.id,
      to_account_id: toAccount.id,
      from_amount: input.fromAmount,
      to_amount: resolvedToAmount,
      from_currency_code: fromAccount.currency_code,
      to_currency_code: toAccount.currency_code,
      rate: resolvedRate,
      note: input.note,
      occurred_at: input.occurredAt
    })
    .select(
      `
        *,
        from_account:accounts!transfers_from_account_id_fkey(name, currency_code),
        to_account:accounts!transfers_to_account_id_fkey(name, currency_code)
      `
    )
    .single();

  if (error) {
    await updateAccountBalance(fromAccount.id, input.workspaceId, currentFromBalance);
    await updateAccountBalance(toAccount.id, input.workspaceId, currentToBalance);
    throw error;
  }

  if (!data) {
    await updateAccountBalance(fromAccount.id, input.workspaceId, currentFromBalance);
    await updateAccountBalance(toAccount.id, input.workspaceId, currentToBalance);
    throw new Error("Supabase did not return the created transfer");
  }

  return data as TransferListItem;
}
