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

type ReportEntriesBundle = {
  startDate: string;
  endDate: string;
  reportingCurrency: string;
  entries: Awaited<ReturnType<typeof listEntriesByRange>>;
  appliedCategory?: ReportResult["appliedCategory"];
};

async function resolveReportEntriesBundle(input: {
  userId: string;
  period: ReportPeriod;
  startDate?: string;
  endDate?: string;
  reportingCurrency?: string;
  categoryId?: string;
}): Promise<ReportEntriesBundle> {
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

  return { startDate, endDate, reportingCurrency, entries, appliedCategory };
}

export interface ReportOperationCsvRow {
  occurredAtIso: string;
  kindLabel: string;
  categoryName: string;
  accountName: string;
  amountOriginal: number;
  operationCurrency: string;
  amountReporting: number;
  note: string;
}

async function buildReportOperationCsvRows(
  bundle: ReportEntriesBundle
): Promise<ReportOperationCsvRow[]> {
  const rateCache = new Map<string, number>();

  async function convert(
    amount: number,
    fromCurrencyCode: string,
    toCurrencyCode: string
  ): Promise<number> {
    const key = `${fromCurrencyCode}:${toCurrencyCode}`;

    if (!rateCache.has(key)) {
      rateCache.set(key, await getExchangeRate(fromCurrencyCode, toCurrencyCode));
    }

    return Number((amount * (rateCache.get(key) ?? 1)).toFixed(2));
  }

  const sorted = [...bundle.entries].sort((left, right) =>
    String(left.occurred_at).localeCompare(String(right.occurred_at))
  );

  const rows: ReportOperationCsvRow[] = [];

  for (const entry of sorted) {
    const amount = Number(entry.amount);
    const opCcy = entry.currency_code;
    const reporting = await convert(amount, opCcy, bundle.reportingCurrency);

    rows.push({
      occurredAtIso: new Date(entry.occurred_at).toISOString(),
      kindLabel: entry.kind === "income" ? "Доход" : "Расход",
      categoryName: entry.category?.name ?? "Без категории",
      accountName: entry.account?.name ?? "—",
      amountOriginal: Number(amount.toFixed(2)),
      operationCurrency: opCcy,
      amountReporting: reporting,
      note: typeof entry.note === "string" ? entry.note : ""
    });
  }

  return rows;
}

/** Сводка отчёта + строки операций для CSV (один проход по проводкам в БД). */
export async function buildReportExportPayload(input: {
  userId: string;
  period: ReportPeriod;
  startDate?: string;
  endDate?: string;
  reportingCurrency?: string;
  categoryId?: string;
}): Promise<{ report: ReportResult; operations: ReportOperationCsvRow[] }> {
  const bundle = await resolveReportEntriesBundle(input);

  const [report, operations] = await Promise.all([
    aggregateReportFromBundle(input, bundle),
    buildReportOperationCsvRows(bundle)
  ]);

  return { report, operations };
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
  monthlyNet: number;
  monthlyExpenseByCategory: ReportCategoryItem[];
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
    monthlyNet: monthReport.net,
    monthlyExpenseByCategory: monthReport.expenseByCategory,
    reportingCurrency,
    totalBalanceConverted: Number(totalBalanceConverted.toFixed(2)),
    ratesUpdatedAt: await getLatestExchangeRateUpdate()
  };
}

async function aggregateReportFromBundle(
  input: { userId: string; period: ReportPeriod },
  bundle: ReportEntriesBundle
): Promise<ReportResult> {
  const { startDate, endDate, reportingCurrency, entries, appliedCategory } = bundle;

  const transfers = await listTransfersByRange(input.userId, startDate, endDate);
  const accounts = await listAccounts(input.userId);
  const rateCache = new Map<string, number>();

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

export async function getReport(input: {
  userId: string;
  period: ReportPeriod;
  startDate?: string;
  endDate?: string;
  reportingCurrency?: string;
  categoryId?: string;
}): Promise<ReportResult> {
  const bundle = await resolveReportEntriesBundle(input);

  return aggregateReportFromBundle(input, bundle);
}

function csvCell(value: unknown): string {
  const raw = value === undefined || value === null ? "" : String(value);

  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }

  return raw;
}

