import type { AccountRow } from "./accounts.js";
import { listAccounts } from "./accounts.js";
import { countActiveCategories, listCategories, type CategoryRow } from "./categories.js";
import type { EntryListItem } from "./entries.js";
import {
  buildDashboardSummaryFromParts,
  computeMonthEntryTotalsInReportingCurrency,
  isOccurredInReportRange,
  resolveReportRange,
  sumAccountsBalanceInReportingCurrency,
  type DashboardSummary,
  type ReportResult
} from "./reports.js";

export interface AppMutationPatch {
  accounts?: AccountRow[];
  categories?: CategoryRow[];
  summary?: DashboardSummary | Partial<DashboardSummary>;
  /** Фоновый пересчёт отчёта/спарклайнов (месяц затронут). */
  syncReport?: boolean;
}

function balancesByCurrencyFromAccounts(
  accounts: AccountRow[]
): Record<string, number> {
  return accounts.reduce<Record<string, number>>((result, account) => {
    result[account.currency_code] =
      (result[account.currency_code] ?? 0) + Number(account.balance);
    return result;
  }, {});
}

async function buildBalancesSummaryPartial(
  accounts: AccountRow[],
  categoriesCount: number,
  reportingCurrency: string
): Promise<Partial<DashboardSummary>> {
  return {
    accountsCount: accounts.length,
    categoriesCount,
    balancesByCurrency: balancesByCurrencyFromAccounts(accounts),
    totalBalanceConverted: await sumAccountsBalanceInReportingCurrency(
      accounts,
      reportingCurrency
    ),
    reportingCurrency
  };
}

async function buildBalanceSummary(
  userId: string,
  reportingCurrency: string,
  accounts: AccountRow[],
  categoriesCount: number,
  monthReport?: Awaited<ReturnType<typeof computeMonthEntryTotalsInReportingCurrency>>
): Promise<DashboardSummary> {
  const monthRange = resolveReportRange("month");
  const monthTotals =
    monthReport ??
    (await computeMonthEntryTotalsInReportingCurrency(
      userId,
      reportingCurrency,
      monthRange.startDate,
      monthRange.endDate
    ));

  const syntheticReport = {
    incomes: monthTotals.incomes,
    expenses: monthTotals.expenses,
    net: monthTotals.net,
    expenseByCategory: monthTotals.expenseByCategory,
    ratesUpdatedAt: monthTotals.ratesUpdatedAt
  } as ReportResult;

  return buildDashboardSummaryFromParts(
    accounts,
    categoriesCount,
    syntheticReport,
    reportingCurrency
  );
}

/** Счета и остатки без пересчёта доходов/расходов месяца (перевод, счёт). */
export async function buildBalancesOnlyMutationPatch(
  userId: string,
  reportingCurrency: string
): Promise<AppMutationPatch> {
  const [accounts, categoriesCount] = await Promise.all([
    listAccounts(userId),
    countActiveCategories(userId)
  ]);

  return {
    accounts,
    summary: await buildBalancesSummaryPartial(accounts, categoriesCount, reportingCurrency)
  };
}

export async function buildAccountsMutationPatch(
  userId: string,
  reportingCurrency: string
): Promise<AppMutationPatch> {
  return buildBalancesOnlyMutationPatch(userId, reportingCurrency);
}

export async function buildTransferMutationPatch(
  userId: string,
  reportingCurrency: string
): Promise<AppMutationPatch> {
  return buildBalancesOnlyMutationPatch(userId, reportingCurrency);
}

export async function buildCategoriesMutationPatch(
  userId: string,
  reportingCurrency: string
): Promise<AppMutationPatch> {
  const [categories, accounts, categoriesCount] = await Promise.all([
    listCategories(userId),
    listAccounts(userId),
    countActiveCategories(userId)
  ]);

  return {
    categories,
    accounts,
    summary: {
      ...(await buildBalancesSummaryPartial(accounts, categoriesCount, reportingCurrency)),
      categoriesCount: categories.length
    }
  };
}

export async function buildEntryMutationPatch(
  userId: string,
  reportingCurrency: string,
  entry: EntryListItem
): Promise<AppMutationPatch> {
  const monthRange = resolveReportRange("month");
  const inMonth = isOccurredInReportRange(
    entry.occurred_at,
    monthRange.startDate,
    monthRange.endDate
  );

  const [accounts, categoriesCount] = await Promise.all([
    listAccounts(userId),
    countActiveCategories(userId)
  ]);

  const monthTotals = inMonth
    ? await computeMonthEntryTotalsInReportingCurrency(
        userId,
        reportingCurrency,
        monthRange.startDate,
        monthRange.endDate
      )
    : undefined;

  const summary = await buildBalanceSummary(
    userId,
    reportingCurrency,
    accounts,
    categoriesCount,
    monthTotals
  );

  return {
    accounts,
    summary,
    syncReport: inMonth
  };
}
