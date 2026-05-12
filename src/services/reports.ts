import { env } from "../config/env.js";
import { getCategoryById } from "./categories.js";
import { listAccounts } from "./accounts.js";
import { getExchangeRate, getLatestExchangeRateUpdate } from "./exchange-rates.js";
import { listRecentEntries } from "./entries.js";
import { listRecentTransfers } from "./transfers.js";
import { supabase } from "../lib/supabase.js";
import type { OperationKind } from "../shared/domain.js";

export type ReportPeriod = "week" | "month" | "quarter" | "custom";

export interface ReportCategoryItem {
  categoryName: string;
  total: number;
  currencyCode: string;
}

export interface ReportResult {
  period: ReportPeriod;
  startDate: string;
  endDate: string;
  reportingCurrency: string;
  incomes: number;
  expenses: number;
  net: number;
  currentTotalBalance: number;
  incomeByCategory: ReportCategoryItem[];
  expenseByCategory: ReportCategoryItem[];
  transfersCount: number;
  ratesUpdatedAt: string | null;
  appliedCategory?: {
    id: string;
    name: string;
    kind: OperationKind;
  };
}

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

export function resolveReportRange(
  period: ReportPeriod,
  customStartDate?: string,
  customEndDate?: string
): { startDate: string; endDate: string } {
  const now = new Date();
  const end = endOfDay(now);

  if (period === "custom") {
    if (!customStartDate || !customEndDate) {
      throw new Error("Custom report requires startDate and endDate");
    }

    return {
      startDate: startOfDay(new Date(customStartDate)).toISOString(),
      endDate: endOfDay(new Date(customEndDate)).toISOString()
    };
  }

  const start = new Date(now);

  if (period === "week") {
    start.setDate(now.getDate() - 6);
  } else if (period === "month") {
    start.setDate(now.getDate() - 29);
  } else {
    start.setDate(now.getDate() - 89);
  }

  return {
    startDate: startOfDay(start).toISOString(),
    endDate: end.toISOString()
  };
}

