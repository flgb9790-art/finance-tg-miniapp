import type { AccountRow } from "./accounts.js";
import { listAccounts } from "./accounts.js";
import { countActiveCategories, listCategories, type CategoryRow } from "./categories.js";
import type { EntryListItem } from "./entries.js";
import {
  computeEntryMonthSummaryDelta,
  computeMonthEntryTotalsInReportingCurrency,
  isOccurredInReportRange,
  resolveReportRange,
  sumAccountsBalanceInReportingCurrency,
  type DashboardSummary,
  type SummaryMonthDelta
} from "./reports.js";

export interface AppMutationPatch {
  accounts?: AccountRow[];
  categories?: CategoryRow[];
  summary?: (Partial<DashboardSummary> & { summaryMonthDelta?: SummaryMonthDelta }) | DashboardSummary;
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

export async function buildBalancesOnlyMutationPatch(
  workspaceId: string,
  reportingCurrency: string
): Promise<AppMutationPatch> {
  const accounts = await listAccounts(workspaceId);

  try {
    const categoriesCount = await countActiveCategories(workspaceId);

    return {
      accounts,
      summary: await buildBalancesSummaryPartial(accounts, categoriesCount, reportingCurrency)
    };
  } catch (error) {
    console.error("buildBalancesOnlyMutationPatch failed, returning accounts only", error);
    return { accounts };
  }
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
  try {
    return await buildBalancesOnlyMutationPatch(workspaceId, reportingCurrency);
  } catch (error) {
    console.error("buildTransferMutationPatch failed, returning accounts only", error);
    return { accounts: await listAccounts(workspaceId) };
  }
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

async function buildLedgerMutationSummary(
  workspaceId: string,
  reportingCurrency: string,
  accounts: AccountRow[],
  categoriesCount: number,
  entryOccurredAt?: string | null,
  monthEntryPatch?: { entry: EntryListItem; sign: 1 | -1 }
): Promise<{ summary: AppMutationPatch["summary"]; syncHomeChrome: boolean }> {
  const summaryBase = await buildBalancesSummaryPartial(
    accounts,
    categoriesCount,
    reportingCurrency
  );

  const monthRange = resolveReportRange("month");
  const inMonth = entryOccurredAt
    ? isOccurredInReportRange(entryOccurredAt, monthRange.startDate, monthRange.endDate)
    : false;

  if (!inMonth) {
    return {
      summary: summaryBase,
      syncHomeChrome: false
    };
  }

  if (monthEntryPatch) {
    try {
      const raw = await computeEntryMonthSummaryDelta(
        monthEntryPatch.entry,
        reportingCurrency
      );
      const sign = monthEntryPatch.sign;
      const summaryMonthDelta: SummaryMonthDelta = {
        monthlyIncomeDelta: Number((sign * raw.monthlyIncomeDelta).toFixed(2)),
        monthlyExpenseDelta: Number((sign * raw.monthlyExpenseDelta).toFixed(2)),
        monthlyNetDelta: Number((sign * raw.monthlyNetDelta).toFixed(2)),
        expenseCategoryName: raw.expenseCategoryName,
        expenseCategoryDelta: Number((sign * raw.expenseCategoryDelta).toFixed(2))
      };

      return {
        summary: {
          ...summaryBase,
          summaryMonthDelta
        },
        syncHomeChrome: true
      };
    } catch (error) {
      console.error(
        "incremental month summary delta failed, falling back to full month scan",
        error
      );
    }
  }

  const monthTotals = await computeMonthEntryTotalsInReportingCurrency(
    workspaceId,
    reportingCurrency,
    monthRange.startDate,
    monthRange.endDate
  );

  return {
    summary: {
      ...summaryBase,
      monthlyIncome: monthTotals.incomes,
      monthlyExpense: monthTotals.expenses,
      monthlyNet: monthTotals.net,
      monthlyExpenseByCategory: monthTotals.expenseByCategory,
      ratesUpdatedAt: monthTotals.ratesUpdatedAt ?? summaryBase.ratesUpdatedAt ?? null
    } as DashboardSummary,
    syncHomeChrome: true
  };
}

export async function buildLedgerMutationPatch(
  workspaceId: string,
  reportingCurrency: string,
  entryOccurredAt?: string | null,
  options?: { monthEntry?: EntryListItem }
): Promise<AppMutationPatch> {
  try {
    const [accounts, categoriesCount] = await Promise.all([
      listAccounts(workspaceId),
      countActiveCategories(workspaceId)
    ]);

    const monthEntryPatch =
      options?.monthEntry !== undefined
        ? { entry: options.monthEntry, sign: -1 as const }
        : undefined;

    const { summary, syncHomeChrome } = await buildLedgerMutationSummary(
      workspaceId,
      reportingCurrency,
      accounts,
      categoriesCount,
      entryOccurredAt,
      monthEntryPatch
    );

    return {
      accounts,
      summary,
      syncReport: syncHomeChrome
    };
  } catch (error) {
    console.error("buildLedgerMutationPatch failed, using balances-only patch", error);
    return buildBalancesOnlyMutationPatch(workspaceId, reportingCurrency);
  }
}

export async function buildEntryMutationPatch(
  workspaceId: string,
  reportingCurrency: string,
  entry: EntryListItem,
  options?: { monthPatchSign?: 1 | -1; balancesOnly?: boolean }
): Promise<AppMutationPatch> {
  if (options?.balancesOnly) {
    return buildBalancesOnlyMutationPatch(workspaceId, reportingCurrency);
  }

  try {
    const [accounts, categoriesCount] = await Promise.all([
      listAccounts(workspaceId),
      countActiveCategories(workspaceId)
    ]);

    const monthEntryPatch =
      options?.monthPatchSign !== undefined
        ? { entry, sign: options.monthPatchSign }
        : undefined;

    const { summary, syncHomeChrome } = await buildLedgerMutationSummary(
      workspaceId,
      reportingCurrency,
      accounts,
      categoriesCount,
      entry.occurred_at,
      monthEntryPatch
    );

    return {
      accounts,
      summary,
      syncReport: syncHomeChrome
    };
  } catch (error) {
    console.error("buildEntryMutationPatch failed, using balances-only patch", error);
    return buildBalancesOnlyMutationPatch(workspaceId, reportingCurrency);
  }
}
