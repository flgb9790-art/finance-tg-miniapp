import { supabase } from "../lib/supabase.js";
import { convertAmount, getExchangeRate } from "./exchange-rates.js";
import { getAccountById, updateAccountBalance } from "./accounts.js";
import { deleteStoredPhoto } from "./operation-photos.js";

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

export interface UpdateTransferInput extends Omit<CreateTransferInput, "createdByUserId"> {
  transferId: string;
}

function roundAmount(value: number): number {
  return Number(value.toFixed(2));
}

export async function getTransferById(
  transferId: string,
  workspaceId: string
): Promise<TransferListItem | null> {
  const { data, error } = await supabase
    .from("transfers")
    .select(TRANSFER_LIST_SELECT)
    .eq("id", transferId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as TransferListItem | null;
}

async function reverseTransferBalances(
  transfer: TransferRow,
  workspaceId: string
): Promise<{ fromAccountId: string; toAccountId: string }> {
  const fromAccount = await getAccountById(transfer.from_account_id, workspaceId);
  const toAccount = await getAccountById(transfer.to_account_id, workspaceId);

  if (!fromAccount || !toAccount) {
    throw new Error("One of the selected accounts was not found");
  }

  const currentFromBalance = Number(fromAccount.balance);
  const currentToBalance = Number(toAccount.balance);
  const fromAmount = Number(transfer.from_amount);
  const toAmount = Number(transfer.to_amount);

  if (currentToBalance < toAmount) {
    throw new Error("There is not enough money on the destination account to undo this transfer");
  }

  await updateAccountBalance(
    fromAccount.id,
    workspaceId,
    roundAmount(currentFromBalance + fromAmount)
  );

  await updateAccountBalance(
    toAccount.id,
    workspaceId,
    roundAmount(currentToBalance - toAmount)
  );

  return { fromAccountId: fromAccount.id, toAccountId: toAccount.id };
}

async function reapplyTransferBalances(
  transfer: TransferRow,
  workspaceId: string
): Promise<void> {
  const fromAccount = await getAccountById(transfer.from_account_id, workspaceId);
  const toAccount = await getAccountById(transfer.to_account_id, workspaceId);

  if (!fromAccount || !toAccount) {
    return;
  }

  const currentFromBalance = Number(fromAccount.balance);
  const currentToBalance = Number(toAccount.balance);
  const fromAmount = Number(transfer.from_amount);
  const toAmount = Number(transfer.to_amount);

  await updateAccountBalance(
    fromAccount.id,
    workspaceId,
    roundAmount(currentFromBalance - fromAmount)
  );

  await updateAccountBalance(
    toAccount.id,
    workspaceId,
    roundAmount(currentToBalance + toAmount)
  );
}

interface ResolvedTransferAmounts {
  fromAmount: number;
  toAmount: number;
  rate: number;
}

async function resolveTransferAmounts(
  input: Pick<CreateTransferInput, "fromAmount" | "toAmount" | "fromAccountId" | "toAccountId" | "workspaceId">
): Promise<ResolvedTransferAmounts & { fromAccount: NonNullable<Awaited<ReturnType<typeof getAccountById>>>; toAccount: NonNullable<Awaited<ReturnType<typeof getAccountById>>> }> {
  const fromAccount = await getAccountById(input.fromAccountId, input.workspaceId);
  const toAccount = await getAccountById(input.toAccountId, input.workspaceId);

  if (!fromAccount || !toAccount) {
    throw new Error("One of the selected accounts was not found");
  }

  if (fromAccount.id === toAccount.id) {
    throw new Error("Transfer accounts must be different");
  }

  const fromAmount = roundAmount(input.fromAmount);

  if (fromAmount <= 0) {
    throw new Error("Transfer amount must be greater than 0");
  }

  let resolvedRate = 1;
  let resolvedToAmount = input.toAmount ? roundAmount(input.toAmount) : null;

  if (fromAccount.currency_code === toAccount.currency_code) {
    resolvedRate = 1;
    resolvedToAmount = fromAmount;
  } else if (resolvedToAmount && resolvedToAmount > 0) {
    resolvedRate = Number((resolvedToAmount / fromAmount).toFixed(8));
  } else {
    resolvedRate = await getExchangeRate(fromAccount.currency_code, toAccount.currency_code);
    resolvedToAmount = await convertAmount(
      fromAmount,
      fromAccount.currency_code,
      toAccount.currency_code
    );
  }

  if (!resolvedToAmount || resolvedToAmount <= 0) {
    throw new Error("Transfer target amount must be greater than 0");
  }

  return {
    fromAccount,
    toAccount,
    fromAmount,
    toAmount: resolvedToAmount,
    rate: resolvedRate
  };
}

async function applyTransferBalances(
  workspaceId: string,
  resolved: Awaited<ReturnType<typeof resolveTransferAmounts>>
): Promise<void> {
  const currentFromBalance = Number(resolved.fromAccount.balance);
  const currentToBalance = Number(resolved.toAccount.balance);

  if (currentFromBalance < resolved.fromAmount) {
    throw new Error("There is not enough money on the source account");
  }

  await updateAccountBalance(
    resolved.fromAccount.id,
    workspaceId,
    roundAmount(currentFromBalance - resolved.fromAmount)
  );

  try {
    await updateAccountBalance(
      resolved.toAccount.id,
      workspaceId,
      roundAmount(currentToBalance + resolved.toAmount)
    );
  } catch (error) {
    await updateAccountBalance(
      resolved.fromAccount.id,
      workspaceId,
      roundAmount(currentFromBalance)
    );
    throw error;
  }
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
  const resolved = await resolveTransferAmounts(input);

  await applyTransferBalances(input.workspaceId, resolved);

  const { data, error } = await supabase
    .from("transfers")
    .insert({
      user_id: input.createdByUserId,
      workspace_id: input.workspaceId,
      created_by_user_id: input.createdByUserId,
      from_account_id: resolved.fromAccount.id,
      to_account_id: resolved.toAccount.id,
      from_amount: resolved.fromAmount,
      to_amount: resolved.toAmount,
      from_currency_code: resolved.fromAccount.currency_code,
      to_currency_code: resolved.toAccount.currency_code,
      rate: resolved.rate,
      note: input.note,
      occurred_at: input.occurredAt
    })
    .select(TRANSFER_LIST_SELECT)
    .single();

  if (error || !data) {
    await reverseTransferBalances(
      {
        id: "",
        user_id: input.createdByUserId,
        created_by_user_id: input.createdByUserId,
        from_account_id: resolved.fromAccount.id,
        to_account_id: resolved.toAccount.id,
        from_amount: String(resolved.fromAmount),
        to_amount: String(resolved.toAmount),
        from_currency_code: resolved.fromAccount.currency_code,
        to_currency_code: resolved.toAccount.currency_code,
        rate: String(resolved.rate),
        note: input.note,
        photo_url: null,
        occurred_at: input.occurredAt,
        created_at: new Date().toISOString()
      },
      input.workspaceId
    );

    if (error) {
      throw error;
    }

    throw new Error("Supabase did not return the created transfer");
  }

  return data as TransferListItem;
}

export async function deleteTransfer(
  transferId: string,
  workspaceId: string
): Promise<TransferListItem> {
  const existing = await getTransferById(transferId, workspaceId);

  if (!existing) {
    throw new Error("Transfer was not found");
  }

  await reverseTransferBalances(existing, workspaceId);

  if (existing.photo_url) {
    await deleteStoredPhoto(existing.photo_url);
  }

  const { error } = await supabase
    .from("transfers")
    .delete()
    .eq("id", transferId)
    .eq("workspace_id", workspaceId);

  if (error) {
    await reapplyTransferBalances(existing, workspaceId);
    throw error;
  }

  return existing;
}

export async function updateTransfer(input: UpdateTransferInput): Promise<TransferListItem> {
  const existing = await getTransferById(input.transferId, input.workspaceId);

  if (!existing) {
    throw new Error("Transfer was not found");
  }

  await reverseTransferBalances(existing, input.workspaceId);

  try {
    const resolved = await resolveTransferAmounts(input);

    await applyTransferBalances(input.workspaceId, resolved);

    const { data, error } = await supabase
      .from("transfers")
      .update({
        from_account_id: resolved.fromAccount.id,
        to_account_id: resolved.toAccount.id,
        from_amount: resolved.fromAmount,
        to_amount: resolved.toAmount,
        from_currency_code: resolved.fromAccount.currency_code,
        to_currency_code: resolved.toAccount.currency_code,
        rate: resolved.rate,
        note: input.note,
        occurred_at: input.occurredAt
      })
      .eq("id", input.transferId)
      .eq("workspace_id", input.workspaceId)
      .select(TRANSFER_LIST_SELECT)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error("Supabase did not return the updated transfer");
    }

    return data as TransferListItem;
  } catch (error) {
    await reapplyTransferBalances(existing, input.workspaceId);
    throw error;
  }
}
