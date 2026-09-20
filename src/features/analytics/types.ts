/**
 * Shared dashboard analytics domain types.
 *
 * Client-safe: type definitions only, no server-only imports.
 */

import type { BudgetView } from "@/features/budgets/types";

/**
 * One Level 1 (parent category) slice of the expense breakdown for the current
 * calendar month.
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
}
