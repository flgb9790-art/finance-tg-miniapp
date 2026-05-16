import type { OperationKind } from "../shared/domain.js";
import { supabase } from "../lib/supabase.js";
import { getAccountById, updateAccountBalance, type AccountRow } from "./accounts.js";
import { listCategories } from "./categories.js";
import { getCurrencyByCode } from "./currencies.js";
import { convertAmount } from "./exchange-rates.js";
import { deleteStoredPhoto } from "./operation-photos.js";

export interface EntryRow {
  id: string;
  user_id: string;
  created_by_user_id: string | null;
  kind: OperationKind;
  account_id: string;
  category_id: string | null;
  amount: string;
  currency_code: string;
  note: string | null;
  photo_url: string | null;
  occurred_at: string;
  created_at: string;
}

export interface EntryListItem extends EntryRow {
  created_by: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
  } | null;
  account: {
    name: string;
    currency_code: string;
  } | null;
  category: {
    name: string;
    kind: OperationKind;
  } | null;
}

export const ENTRY_LIST_SELECT = `
        *,
        created_by:app_users!created_by_user_id(id, first_name, last_name, username),
        account:accounts(name, currency_code),
        category:categories(name, kind)
      `;

export interface CreateEntryInput {
  workspaceId: string;
  createdByUserId: string;
  kind: OperationKind;
  accountId: string;
  categoryId: string;
  amount: number;
  currencyCode?: string | null;
  note: string | null;
  occurredAt: string;
}

export interface UpdateEntryInput extends Omit<CreateEntryInput, "createdByUserId"> {
  entryId: string;
}

function roundAmount(value: number): number {
  return Number(value.toFixed(2));
}

