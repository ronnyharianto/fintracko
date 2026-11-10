/**
 * Shared dashboard analytics domain types.
 *
 * Client-safe: type definitions only, no server-only imports.
 */

import type { BudgetAlert, BudgetView } from "@/features/budgets/types";
import type { TransactionType } from "@/features/transactions/types";

export type { TransactionType };

/**
 * Bucket size of the analytics trend, chosen from the selected date range:
 * daily for short ranges, weekly for medium ranges, monthly for long ones.
 */
export type AnalyticsGranularity = "day" | "week" | "month";

/**
 * One Level 1 (parent category) slice of the expense breakdown for a summary
 * window.
 */
export interface ExpenseBreakdownSlice {
  categoryId: string;
  categoryName: string;
  /** Net expense total for the category, as a decimal string. */
  amount: string;
  /**
   * Share of the month's total expenses, in percent. Presentation only, so it
   * is a plain number rather than a decimal string.
   */
  share: number;
}

/** Aggregated net balance (sum of all account final balances) at a month end. */
export interface BalanceTrendPoint {
  /** Year-month key, `YYYY-MM`. */
  month: string;
  /** Full display label, e.g. `"Apr 2026"`. Used in tooltips and summaries. */
  label: string;
  /** Short axis label, e.g. `"Apr 26"`, to keep chart ticks compact. */
  axisLabel: string;
  /** Aggregated balance at that point, as a decimal string. */
  balance: string;
  /**
   * True for the current month's point, which is the live running balance
   * rather than a reconstructed month-end value.
   */
  isCurrent: boolean;
}

/** One drill-down level of the analytics breakdown. */
export interface AnalyticsSlice {
  /** Category (level 1) or subcategory (level 2) id, depending on the level. */
  id: string;
  name: string;
  /** Net total for the slice, as a decimal string. */
  amount: string;
  /** Share of the level's total, in percent. Presentation only. */
  share: number;
  /** Subcategory breakdown, present only on level-1 slices. */
  subCategories: AnalyticsSlice[];
}

/** One bucket of the analytics trend for the selected transaction type. */
export interface AnalyticsTrendPoint {
  /**
   * Bucket key: `YYYY-MM-DD` for daily and weekly buckets, `YYYY-MM` for
   * monthly buckets.
   */
  bucket: string;
  /** Full display label, e.g. `"Apr 2026"` or `"Week of Apr 6, 2026"`. */
  label: string;
  /** Short axis label, e.g. `"Apr 26"`, to keep chart ticks compact. */
  axisLabel: string;
  /** Net total for the bucket, as a decimal string. */
  amount: string;
}

/** Payload returned by GET /api/v1/workspaces/[id]/analytics/summary. */
export interface AnalyticsSummary {
  type: TransactionType;
  from: string;
  to: string;
  /** Bucket size used by `trend`, chosen from the selected range. */
  granularity: AnalyticsGranularity;
  /** Sum of the level-1 slice amounts, as a decimal string. */
  total: string;
  /** Ranked level-1 slices, largest first, each carrying its subcategories. */
  categories: AnalyticsSlice[];
  /** Buckets covering `from` to `to`, oldest first. */
  trend: AnalyticsTrendPoint[];
}

/** Full payload returned by GET /api/v1/workspaces/[id]/dashboard/summary. */
export interface DashboardSummary {
  /** Monthly budgets closest to exhaustion this month, best first. */
  topMonthly: BudgetView[];
  /** Yearly budgets closest to exhaustion this year, best first. */
  topYearly: BudgetView[];
  /** Expense distribution by parent category for the current month. */
  expenseBreakdown: ExpenseBreakdownSlice[];
  /** Aggregated net balance at each month end, oldest first. */
  balanceTrend: BalanceTrendPoint[];
  /** Budgets at or past their alert threshold in the current period. */
  budgetAlerts: BudgetAlert[];
}
