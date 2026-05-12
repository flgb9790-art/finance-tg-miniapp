import type { OperationKind } from "../shared/domain.js";
import { supabase } from "../lib/supabase.js";
import { getAccountById, updateAccountBalance } from "./accounts.js";
import { listCategories } from "./categories.js";

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
  userId: string;
  kind: OperationKind;
  accountId: string;
  categoryId: string;
  amount: number;
  note: string | null;
  occurredAt: string;
}

export async function listRecentEntries(
  userId: string,
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
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as EntryListItem[];
}

export async function getMonthlyEntryTotals(userId: string): Promise<{
  income: number;
  expense: number;
}> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("entries")
    .select("kind, amount")
    .eq("user_id", userId)
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
  const account = await getAccountById(input.accountId, input.userId);

  if (!account) {
    throw new Error("Account was not found");
  }

  const categories = await listCategories(input.userId);
  const category = categories.find((item) => item.id === input.categoryId);

  if (!category) {
    throw new Error("Category was not found");
  }

  if (category.kind !== input.kind) {
    throw new Error("Category kind does not match operation kind");
  }

  const currentBalance = Number(account.balance);

  if (input.kind === "expense" && currentBalance < input.amount) {
    throw new Error("There is not enough money on the selected account");
  }

  const nextBalance =
    input.kind === "income"
      ? currentBalance + input.amount
      : currentBalance - input.amount;

  await updateAccountBalance(account.id, input.userId, nextBalance);

  const { data, error } = await supabase
    .from("entries")
    .insert({
      user_id: input.userId,
      kind: input.kind,
      account_id: input.accountId,
      category_id: input.categoryId,
      amount: input.amount,
      currency_code: account.currency_code,
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
    await updateAccountBalance(account.id, input.userId, currentBalance);
    throw error;
  }

  if (!data) {
    await updateAccountBalance(account.id, input.userId, currentBalance);
    throw new Error("Supabase did not return the created entry");
  }

  return data as EntryListItem;
}