export async function getEntryById(
  entryId: string,
  workspaceId: string
): Promise<EntryListItem | null> {
  const { data, error } = await supabase
    .from("entries")
    .select(ENTRY_LIST_SELECT)
    .eq("id", entryId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as EntryListItem | null;
}

async function resolveEntryBalanceDelta(
  amount: number,
  transactionCurrency: string,
  accountCurrency: string
): Promise<number> {
  const entryAmount = roundAmount(amount);
  let balanceDelta = entryAmount;

  if (transactionCurrency !== accountCurrency) {
    balanceDelta = await convertAmount(entryAmount, transactionCurrency, accountCurrency);
  }

  return balanceDelta;
}

async function applyEntryBalanceChange(
  account: AccountRow,
  workspaceId: string,
  kind: OperationKind,
  balanceDelta: number,
  mode: "apply" | "reverse"
): Promise<void> {
  const currentBalance = Number(account.balance);

  if (kind === "income") {
    const next =
      mode === "apply"
        ? roundAmount(currentBalance + balanceDelta)
        : roundAmount(currentBalance - balanceDelta);

    await updateAccountBalance(account.id, workspaceId, next);
    return;
  }

  if (mode === "apply" && currentBalance < balanceDelta) {
    throw new Error("There is not enough money on the selected account");
  }

  const next =
    mode === "apply"
      ? roundAmount(currentBalance - balanceDelta)
      : roundAmount(currentBalance + balanceDelta);

  await updateAccountBalance(account.id, workspaceId, next);
}

async function reverseEntryBalances(entry: EntryRow, workspaceId: string): Promise<void> {
  const account = await getAccountById(entry.account_id, workspaceId);

  if (!account) {
    throw new Error("Account was not found");
  }

  const accountCurrency = account.currency_code.trim().toUpperCase();
  const transactionCurrency = entry.currency_code.trim().toUpperCase();
  const balanceDelta = await resolveEntryBalanceDelta(
    Number(entry.amount),
    transactionCurrency,
    accountCurrency
  );

  await applyEntryBalanceChange(account, workspaceId, entry.kind, balanceDelta, "reverse");
}

type EntryBalanceInput = Pick<
  CreateEntryInput,
  "workspaceId" | "kind" | "accountId" | "categoryId" | "amount" | "currencyCode"
>;

async function applyEntryBalances(input: EntryBalanceInput): Promise<AccountRow> {
  const account = await getAccountById(input.accountId, input.workspaceId);

  if (!account) {
    throw new Error("Account was not found");
  }

  const categories = await listCategories(input.workspaceId);
  const category = categories.find((item) => item.id === input.categoryId);

  if (!category) {
    throw new Error("Category was not found");
  }

  if (category.kind !== input.kind) {
    throw new Error("Category kind does not match operation kind");
  }

  const accountCurrency = account.currency_code.trim().toUpperCase();
  let transactionCurrency = (input.currencyCode ?? "").trim().toUpperCase();

  if (!transactionCurrency) {
    transactionCurrency = accountCurrency;
  }

  if (transactionCurrency !== accountCurrency) {
    const currencyRow = await getCurrencyByCode(transactionCurrency);

    if (!currencyRow) {
      throw new Error("Operation currency is invalid or inactive");
    }
  }

  const balanceDelta = await resolveEntryBalanceDelta(
    input.amount,
    transactionCurrency,
    accountCurrency
  );

  await applyEntryBalanceChange(account, input.workspaceId, input.kind, balanceDelta, "apply");

  return account;
}

export async function listRecentEntries(
  workspaceId: string,
  limit = 12
): Promise<EntryListItem[]> {
  const { data, error } = await supabase
    .from("entries")
    .select(ENTRY_LIST_SELECT)
    .eq("workspace_id", workspaceId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as EntryListItem[];
}

export async function getMonthlyEntryTotals(workspaceId: string): Promise<{
  income: number;
  expense: number;
}> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("entries")
    .select("kind, amount")
    .eq("workspace_id", workspaceId)
    .gte("occurred_at", monthStart.toISOString());

  if (error) {
    throw error;
  }

  return (data ?? []).reduce(
    (result, entry) => {
      const amount = Number(entry.amount);

      if (entry.kind === "income") {
        result.income += amount;
      } else {
        result.expense += amount;
      }

      return result;
    },
    {
      income: 0,
      expense: 0
    }
  );
}

export async function createEntry(
  input: CreateEntryInput
): Promise<EntryListItem> {
  const account = await applyEntryBalances(input);

  const accountCurrency = account.currency_code.trim().toUpperCase();
  let transactionCurrency = (input.currencyCode ?? "").trim().toUpperCase();

  if (!transactionCurrency) {
    transactionCurrency = accountCurrency;
  }

  const entryAmount = roundAmount(input.amount);

  const { data, error } = await supabase
    .from("entries")
    .insert({
      user_id: input.createdByUserId,
      workspace_id: input.workspaceId,
      created_by_user_id: input.createdByUserId,
      kind: input.kind,
      account_id: input.accountId,
      category_id: input.categoryId,
      amount: entryAmount,
      currency_code: transactionCurrency,
      note: input.note,
      occurred_at: input.occurredAt
    })
    .select(
      `
        *,
        account:accounts(name, currency_code),
        category:categories(name, kind)
      `
    )
    .single();

  if (error) {
    await reverseEntryBalances(
      {
        id: "",
        user_id: input.createdByUserId,
        created_by_user_id: input.createdByUserId,
        kind: input.kind,
        account_id: input.accountId,
        category_id: input.categoryId,
        amount: String(entryAmount),
        currency_code: transactionCurrency,
        note: input.note,
        photo_url: null,
        occurred_at: input.occurredAt,
        created_at: new Date().toISOString()
      },
      input.workspaceId
    );
    throw error;
  }

  if (!data) {
    await reverseEntryBalances(
      {
        id: "",
        user_id: input.createdByUserId,
        created_by_user_id: input.createdByUserId,
        kind: input.kind,
        account_id: input.accountId,
        category_id: input.categoryId,
        amount: String(entryAmount),
        currency_code: transactionCurrency,
        note: input.note,
        photo_url: null,
        occurred_at: input.occurredAt,
        created_at: new Date().toISOString()
      },
      input.workspaceId
    );
    throw new Error("Supabase did not return the created entry");
  }

  return data as EntryListItem;
}

export async function deleteEntry(entryId: string, workspaceId: string): Promise<EntryListItem> {
  const existing = await getEntryById(entryId, workspaceId);

  if (!existing) {
    throw new Error("Entry was not found");
  }

  await reverseEntryBalances(existing, workspaceId);

  if (existing.photo_url) {
    await deleteStoredPhoto(existing.photo_url);
  }

  const { error } = await supabase
    .from("entries")
    .delete()
    .eq("id", entryId)
    .eq("workspace_id", workspaceId);

  if (error) {
    const account = await getAccountById(existing.account_id, workspaceId);

    if (account) {
      const accountCurrency = account.currency_code.trim().toUpperCase();
      const transactionCurrency = existing.currency_code.trim().toUpperCase();
      const balanceDelta = await resolveEntryBalanceDelta(
        Number(existing.amount),
        transactionCurrency,
        accountCurrency
      );
      await applyEntryBalanceChange(account, workspaceId, existing.kind, balanceDelta, "apply");
    }

    throw error;
  }

  return existing;
}

export async function updateEntry(input: UpdateEntryInput): Promise<EntryListItem> {
  const existing = await getEntryById(input.entryId, input.workspaceId);

  if (!existing) {
    throw new Error("Entry was not found");
  }

  await reverseEntryBalances(existing, input.workspaceId);

  try {
    const account = await applyEntryBalances(input);

    const accountCurrency = account.currency_code.trim().toUpperCase();
    let transactionCurrency = (input.currencyCode ?? "").trim().toUpperCase();

    if (!transactionCurrency) {
      transactionCurrency = accountCurrency;
    }

    const entryAmount = roundAmount(input.amount);

    const { data, error } = await supabase
      .from("entries")
      .update({
        kind: input.kind,
        account_id: input.accountId,
        category_id: input.categoryId,
        amount: entryAmount,
        currency_code: transactionCurrency,
        note: input.note,
        occurred_at: input.occurredAt
      })
      .eq("id", input.entryId)
      .eq("workspace_id", input.workspaceId)
      .select(ENTRY_LIST_SELECT)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error("Supabase did not return the updated entry");
    }

    return data as EntryListItem;
  } catch (error) {
    const account = await getAccountById(existing.account_id, input.workspaceId);

    if (account) {
      const accountCurrency = account.currency_code.trim().toUpperCase();
      const transactionCurrency = existing.currency_code.trim().toUpperCase();
      const balanceDelta = await resolveEntryBalanceDelta(
        Number(existing.amount),
        transactionCurrency,
        accountCurrency
      );
      await applyEntryBalanceChange(account, input.workspaceId, existing.kind, balanceDelta, "apply");
    }

    throw error;
  }
}