async function listEntriesByRange(userId: string, startDate: string, endDate: string) {
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
    .gte("occurred_at", startDate)
    .lte("occurred_at", endDate)
    .order("occurred_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function listTransfersByRange(
  userId: string,
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabase
    .from("transfers")
    .select("id")
    .eq("user_id", userId)
    .gte("occurred_at", startDate)
    .lte("occurred_at", endDate);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getDashboardSummary(
  userId: string,
  reportingCurrency = env.reportingCurrency
): Promise<{
  accountsCount: number;
  balancesByCurrency: Record<string, number>;
  categoriesCount: number;
  monthlyIncome: number;
  monthlyExpense: number;
  reportingCurrency: string;
  totalBalanceConverted: number;
  ratesUpdatedAt: string | null;
}> {
  const accounts = await listAccounts(userId);
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("is_archived", false);

  if (error) {
    throw error;
  }

  const monthRange = resolveReportRange("month");
  const monthReport = await getReport({
    userId,
    period: "month",
    startDate: monthRange.startDate,
    endDate: monthRange.endDate,
    reportingCurrency
  });

  const balancesByCurrency = accounts.reduce<Record<string, number>>(
    (result, account) => {
      result[account.currency_code] =
        (result[account.currency_code] ?? 0) + Number(account.balance);
      return result;
    },
    {}
  );

  const totalBalanceConverted = await accounts.reduce(
    async (promise, account) => {
      const sum = await promise;
      const rate = await getExchangeRate(
        account.currency_code,
        reportingCurrency
      );

      return sum + Number(account.balance) * rate;
    },
    Promise.resolve(0)
  );

  return {
    accountsCount: accounts.length,
    balancesByCurrency,
    categoriesCount: (categories ?? []).length,
    monthlyIncome: monthReport.incomes,
    monthlyExpense: monthReport.expenses,
    reportingCurrency,
    totalBalanceConverted: Number(totalBalanceConverted.toFixed(2)),
    ratesUpdatedAt: await getLatestExchangeRateUpdate()
  };
}

export async function getReport(input: {
  userId: string;
  period: ReportPeriod;
  startDate?: string;
  endDate?: string;
  reportingCurrency?: string;
  categoryId?: string;
}): Promise<ReportResult> {
  const reportingCurrency = input.reportingCurrency ?? env.reportingCurrency;
  const range =
    input.period === "custom"
      ? {
          startDate: input.startDate ?? "",
          endDate: input.endDate ?? ""
        }
      : resolveReportRange(input.period);

  const { startDate, endDate } =
    input.period === "custom"
      ? resolveReportRange("custom", range.startDate, range.endDate)
      : range;

  const rawEntries = await listEntriesByRange(input.userId, startDate, endDate);
  const transfers = await listTransfersByRange(input.userId, startDate, endDate);
  const accounts = await listAccounts(input.userId);
  const rateCache = new Map<string, number>();

  let entries = rawEntries;
  let appliedCategory: ReportResult["appliedCategory"];

  if (input.categoryId) {
    const categoryRow = await getCategoryById(input.categoryId, input.userId);

    if (!categoryRow) {
      throw new Error("Категория не найдена");
    }

    appliedCategory = {
      id: categoryRow.id,
      name: categoryRow.name,
      kind: categoryRow.kind
    };

    entries = rawEntries.filter(
      (entry) => String(entry.category_id ?? "") === categoryRow.id
    );
  }

  async function convert(
    amount: number,
    fromCurrencyCode: string,
    toCurrencyCode: string
  ): Promise<number> {
    const key = `${fromCurrencyCode}:${toCurrencyCode}`;

    if (!rateCache.has(key)) {
      rateCache.set(
        key,
        await getExchangeRate(fromCurrencyCode, toCurrencyCode)
      );
    }

    return Number((amount * (rateCache.get(key) ?? 1)).toFixed(2));
  }

  let incomes = 0;
  let expenses = 0;
  const expenseByCategoryMap = new Map<string, number>();
  const incomeByCategoryMap = new Map<string, number>();

  for (const entry of entries) {
    const convertedAmount = await convert(
      Number(entry.amount),
      entry.currency_code,
      reportingCurrency
    );

    if (entry.kind === "income") {
      incomes += convertedAmount;
      const categoryName = entry.category?.name ?? "Без категории";
      incomeByCategoryMap.set(
        categoryName,
        (incomeByCategoryMap.get(categoryName) ?? 0) + convertedAmount
      );
    } else {
      expenses += convertedAmount;
      const categoryName = entry.category?.name ?? "Без категории";
      expenseByCategoryMap.set(
        categoryName,
        (expenseByCategoryMap.get(categoryName) ?? 0) + convertedAmount
      );
    }
  }

  const mapToSortedItems = (mapping: Map<string, number>): ReportCategoryItem[] =>
    Array.from(mapping.entries())
      .map(([categoryName, total]) => ({
        categoryName,
        total: Number(total.toFixed(2)),
        currencyCode: reportingCurrency
      }))
      .sort((left, right) => right.total - left.total);

  const currentTotalBalance = await accounts.reduce(async (promise, account) => {
    const sum = await promise;
    const converted = await convert(
      Number(account.balance),
      account.currency_code,
      reportingCurrency
    );

    return sum + converted;
  }, Promise.resolve(0));

  return {
    period: input.period,
    startDate,
    endDate,
    reportingCurrency,
    incomes: Number(incomes.toFixed(2)),
    expenses: Number(expenses.toFixed(2)),
    net: Number((incomes - expenses).toFixed(2)),
    currentTotalBalance: Number(currentTotalBalance.toFixed(2)),
    incomeByCategory: mapToSortedItems(incomeByCategoryMap),
    expenseByCategory: mapToSortedItems(expenseByCategoryMap),
    transfersCount: appliedCategory ? 0 : transfers.length,
    ratesUpdatedAt: await getLatestExchangeRateUpdate(),
    appliedCategory
  };
}

export async function getRecentActivity(userId: string): Promise<{
  recentEntries: Awaited<ReturnType<typeof listRecentEntries>>;
  recentTransfers: Awaited<ReturnType<typeof listRecentTransfers>>;
}> {
  const [recentEntries, recentTransfers] = await Promise.all([
    listRecentEntries(userId),
    listRecentTransfers(userId)
  ]);

  return {
    recentEntries,
    recentTransfers
  };
}
