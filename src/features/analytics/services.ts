/**
 * Dashboard analytics service layer.
 *
 * Compiles the four PRD §3.6 insights from existing data:
 *   1. Top 5 monthly budgets closest to exhaustion this month
 *   2. Top 5 yearly budgets closest to exhaustion this year
 *   3. Expense breakdown by Level 1 (parent) category for this month
 *   4. Aggregated net balance at each month end over a rolling window
 *
 * All reads enforce workspace membership through `requireMembership`. Budget
 * lists reuse `getBudgets`, so their per-period limit/spend resolution cannot
 * drift from the budgets page. Money is aggregated with Decimal arithmetic;
 * only presentation-only percentages become plain numbers.
 */

import { db } from "@/lib/db";
import { findWorkspaceMembership } from "@/lib/auth/membership";
import { getBudgets } from "@/features/budgets/services";
import type { BudgetView } from "@/features/budgets/types";
import { getDateRange, toISODate } from "@/lib/date-period";
import {
  BudgetInterval,
  TransactionType,
} from "../../../generated/prisma/enums";
import { AnalyticsServiceError } from "./errors";
import type {
  BalanceTrendPoint,
  DashboardSummary,
  ExpenseBreakdownSlice,
} from "./types";

/** Number of month-end points in the balance trend, including the current month. */
const TREND_MONTHS = 6;

/** Number of budgets each Top 5 list returns. */
const TOP_BUDGETS_LIMIT = 5;

/**
 * Minimal structural view of Prisma's Decimal so the service can do exact
 * decimal math without importing the generated runtime.
 */
interface DecimalLike {
  toString(): string;
  add(value: DecimalLike | string | number): DecimalLike;
  sub(value: DecimalLike | string | number): DecimalLike;
  mul(value: DecimalLike | string | number): DecimalLike;
  div(value: DecimalLike | string | number): DecimalLike;
}

/** Verify the user is a member of the workspace, or throw FORBIDDEN. */
async function requireMembership(userId: string, workspaceId: string) {
  const membership = await findWorkspaceMembership(userId, workspaceId);
  if (!membership) {
    throw new AnalyticsServiceError(
      "FORBIDDEN",
      "You are not a member of this workspace",
    );
  }
  return membership;
}

/**
 * Order budgets by how close they are to exhaustion: utilization descending,
 * ties broken by the larger absolute spend, then alphabetically by
 * subcategory name so the order is stable.
 */
function rankBudgets(budgets: BudgetView[]): BudgetView[] {
  return [...budgets]
    .sort(
      (a, b) =>
        b.utilization - a.utilization ||
        Number(b.spent) - Number(a.spent) ||
        a.subCategoryName.localeCompare(b.subCategoryName),
    )
    .slice(0, TOP_BUDGETS_LIMIT);
}

/**
 * The Top 5 budgets of an interval closest to exhaustion within a window.
 * The window is always the current month or year, so a recurring budget is
 * measured on the single period in view.
 */
export async function getTopBudgets(
  userId: string,
  workspaceId: string,
  interval: BudgetInterval,
  window: { from: string; to: string },
): Promise<BudgetView[]> {
  const { budgets } = await getBudgets(userId, workspaceId, {
    from: window.from,
    to: window.to,
    interval,
  });
  return rankBudgets(budgets);
}

/**
 * Expense distribution by parent category for a window.
 *
 * Prisma cannot group by a relation field, so expenses are summed per
 * subcategory and rolled up to their parent category in JS. Transactions are
 * included regardless of archive state: the breakdown reports what was actually
 * spent, including history on since-archived categories.
 */
export async function getExpenseBreakdown(
  userId: string,
  workspaceId: string,
  window: { from: string; to: string },
): Promise<ExpenseBreakdownSlice[]> {
  await requireMembership(userId, workspaceId);

  const grouped = await db.financialTransaction.groupBy({
    by: ["subCategoryId"],
    where: {
      workspaceId,
      type: TransactionType.EXPENSE,
      date: { gte: new Date(window.from), lte: new Date(window.to) },
    },
    _sum: { amount: true },
  });

  if (grouped.length === 0) return [];

  const subCategories = await db.subCategory.findMany({
    where: {
      id: { in: grouped.map((row) => row.subCategoryId) },
      workspaceId,
    },
    select: {
      id: true,
      categoryId: true,
      category: { select: { name: true } },
    },
  });

  const subCategoryById = new Map(
    subCategories.map((row) => [row.id, row]),
  );

  const totals = new Map<string, DecimalLike>();
  const names = new Map<string, string>();

  for (const row of grouped) {
    const subCategory = subCategoryById.get(row.subCategoryId);
    const amount = row._sum.amount;
    if (!subCategory || !amount) continue;

    names.set(subCategory.categoryId, subCategory.category.name);
    const existing = totals.get(subCategory.categoryId);
    totals.set(
      subCategory.categoryId,
      existing ? existing.add(amount) : amount,
    );
  }

  // A category whose net is zero or negative (fully refunded) is omitted.
  const positive = [...totals.entries()].filter(
    ([, amount]) => Number(amount.toString()) > 0,
  );
  if (positive.length === 0) return [];

  let total = positive[0][1];
  for (let i = 1; i < positive.length; i++) {
    total = total.add(positive[i][1]);
  }

  return positive
    .map(([categoryId, amount]) => ({
      categoryId,
      categoryName: names.get(categoryId) ?? "Unknown",
      amount: amount.toString(),
      share: Number(amount.div(total).mul(100).toString()),
    }))
    .sort((a, b) => Number(b.amount) - Number(a.amount));
}

