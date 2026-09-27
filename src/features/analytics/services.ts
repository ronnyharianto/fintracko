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
  AnalyticsSlice,
  AnalyticsSummary,
  AnalyticsTrendPoint,
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
 * Distribution by parent category for a transaction type and window.
 *
 * Prisma cannot group by a relation field, so amounts are summed per
 * subcategory and rolled up to their parent category in JS. Transactions are
 * included regardless of archive state: the breakdown reports what actually
 * happened, including history on since-archived categories.
 *
 * A category or subcategory whose net is zero or negative (fully refunded) is
 * omitted, since a negative share cannot be drawn. `total` is the sum of the
 * level-1 slices, so the shares always add up to the drawn ring.
 */
export async function getCategoryBreakdown(
  userId: string,
  workspaceId: string,
  type: TransactionType,
  window: { from: string; to: string },
): Promise<{ categories: AnalyticsSlice[]; total: string }> {
  await requireMembership(userId, workspaceId);

  const grouped = await db.financialTransaction.groupBy({
    by: ["subCategoryId"],
    where: {
      workspaceId,
      type,
      date: { gte: new Date(window.from), lte: new Date(window.to) },
    },
    _sum: { amount: true },
  });

  if (grouped.length === 0) return { categories: [], total: "0" };

  const subCategories = await db.subCategory.findMany({
    where: {
      id: { in: grouped.map((row) => row.subCategoryId) },
      workspaceId,
    },
    select: {
      id: true,
      name: true,
      categoryId: true,
      category: { select: { name: true } },
    },
  });

  const subCategoryById = new Map(subCategories.map((row) => [row.id, row]));

  // Roll subcategory sums up to their parent, keeping both levels so the page
  // can drill into a category without another request.
  const categoryNames = new Map<string, string>();
  const categoryTotals = new Map<string, DecimalLike>();
  const subCategoryTotals = new Map<
    string,
    { categoryId: string; name: string; amount: DecimalLike }
  >();

  for (const row of grouped) {
    const subCategory = subCategoryById.get(row.subCategoryId);
    const amount = row._sum.amount;
    if (!subCategory || !amount) continue;

    categoryNames.set(subCategory.categoryId, subCategory.category.name);
    const categoryExisting = categoryTotals.get(subCategory.categoryId);
    categoryTotals.set(
      subCategory.categoryId,
      categoryExisting ? categoryExisting.add(amount) : amount,
    );

    const subExisting = subCategoryTotals.get(subCategory.id);
    subCategoryTotals.set(subCategory.id, {
      categoryId: subCategory.categoryId,
      name: subCategory.name,
      amount: subExisting ? subExisting.amount.add(amount) : amount,
    });
  }

  const positiveCategories = [...categoryTotals.entries()].filter(
    ([, amount]) => Number(amount.toString()) > 0,
  );
  if (positiveCategories.length === 0) return { categories: [], total: "0" };

  // Seed with the first amount minus itself: a Decimal zero without needing a
  // runtime constructor.
  const total = positiveCategories.reduce(
    (sum, [, amount]) => sum.add(amount),
    positiveCategories[0][1].sub(positiveCategories[0][1]),
  );

  const categories: AnalyticsSlice[] = positiveCategories
    .map(([categoryId, amount]) => {
      const subCategories = [...subCategoryTotals.entries()]
        .filter(
          ([, sub]) =>
            sub.categoryId === categoryId && Number(sub.amount.toString()) > 0,
        )
        .map(([subCategoryId, sub]) => ({
          id: subCategoryId,
          name: sub.name,
          amount: sub.amount.toString(),
          share: Number(sub.amount.div(amount).mul(100).toString()),
          subCategories: [],
        }))
        .sort((a, b) => Number(b.amount) - Number(a.amount));

      return {
        id: categoryId,
        name: categoryNames.get(categoryId) ?? "Unknown",
        amount: amount.toString(),
        share: Number(amount.div(total).mul(100).toString()),
        subCategories,
      };
    })
    .sort((a, b) => Number(b.amount) - Number(a.amount));

  return { categories, total: total.toString() };
}

/** Expense distribution by parent category in the dashboard's slice shape. */
export async function getExpenseBreakdown(
  userId: string,
  workspaceId: string,
  window: { from: string; to: string },
): Promise<ExpenseBreakdownSlice[]> {
  const { categories } = await getCategoryBreakdown(
    userId,
    workspaceId,
    TransactionType.EXPENSE,
    window,
  );

  return categories.map((category) => ({
    categoryId: category.id,
    categoryName: category.name,
    amount: category.amount,
    share: category.share,
  }));
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

/**
 * Monthly totals for a transaction type over the trailing `months` window,
 * oldest first. Prisma cannot group by month without raw SQL, so the window's
 * rows are bucketed in JS with Decimal arithmetic.
 */
export async function getTypeTrend(
  userId: string,
  workspaceId: string,
  type: TransactionType,
  months: number = TREND_MONTHS,
): Promise<AnalyticsTrendPoint[]> {
  await requireMembership(userId, workspaceId);

  const now = new Date();
  const monthStarts: Date[] = [];
  for (let i = months - 1; i >= 0; i--) {
    monthStarts.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  }

  const windowFrom = toISODate(monthStarts[0]);
  const windowTo = toISODate(now);

  const transactions = await db.financialTransaction.findMany({
    where: {
      workspaceId,
      type,
      date: { gte: new Date(windowFrom), lte: new Date(windowTo) },
    },
    select: { amount: true, date: true },
  });

  const totalsByMonth = new Map<string, DecimalLike>();
  for (const transaction of transactions) {
    const key = transaction.date.toISOString().slice(0, 7);
    const existing = totalsByMonth.get(key);
    totalsByMonth.set(
      key,
      existing ? existing.add(transaction.amount) : transaction.amount,
    );
  }

  return monthStarts.map((monthStart) => {
    const month = toISODate(monthStart).slice(0, 7);
    const amount = totalsByMonth.get(month);
    return {
      month,
      label: monthStart.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
      axisLabel: monthStart.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      amount: amount ? amount.toString() : "0",
    };
  });
}

/** Compose the analytics page payload for one type and window. */
export async function getAnalyticsSummary(
  userId: string,
  workspaceId: string,
  input: { type: TransactionType; from: string; to: string },
): Promise<AnalyticsSummary> {
  await requireMembership(userId, workspaceId);

  const [{ categories, total }, trend] = await Promise.all([
    getCategoryBreakdown(userId, workspaceId, input.type, {
      from: input.from,
      to: input.to,
    }),
    getTypeTrend(userId, workspaceId, input.type, TREND_MONTHS),
  ]);

  return {
    type: input.type,
    from: input.from,
    to: input.to,
    total,
    categories,
    trend,
  };
}
