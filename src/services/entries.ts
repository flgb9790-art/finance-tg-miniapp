import type { OperationKind } from "../shared/domain.js";
import { supabase } from "../lib/supabase.js";
import { getAccountById, updateAccountBalance } from "./accounts.js";
import { listCategories } from "./categories.js";
import { getCurrencyByCode } from "./currencies.js";
import { convertAmount } from "./exchange-rates.js";

export interface EntryRow {
  id: string;
  user_id: string;
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
  account: {
    name: string;
    currency_code: string;
  } | null;
  category: {
    name: string;
    kind: OperationKind;
  } | null;
}

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

function roundAmount(value: number): number {
  return Number(value.toFixed(2));
}

export async function listRecentEntries(
  workspaceId: string,
  limit = 12
): Promise<EntryListItem[]> {
  const { data, error } = await supabase
    .from("entries")
    .select(
      `
        *,
        account:accounts(name, currency_code),
        category:categories(name, kind)
      `
    )
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

  const entryAmount = roundAmount(input.amount);
  let balanceDelta = entryAmount;

  if (transactionCurrency !== accountCurrency) {
    balanceDelta = await convertAmount(entryAmount, transactionCurrency, accountCurrency);
  }

  const currentBalance = Number(account.balance);

  if (input.kind === "expense" && currentBalance < balanceDelta) {
    throw new Error("There is not enough money on the selected account");
  }

  const nextBalance =
    input.kind === "income"
      ? roundAmount(currentBalance + balanceDelta)
      : roundAmount(currentBalance - balanceDelta);

  await updateAccountBalance(account.id, input.workspaceId, nextBalance);

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
    await updateAccountBalance(account.id, input.workspaceId, currentBalance);
    throw error;
  }

  if (!data) {
    await updateAccountBalance(account.id, input.workspaceId, currentBalance);
    throw new Error("Supabase did not return the created entry");
  }

  return data as EntryListItem;
}