function csvRow(values: readonly unknown[]): string {
  return `${values.map(csvCell).join(",")}\r\n`;
}

/** UTF-8 + BOM для открытия в Excel локали ru */
export function formatReportResultAsCsv(
  report: ReportResult,
  operations: ReportOperationCsvRow[]
): string {
  const periodLabel: Record<ReportPeriod, string> = {
    week: "Неделя (7 дней)",
    month: "Месяц (30 дней)",
    quarter: "Квартал (90 дней)",
    custom: "Произвольный период"
  };

  let block = "";

  block += csvRow(["Отчёт", "Balancy"]);
  block += csvRow(["Период типа", periodLabel[report.period]]);
  block += csvRow(["Начало (UTC)", report.startDate]);
  block += csvRow(["Окончание (UTC)", report.endDate]);
  block += csvRow(["Валюта пересчёта", report.reportingCurrency]);

  if (report.appliedCategory) {
    block += csvRow([
      "Фильтр статьи",
      `${report.appliedCategory.name} (${report.appliedCategory.kind === "income" ? "доход" : "расход"})`
    ]);
  }

  if (report.ratesUpdatedAt) {
    block += csvRow(["Курсы синхронизированы", report.ratesUpdatedAt]);
  }

  block += csvRow([]);
  block += csvRow(["Сводка"]);
  block += csvRow(["Показатель", "Значение", "Валюта"]);
  block += csvRow(["Доходы", report.incomes, report.reportingCurrency]);
  block += csvRow(["Расходы", report.expenses, report.reportingCurrency]);
  block += csvRow(["Чистый итог", report.net, report.reportingCurrency]);
  block += csvRow(["Текущий общий баланс", report.currentTotalBalance, report.reportingCurrency]);

  if (!report.appliedCategory) {
    block += csvRow(["Переводов за период", report.transfersCount, ""]);
  }

  block += csvRow([]);
  block += csvRow(["Доходы по категориям"]);
  block += csvRow(["Категория", "Сумма", "Валюта"]);

  for (const row of report.incomeByCategory) {
    block += csvRow([row.categoryName, row.total, row.currencyCode]);
  }

  if (report.incomeByCategory.length === 0) {
    block += csvRow(["—", "0", report.reportingCurrency]);
  }

  block += csvRow([]);
  block += csvRow(["Расходы по категориям"]);
  block += csvRow(["Категория", "Сумма", "Валюта"]);

  for (const row of report.expenseByCategory) {
    block += csvRow([row.categoryName, row.total, row.currencyCode]);
  }

  if (report.expenseByCategory.length === 0) {
    block += csvRow(["—", "0", report.reportingCurrency]);
  }

  block += csvRow([]);
  block += csvRow(["Операции (каждая запись дохода/расхода, по дате по возрастанию, UTC)"]);
  block += csvRow([
    "Дата и время (ISO UTC)",
    "Тип",
    "Категория",
    "Счёт",
    "Сумма в валюте операции",
    "Валюта операции",
    `Сумма в валюте отчёта (${report.reportingCurrency})`,
    "Примечание"
  ]);

  for (const op of operations) {
    block += csvRow([
      op.occurredAtIso,
      op.kindLabel,
      op.categoryName,
      op.accountName,
      op.amountOriginal,
      op.operationCurrency,
      op.amountReporting,
      op.note
    ]);
  }

  if (operations.length === 0) {
    block += csvRow([
      "—",
      "Нет операций за период по выбранным условиям",
      "",
      "",
      "",
      "",
      "",
      ""
    ]);
  }

  return `\uFEFF${block}`;
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
