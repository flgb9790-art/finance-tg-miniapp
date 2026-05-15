import type { AccountRow } from "./accounts.js";
import { listAccounts } from "./accounts.js";
import { countActiveCategories } from "./categories.js";
import type { EntryListItem } from "./entries.js";
import type { TransferListItem } from "./transfers.js";
import {
  buildDashboardSummaryFromParts,
  computeMonthEntryTotalsInReportingCurrency,
  isOccurredInReportRange,
  resolveReportRange,
  type DashboardSummary,
  type ReportResult
} from "./reports.js";

export interface AppMutationPatch {
  accounts: AccountRow[];
  summary: DashboardSummary;
  /** Фоновый пересчёт отчёта/спарклайнов (месяц затронут). */
  syncReport?: boolean;
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
    syntheticReport as ReportResult,
    reportingCurrency
  );
}

export async function buildAccountsMutationPatch(
  userId: string,
  reportingCurrency: string
): Promise<AppMutationPatch> {
  const [accounts, categoriesCount] = await Promise.all([
    listAccounts(userId),
    countActiveCategories(userId)
  ]);

  const summary = await buildBalanceSummary(
    userId,
    reportingCurrency,
    accounts,
    categoriesCount
  );

  return { accounts, summary };
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

export async function buildTransferMutationPatch(
  userId: string,
  reportingCurrency: string
): Promise<AppMutationPatch> {
  const [accounts, categoriesCount] = await Promise.all([
    listAccounts(userId),
    countActiveCategories(userId)
  ]);

  const monthRange = resolveReportRange("month");
  const monthTotals = await computeMonthEntryTotalsInReportingCurrency(
    userId,
    reportingCurrency,
    monthRange.startDate,
    monthRange.endDate
  );

  const summary = await buildBalanceSummary(
    userId,
    reportingCurrency,
    accounts,
    categoriesCount,
    monthTotals
  );

  return { accounts, summary };
}