/**
 * The aggregate net balance at each month end over `months` months, oldest
 * first. Month-end balances are not stored, so each point is reconstructed as
 * `currentTotal - sum(net effects dated after that month end)`.
 *
 * Only non-archived accounts contribute to the total, so a transaction only
 * affects the reconstruction for the accounts it touches that are still in the
 * total. The current month's point is the live running balance.
 */
export async function getBalanceTrend(
  userId: string,
  workspaceId: string,
  months: number = TREND_MONTHS,
): Promise<BalanceTrendPoint[]> {
  await requireMembership(userId, workspaceId);

  const now = new Date();
  const monthStarts: Date[] = [];
  for (let i = months - 1; i >= 0; i--) {
    monthStarts.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  }

  const windowFrom = toISODate(monthStarts[0]);
  const windowTo = toISODate(now);

  const accounts = await db.financialAccount.findMany({
    where: { workspaceId, isArchived: false },
    select: { id: true, initialBalance: true, netTransactionSum: true },
  });

  // No accounts means there is no balance to trend; the page shows its empty
  // state rather than plotting a flat zero line.
  if (accounts.length === 0) return [];

  let currentTotal: DecimalLike = accounts[0].initialBalance.add(
    accounts[0].netTransactionSum,
  );
  for (let i = 1; i < accounts.length; i++) {
    currentTotal = currentTotal
      .add(accounts[i].initialBalance)
      .add(accounts[i].netTransactionSum);
  }

  const accountIds = new Set(accounts.map((account) => account.id));

  const transactions = await db.financialTransaction.findMany({
    where: {
      workspaceId,
      date: { gte: new Date(windowFrom), lte: new Date(windowTo) },
    },
    select: {
      type: true,
      amount: true,
      date: true,
      sourceAccountId: true,
      destinationAccountId: true,
    },
  });

  // Net effect of each transaction on the aggregate balance, applying the same
  // direction rule as `balanceEffect` in the transactions service but only for
  // accounts still counted in the total.
  const effects = transactions.map((transaction) => {
    const amount = transaction.amount;
    const zero = amount.sub(amount);
    const sourceCounted = transaction.sourceAccountId
      ? accountIds.has(transaction.sourceAccountId)
      : false;
    const destinationCounted = transaction.destinationAccountId
      ? accountIds.has(transaction.destinationAccountId)
      : false;

    let net: DecimalLike;
    if (transaction.type === TransactionType.INCOME) {
      net = destinationCounted ? amount : zero;
    } else if (transaction.type === TransactionType.EXPENSE) {
      net = sourceCounted ? amount.mul(-1) : zero;
    } else {
      // TRANSFER moves value between accounts, so its aggregate effect is zero
      // unless only one side is still counted.
      net = (sourceCounted ? amount.mul(-1) : zero).add(
        destinationCounted ? amount : zero,
      );
    }

    return { date: transaction.date.toISOString().slice(0, 10), net };
  });

  return monthStarts.map((monthStart, index) => {
    const monthEnd = getDateRange("month", monthStart).to;
    let balance = currentTotal;
    for (const effect of effects) {
      if (effect.date > monthEnd) balance = balance.sub(effect.net);
    }

    return {
      month: toISODate(monthStart).slice(0, 7),
      label: monthStart.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
      axisLabel: monthStart.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      balance: balance.toString(),
      isCurrent: index === monthStarts.length - 1,
    };
  });
}

/** Compose all four dashboard sections for the current month/year windows. */
export async function getDashboardSummary(
  userId: string,
  workspaceId: string,
): Promise<DashboardSummary> {
  await requireMembership(userId, workspaceId);

  const now = new Date();
  const month = getDateRange("month", now);
  const year = {
    from: toISODate(new Date(now.getFullYear(), 0, 1)),
    to: toISODate(new Date(now.getFullYear(), 11, 31)),
  };

  const [topMonthly, topYearly, expenseBreakdown, balanceTrend] =
    await Promise.all([
      getTopBudgets(userId, workspaceId, BudgetInterval.MONTHLY, month),
      getTopBudgets(userId, workspaceId, BudgetInterval.YEARLY, year),
      getExpenseBreakdown(userId, workspaceId, month),
      getBalanceTrend(userId, workspaceId, TREND_MONTHS),
    ]);

  return { topMonthly, topYearly, expenseBreakdown, balanceTrend };
}
