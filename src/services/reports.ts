import { env } from "../config/env.js";
import { getCategoryById } from "./categories.js";
import { listAccounts, type AccountRow } from "./accounts.js";
import { getExchangeRate, getLatestExchangeRateUpdate } from "./exchange-rates.js";
import { listRecentEntries } from "./entries.js";
import { listRecentTransfers } from "./transfers.js";
import { supabase } from "../lib/supabase.js";
import type { OperationKind } from "../shared/domain.js";

export type ReportPeriod = "week" | "month" | "quarter" | "year" | "custom";

export interface ReportCategoryMatrixRow {
  categoryName: string;
  income: number;
  expense: number;
  net: number;
  /** Доля расхода категории от всех расходов периода (0..1) */
  expenseShare: number;
}

export interface ReportCompareToPrevious {
  incomePct: number | null;
  expensePct: number | null;
  netPct: number | null;
  operationsPct: number | null;
  operationsDelta: number;
}

export interface ReportCategoryItem {
  categoryName: string;
  total: number;
  currencyCode: string;
}

export interface ReportDailyPoint {
  date: string;
  income: number;
  expense: number;
  net: number;
}

/** Веб-дашборд: последние 7 дней периода, по 6 четырёхчасовых интервалов (UTC). */
export interface ReportSparkLast7Days {
  dates: string[];
  income: number[][];
  expense: number[][];
  net: number[][];
  operationCount: number[][];
}

const REPORT_SPARK_DAY_COUNT = 7;
const REPORT_SPARK_SLOTS_PER_DAY = 6;

function utcSparkSlotFromOccurredAt(occurredAt: string): number {
  const hour = new Date(occurredAt).getUTCHours();
  return Math.min(REPORT_SPARK_SLOTS_PER_DAY - 1, Math.floor(hour / 4));
}

function buildReportSparkLast7Days(
  dayKeys: string[],
  sparkByDaySlot: Map<string, { income: number; expense: number; count: number }>
): ReportSparkLast7Days {
  const dates = dayKeys.slice(-REPORT_SPARK_DAY_COUNT);
  const slotValues = (date: string, pick: (b: { income: number; expense: number; count: number }) => number) =>
    Array.from({ length: REPORT_SPARK_SLOTS_PER_DAY }, (_, slot) => {
      const bucket = sparkByDaySlot.get(`${date}:${slot}`);
      return bucket ? Number(pick(bucket).toFixed(2)) : 0;
    });

  return {
    dates,
    income: dates.map((date) => slotValues(date, (b) => b.income)),
    expense: dates.map((date) => slotValues(date, (b) => b.expense)),
    net: dates.map((date) =>
      slotValues(date, (b) => Number((b.income - b.expense).toFixed(2)))
    ),
    operationCount: dates.map((date) => slotValues(date, (b) => b.count))
  };
}

export interface ReportMonthlyPoint {
  monthKey: string;
  income: number;
  expense: number;
  net: number;
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
  /** Количество операций (проводок) в периоде + переводы, если не задан фильтр по категории */
  operationsCount: number;
  /** Доходы и расходы по календарным дням (UTC) в валюте отчёта */
  dailySeries: ReportDailyPoint[];
  /** Агрегаты по календарным месяцам (UTC) в валюте отчёта */
  monthlySeries: ReportMonthlyPoint[];
  /** Последние 7 дней периода: 6×4ч бакетов для мини-графиков на веб-главной */
  sparkLast7Days: ReportSparkLast7Days;
  incomeEntryCount: number;
  expenseEntryCount: number;
  /** Сумма списаний по переводам (from_amount) в валюте отчёта */
  transfersVolumeReporting: number;
  /** Оценка баланса всех счетов на конец периода (в валюте отчёта), null если недостаточно данных */
  balanceAtPeriodEndReporting: number | null;
  /** Оценка баланса на начало периода */
  balanceAtPeriodStartReporting: number | null;
  compareToPrevious: ReportCompareToPrevious | null;
  categoryMatrix: ReportCategoryMatrixRow[];
  ratesUpdatedAt: string | null;
  appliedCategory?: {
    id: string;
    name: string;
    kind: OperationKind;
  };
}

