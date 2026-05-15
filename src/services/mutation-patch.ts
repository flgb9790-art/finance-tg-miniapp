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
  workspaceId: string,
  reportingCurrency: string,
  accounts: AccountRow[],
  categoriesCount: number,
  monthReport?: Awaited<ReturnType<typeof computeMonthEntryTotalsInReportingCurrency>>
): Promise<DashboardSummary> {
  const monthRange = resolveReportRange("month");
  const monthTotals =
    monthReport ??
    (await computeMonthEntryTotalsInReportingCurrency(
      workspaceId,
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

export async function buildBalancesOnlyMutationPatch(
  workspaceId: string,
  reportingCurrency: string
): Promise<AppMutationPatch> {
  const [accounts, categoriesCount] = await Promise.all([
    listAccounts(workspaceId),
    countActiveCategories(workspaceId)
  ]);

  return {
    accounts,
    summary: await buildBalancesSummaryPartial(accounts, categoriesCount, reportingCurrency)
  };
}

export async function buildAccountsMutationPatch(
  workspaceId: string,
  reportingCurrency: string
): Promise<AppMutationPatch> {
  return buildBalancesOnlyMutationPatch(workspaceId, reportingCurrency);
}

export async function buildTransferMutationPatch(
  workspaceId: string,
  reportingCurrency: string
): Promise<AppMutationPatch> {
  return buildBalancesOnlyMutationPatch(workspaceId, reportingCurrency);
}

export async function buildCategoriesMutationPatch(
  workspaceId: string,
  reportingCurrency: string
): Promise<AppMutationPatch> {
  const [categories, accounts, categoriesCount] = await Promise.all([
    listCategories(workspaceId),
    listAccounts(workspaceId),
    countActiveCategories(workspaceId)
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
  workspaceId: string,
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
    listAccounts(workspaceId),
    countActiveCategories(workspaceId)
  ]);

  const monthTotals = inMonth
    ? await computeMonthEntryTotalsInReportingCurrency(
        workspaceId,
        reportingCurrency,
        monthRange.startDate,
        monthRange.endDate
      )
    : undefined;

  const summary = await buildBalanceSummary(
    workspaceId,
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