function enumerateUtcDaysInclusive(startIso: string, endIso: string): string[] {
  const startDay = startIso.slice(0, 10);
  const endDay = endIso.slice(0, 10);
  const out: string[] = [];
  const cursor = new Date(`${startDay}T00:00:00.000Z`);
  const end = new Date(`${endDay}T00:00:00.000Z`);

  while (cursor.getTime() <= end.getTime()) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return out;
}

function utcDayFromOccurredAt(occurredAt: string): string {
  return new Date(occurredAt).toISOString().slice(0, 10);
}

function enumerateMonthsInclusive(startIso: string, endIso: string): string[] {
  const startDay = startIso.slice(0, 10);
  const endDay = endIso.slice(0, 10);
  const start = new Date(`${startDay}T00:00:00.000Z`);
  const end = new Date(`${endDay}T00:00:00.000Z`);
  const out: string[] = [];
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const endMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

  while (cur.getTime() <= endMonth.getTime()) {
    out.push(
      `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, "0")}`
    );
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }

  return out;
}

function utcMonthKeyFromOccurredAt(occurredAt: string): string {
  return new Date(occurredAt).toISOString().slice(0, 7);
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

function startOfWeekMonday(d: Date): Date {
  const s = startOfDay(new Date(d));
  const day = s.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  s.setDate(s.getDate() + diff);
  return s;
}

export function resolveReportRange(
  period: ReportPeriod,
  customStartDate?: string,
  customEndDate?: string
): { startDate: string; endDate: string } {
  const now = new Date();
  const endToday = endOfDay(now);

  if (period === "custom") {
    if (!customStartDate || !customEndDate) {
      throw new Error("Custom report requires startDate and endDate");
    }

    return {
      startDate: startOfDay(new Date(customStartDate)).toISOString(),
      endDate: endOfDay(new Date(customEndDate)).toISOString()
    };
  }

  if (period === "week") {
    const start = startOfWeekMonday(now);
    return {
      startDate: start.toISOString(),
      endDate: endToday.toISOString()
    };
  }

  if (period === "month") {
    const y = now.getFullYear();
    const m = now.getMonth();
    const monthStart = startOfDay(new Date(y, m, 1));
    const lastDayOfMonth = new Date(y, m + 1, 0);
    const monthEndDate =
      endToday.getTime() < endOfDay(lastDayOfMonth).getTime() ? now : lastDayOfMonth;

    return {
      startDate: monthStart.toISOString(),
      endDate: endOfDay(monthEndDate).toISOString()
    };
  }

  if (period === "quarter") {
    const y = now.getFullYear();
    const quarterIndex = Math.floor(now.getMonth() / 3);
    const startMonth = quarterIndex * 3;
    const quarterStart = startOfDay(new Date(y, startMonth, 1));
    const quarterLastDay = new Date(y, startMonth + 3, 0);
    const quarterEndDate =
      endToday.getTime() < endOfDay(quarterLastDay).getTime() ? now : quarterLastDay;

    return {
      startDate: quarterStart.toISOString(),
      endDate: endOfDay(quarterEndDate).toISOString()
    };
  }

  if (period === "year") {
    const y = now.getFullYear();
    const yearStart = startOfDay(new Date(y, 0, 1));
    return {
      startDate: yearStart.toISOString(),
      endDate: endToday.toISOString()
    };
  }

  const _exhaustive: never = period;
  throw new Error(`Unsupported report period: ${String(_exhaustive)}`);
}

async function listEntriesByRange(
  userId: string,
  startDate: string,
  endDate: string,
  filters?: { accountId?: string; kind?: OperationKind }
) {
  let query = supabase
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
    .lte("occurred_at", endDate);

  if (filters?.accountId) {
    query = query.eq("account_id", filters.accountId);
  }

  if (filters?.kind) {
    query = query.eq("kind", filters.kind);
  }

  const { data, error } = await query.order("occurred_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function listTransfersByRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ id: string; from_amount: string; from_currency_code: string }[]> {
  const { data, error } = await supabase
    .from("transfers")
    .select("id, from_amount, from_currency_code")
    .eq("user_id", userId)
    .gte("occurred_at", startDate)
    .lte("occurred_at", endDate);

  if (error) {
    throw error;
  }

  return (data ?? []) as { id: string; from_amount: string; from_currency_code: string }[];
}

async function listEntriesStrictlyAfter(
  userId: string,
  afterOccurredAt: string
): Promise<{ amount: number; currency_code: string; kind: string }[]> {
  const { data, error } = await supabase
    .from("entries")
    .select("amount, currency_code, kind")
    .eq("user_id", userId)
    .gt("occurred_at", afterOccurredAt)
    .order("occurred_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (
    data?.map((row) => ({
      amount: Number(row.amount),
      currency_code: String(row.currency_code ?? ""),
      kind: String(row.kind ?? "")
    })) ?? []
  );
}

type ReportEntriesBundle = {
  startDate: string;
  endDate: string;
  reportingCurrency: string;
  entries: Awaited<ReturnType<typeof listEntriesByRange>>;
  appliedCategory?: ReportResult["appliedCategory"];
  accountId?: string;
  kind?: OperationKind;
};

async function resolveReportEntriesBundle(input: {
  userId: string;
  period: ReportPeriod;
  startDate?: string;
  endDate?: string;
  reportingCurrency?: string;
  categoryId?: string;
  accountId?: string;
  kind?: OperationKind;
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

  const entryFilters =
    input.accountId || input.kind
      ? { accountId: input.accountId, kind: input.kind }
      : undefined;

  const rawEntries = await listEntriesByRange(
    input.userId,
    startDate,
    endDate,
    entryFilters
  );
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

  return {
    startDate,
    endDate,
    reportingCurrency,
    entries,
    appliedCategory,
    accountId: input.accountId,
    kind: input.kind
  };
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
  accountId?: string;
  kind?: OperationKind;
}): Promise<{ report: ReportResult; operations: ReportOperationCsvRow[] }> {
  const bundle = await resolveReportEntriesBundle(input);

  const [report, operations] = await Promise.all([
    aggregateReportFromBundle(input, bundle),
    buildReportOperationCsvRows(bundle)
  ]);

  return { report, operations };
}

export interface DashboardSummary {
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
}

export async function sumAccountsBalanceInReportingCurrency(
  accounts: AccountRow[],
  reportingCurrency: string
): Promise<number> {
  const rateCache = new Map<string, number>();
  const codes = accounts.map((account) => String(account.currency_code ?? ""));

  await Promise.all(
    [...new Set(codes)]
      .filter((code) => code.length > 0 && code !== reportingCurrency)
      .map(async (code) => {
        rateCache.set(
          `${code}:${reportingCurrency}`,
          await getExchangeRate(code, reportingCurrency)
        );
      })
  );

  let total = 0;

  for (const account of accounts) {
    const from = account.currency_code;

    if (from === reportingCurrency) {
      total += Number(account.balance);
      continue;
    }

    const rate = rateCache.get(`${from}:${reportingCurrency}`) ?? 1;
    total += Number((Number(account.balance) * rate).toFixed(2));
  }

  return Number(total.toFixed(2));
}

export function isOccurredInReportRange(
  occurredAt: string,
  startDate: string,
  endDate: string
): boolean {
  const occurredMs = new Date(occurredAt).getTime();
  return (
    occurredMs >= new Date(startDate).getTime() &&
    occurredMs <= new Date(endDate).getTime()
  );
}

function mapExpenseCategoryTotals(
  expenseByCategoryMap: Map<string, number>,
  reportingCurrency: string
): ReportCategoryItem[] {
  return Array.from(expenseByCategoryMap.entries())
    .map(([categoryName, total]) => ({
      categoryName,
      total: Number(total.toFixed(2)),
      currencyCode: reportingCurrency
    }))
    .sort((left, right) => right.total - left.total);
}

/** Доходы/расходы месяца в валюте отчёта (без переводов, балансов и спарклайнов). */
export async function computeMonthEntryTotalsInReportingCurrency(
  userId: string,
  reportingCurrency: string,
  startDate: string,
  endDate: string
): Promise<{
  incomes: number;
  expenses: number;
  net: number;
  expenseByCategory: ReportCategoryItem[];
  ratesUpdatedAt: string | null;
}> {
  const bundle = await resolveReportEntriesBundle({
    userId,
    period: "month",
    startDate,
    endDate,
    reportingCurrency
  });

  const currencyCodes = new Set<string>();

  for (const entry of bundle.entries) {
    currencyCodes.add(String(entry.currency_code ?? ""));
  }

  const rateCache = new Map<string, number>();

  await Promise.all(
    [...currencyCodes]
      .filter((code) => code.length > 0 && code !== reportingCurrency)
      .map(async (code) => {
        rateCache.set(
          `${code}:${reportingCurrency}`,
          await getExchangeRate(code, reportingCurrency)
        );
      })
  );

  function convertSynced(
    amount: number,
    fromCurrencyCode: string,
    toCurrencyCode: string
  ): number {
    if (fromCurrencyCode === toCurrencyCode) {
      return Number(amount.toFixed(2));
    }

    const rate = rateCache.get(`${fromCurrencyCode}:${toCurrencyCode}`);

    if (rate === undefined) {
      throw new Error(
        `Exchange rate ${fromCurrencyCode} -> ${toCurrencyCode} was not warmed`
      );
    }

    return Number((amount * rate).toFixed(2));
  }

  let incomes = 0;
  let expenses = 0;
  const expenseByCategoryMap = new Map<string, number>();

  for (const entry of bundle.entries) {
    const convertedAmount = convertSynced(
      Number(entry.amount),
      entry.currency_code,
      reportingCurrency
    );

    if (entry.kind === "income") {
      incomes += convertedAmount;
    } else {
      expenses += convertedAmount;
      const categoryName = entry.category?.name ?? "Без категории";
      expenseByCategoryMap.set(
        categoryName,
        (expenseByCategoryMap.get(categoryName) ?? 0) + convertedAmount
      );
    }
  }

  return {
    incomes: Number(incomes.toFixed(2)),
    expenses: Number(expenses.toFixed(2)),
    net: Number((incomes - expenses).toFixed(2)),
    expenseByCategory: mapExpenseCategoryTotals(expenseByCategoryMap, reportingCurrency),
    ratesUpdatedAt: await getLatestExchangeRateUpdate()
  };
}

export async function buildDashboardSummaryFromParts(
  accounts: AccountRow[],
  categoriesCount: number,
  monthReport: ReportResult,
  reportingCurrency: string
): Promise<DashboardSummary> {
  const balancesByCurrency = accounts.reduce<Record<string, number>>(
    (result, account) => {
      result[account.currency_code] =
        (result[account.currency_code] ?? 0) + Number(account.balance);
      return result;
    },
    {}
  );

  const totalBalanceConverted = await sumAccountsBalanceInReportingCurrency(
    accounts,
    reportingCurrency
  );

  return {
    accountsCount: accounts.length,
    balancesByCurrency,
    categoriesCount,
    monthlyIncome: monthReport.incomes,
    monthlyExpense: monthReport.expenses,
    monthlyNet: monthReport.net,
    monthlyExpenseByCategory: monthReport.expenseByCategory,
    reportingCurrency,
    totalBalanceConverted,
    ratesUpdatedAt:
      monthReport.ratesUpdatedAt ?? (await getLatestExchangeRateUpdate())
  };
}

/** Один месячный отчёт для bootstrap (без compareToPrevious). */
export async function buildBootstrapMonthDashboard(
  userId: string,
  reportingCurrency: string,
  accounts: AccountRow[],
  categoriesCount: number
): Promise<{ summary: DashboardSummary; report: ReportResult }> {
  const monthRange = resolveReportRange("month");
  const monthBundle = await resolveReportEntriesBundle({
    userId,
    period: "month",
    startDate: monthRange.startDate,
    endDate: monthRange.endDate,
    reportingCurrency
  });
  const report = await aggregateReportFromBundle(
    { userId, period: "month" },
    monthBundle,
    { accounts }
  );
  const summary = await buildDashboardSummaryFromParts(
    accounts,
    categoriesCount,
    report,
    reportingCurrency
  );

  return { summary, report };
}

export async function getDashboardSummary(
  userId: string,
  reportingCurrency = env.reportingCurrency,
  options?: { categoriesCount?: number }
): Promise<DashboardSummary> {
  const accounts = await listAccounts(userId);
  let categoriesCount = options?.categoriesCount;

  if (categoriesCount === undefined) {
    const { data: categories, error } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", userId)
      .eq("is_archived", false);

    if (error) {
      throw error;
    }

    categoriesCount = (categories ?? []).length;
  }

  const { summary } = await buildBootstrapMonthDashboard(
    userId,
    reportingCurrency,
    accounts,
    categoriesCount
  );

  return summary;
}

async function aggregateReportFromBundle(
  input: { userId: string; period: ReportPeriod },
  bundle: ReportEntriesBundle,
  options?: { accounts?: AccountRow[] }
): Promise<ReportResult> {
  const { startDate, endDate, reportingCurrency, entries, appliedCategory } = bundle;
  const hasEntryFilters = Boolean(appliedCategory || bundle.accountId || bundle.kind);

  const accountsPromise =
    options?.accounts !== undefined
      ? Promise.resolve(options.accounts)
      : listAccounts(input.userId);

  const [transfers, accounts, entriesAfterPeriod] = await Promise.all([
    listTransfersByRange(input.userId, startDate, endDate),
    accountsPromise,
    listEntriesStrictlyAfter(input.userId, endDate)
  ]);

  const currencyCodes = new Set<string>();

  for (const entry of entries) {
    currencyCodes.add(String(entry.currency_code ?? ""));
  }

  for (const account of accounts) {
    currencyCodes.add(String(account.currency_code ?? ""));
  }

  for (const transfer of transfers) {
    currencyCodes.add(String(transfer.from_currency_code ?? ""));
  }

  for (const row of entriesAfterPeriod) {
    currencyCodes.add(String(row.currency_code ?? ""));
  }

  const rateCache = new Map<string, number>();
  const rateTargets = [...currencyCodes].filter(
    (code) => code.length > 0 && code !== reportingCurrency
  );

  await Promise.all(
    rateTargets.map(async (code) => {
      rateCache.set(
        `${code}:${reportingCurrency}`,
        await getExchangeRate(code, reportingCurrency)
      );
    })
  );

  function convertSynced(
    amount: number,
    fromCurrencyCode: string,
    toCurrencyCode: string
  ): number {
    if (fromCurrencyCode === toCurrencyCode) {
      return Number(amount.toFixed(2));
    }

    const key = `${fromCurrencyCode}:${toCurrencyCode}`;
    const rate = rateCache.get(key);

    if (rate === undefined) {
      throw new Error(`Exchange rate ${fromCurrencyCode} -> ${toCurrencyCode} was not warmed`);
    }

    return Number((amount * rate).toFixed(2));
  }

  let incomes = 0;
  let expenses = 0;
  let incomeEntryCount = 0;
  let expenseEntryCount = 0;
  const expenseByCategoryMap = new Map<string, number>();
  const incomeByCategoryMap = new Map<string, number>();
  const dailyMap = new Map<string, { income: number; expense: number }>();
  const monthlyMap = new Map<string, { income: number; expense: number }>();
  const sparkByDaySlot = new Map<string, { income: number; expense: number; count: number }>();

  for (const entry of entries) {
    const convertedAmount = convertSynced(
      Number(entry.amount),
      entry.currency_code,
      reportingCurrency
    );

    const occurredAt = String(entry.occurred_at);
    const day = utcDayFromOccurredAt(occurredAt);
    const monthKey = utcMonthKeyFromOccurredAt(occurredAt);
    const sparkSlot = utcSparkSlotFromOccurredAt(occurredAt);
    const sparkKey = `${day}:${sparkSlot}`;
    const sparkBucket = sparkByDaySlot.get(sparkKey) ?? { income: 0, expense: 0, count: 0 };

    if (entry.kind === "income") {
      incomes += convertedAmount;
      incomeEntryCount += 1;
      const categoryName = entry.category?.name ?? "Без категории";
      incomeByCategoryMap.set(
        categoryName,
        (incomeByCategoryMap.get(categoryName) ?? 0) + convertedAmount
      );
      const d = dailyMap.get(day) ?? { income: 0, expense: 0 };
      d.income += convertedAmount;
      dailyMap.set(day, d);
      const m = monthlyMap.get(monthKey) ?? { income: 0, expense: 0 };
      m.income += convertedAmount;
      monthlyMap.set(monthKey, m);
      sparkBucket.income += convertedAmount;
      sparkBucket.count += 1;
    } else {
      expenses += convertedAmount;
      expenseEntryCount += 1;
      const categoryName = entry.category?.name ?? "Без категории";
      expenseByCategoryMap.set(
        categoryName,
        (expenseByCategoryMap.get(categoryName) ?? 0) + convertedAmount
      );
      const d = dailyMap.get(day) ?? { income: 0, expense: 0 };
      d.expense += convertedAmount;
      dailyMap.set(day, d);
      const m = monthlyMap.get(monthKey) ?? { income: 0, expense: 0 };
      m.expense += convertedAmount;
      monthlyMap.set(monthKey, m);
      sparkBucket.expense += convertedAmount;
      sparkBucket.count += 1;
    }

    sparkByDaySlot.set(sparkKey, sparkBucket);
  }

  const mapToSortedItems = (mapping: Map<string, number>): ReportCategoryItem[] =>
    Array.from(mapping.entries())
      .map(([categoryName, total]) => ({
        categoryName,
        total: Number(total.toFixed(2)),
        currencyCode: reportingCurrency
      }))
      .sort((left, right) => right.total - left.total);

  const currentTotalBalance = accounts.reduce((sum, account) => {
    return (
      sum +
      convertSynced(Number(account.balance), account.currency_code, reportingCurrency)
    );
  }, 0);

  const dayKeys = enumerateUtcDaysInclusive(startDate, endDate);
  const sparkLast7Days = buildReportSparkLast7Days(dayKeys, sparkByDaySlot);
  const dailySeries: ReportDailyPoint[] = dayKeys.map((date) => {
    const bucket = dailyMap.get(date) ?? { income: 0, expense: 0 };
    const inc = Number(bucket.income.toFixed(2));
    const exp = Number(bucket.expense.toFixed(2));
    return {
      date,
      income: inc,
      expense: exp,
      net: Number((inc - exp).toFixed(2))
    };
  });

  const monthKeys = enumerateMonthsInclusive(startDate, endDate);
  const monthlySeries: ReportMonthlyPoint[] = monthKeys.map((mk) => {
    const bucket = monthlyMap.get(mk) ?? { income: 0, expense: 0 };
    const inc = Number(bucket.income.toFixed(2));
    const exp = Number(bucket.expense.toFixed(2));
    return {
      monthKey: mk,
      income: inc,
      expense: exp,
      net: Number((inc - exp).toFixed(2))
    };
  });

  const operationsCount =
    entries.length + (appliedCategory ? 0 : transfers.length);

  let transfersVolumeReporting = 0;
  for (const transfer of transfers) {
    transfersVolumeReporting += convertSynced(
      Number(transfer.from_amount),
      transfer.from_currency_code,
      reportingCurrency
    );
  }

  let netUnfilteredPeriod = 0;

  if (hasEntryFilters) {
    const unfilteredPeriodEntries = await listEntriesByRange(
      input.userId,
      startDate,
      endDate,
      undefined
    );

    for (const entry of unfilteredPeriodEntries) {
      const convertedAmount = convertSynced(
        Number(entry.amount),
        entry.currency_code,
        reportingCurrency
      );
      netUnfilteredPeriod += entry.kind === "income" ? convertedAmount : -convertedAmount;
    }
  } else {
    netUnfilteredPeriod = incomes - expenses;
  }

  let netAfterPeriod = 0;
  for (const row of entriesAfterPeriod) {
    const convertedAmount = convertSynced(
      row.amount,
      row.currency_code,
      reportingCurrency
    );
    netAfterPeriod += row.kind === "income" ? convertedAmount : -convertedAmount;
  }

  const balanceAtPeriodEndReporting = Number(
    (currentTotalBalance - netAfterPeriod).toFixed(2)
  );
  const balanceAtPeriodStartReporting = Number(
    (balanceAtPeriodEndReporting - netUnfilteredPeriod).toFixed(2)
  );

  const categoryNames = new Set<string>([
    ...incomeByCategoryMap.keys(),
    ...expenseByCategoryMap.keys()
  ]);
  const totalExpenseForShare = expenses > 0 ? expenses : 0;
  const categoryMatrix: ReportCategoryMatrixRow[] = Array.from(categoryNames)
    .map((categoryName) => {
      const inc = Number((incomeByCategoryMap.get(categoryName) ?? 0).toFixed(2));
      const exp = Number((expenseByCategoryMap.get(categoryName) ?? 0).toFixed(2));
      const net = Number((inc - exp).toFixed(2));
      const expenseShare =
        totalExpenseForShare > 0 ? Number((exp / totalExpenseForShare).toFixed(4)) : 0;
      return { categoryName, income: inc, expense: exp, net, expenseShare };
    })
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

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
    operationsCount,
    dailySeries,
    monthlySeries,
    sparkLast7Days,
    incomeEntryCount,
    expenseEntryCount,
    transfersVolumeReporting: Number(transfersVolumeReporting.toFixed(2)),
    balanceAtPeriodEndReporting,
    balanceAtPeriodStartReporting,
    compareToPrevious: null,
    categoryMatrix,
    ratesUpdatedAt: await getLatestExchangeRateUpdate(),
    appliedCategory
  };
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
}

async function buildReportFromInput(input: {
  userId: string;
  period: ReportPeriod;
  startDate?: string;
  endDate?: string;
  reportingCurrency?: string;
  categoryId?: string;
  accountId?: string;
  kind?: OperationKind;
}): Promise<ReportResult> {
  const bundle = await resolveReportEntriesBundle(input);

  return aggregateReportFromBundle(input, bundle);
}

async function computeCompareToPrevious(
  input: {
    userId: string;
    period: ReportPeriod;
    startDate?: string;
    endDate?: string;
    reportingCurrency?: string;
    categoryId?: string;
    accountId?: string;
    kind?: OperationKind;
  },
  main: ReportResult
): Promise<ReportCompareToPrevious | null> {
  const mainStartMs = new Date(main.startDate).getTime();
  const mainEndMs = new Date(main.endDate).getTime();
  const spanMs = mainEndMs - mainStartMs;
  if (spanMs <= 0) {
    return null;
  }

  const prevEndMs = mainStartMs - 1;
  const prevStartMs = mainStartMs - spanMs;
  const prevStartDay = startOfDay(new Date(prevStartMs));
  const prevEndDay = endOfDay(new Date(prevEndMs));

  const prev = await buildReportFromInput({
    ...input,
    period: "custom",
    startDate: prevStartDay.toISOString().slice(0, 10),
    endDate: prevEndDay.toISOString().slice(0, 10)
  });

  return {
    incomePct: pctChange(main.incomes, prev.incomes),
    expensePct: pctChange(main.expenses, prev.expenses),
    netPct: pctChange(main.net, prev.net),
    operationsPct: pctChange(main.operationsCount, prev.operationsCount),
    operationsDelta: main.operationsCount - prev.operationsCount
  };
}

export async function getReport(
  input: {
    userId: string;
    period: ReportPeriod;
    startDate?: string;
    endDate?: string;
    reportingCurrency?: string;
    categoryId?: string;
    accountId?: string;
    kind?: OperationKind;
  },
  options?: { compareToPrevious?: boolean }
): Promise<ReportResult> {
  const report = await buildReportFromInput(input);

  if (options?.compareToPrevious !== false) {
    report.compareToPrevious = await computeCompareToPrevious(input, report);
  }

  return report;
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
    week: "Неделя (текущая)",
    month: "Месяц (календарный)",
    quarter: "Квартал (календарный)",
    year: "Год (с 1 января)",
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
  block += csvRow(["Сводка по категориям (валюта отчёта)"]);
  block += csvRow(["Категория", "Расходы", "Доходы", "Чистый поток"]);
  const matrix = report.categoryMatrix ?? [];
  if (matrix.length === 0) {
    block += csvRow(["—", "", "", ""]);
  } else {
    for (const row of matrix) {
      block += csvRow([row.categoryName, row.expense, row.income, row.net]);
    }
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
