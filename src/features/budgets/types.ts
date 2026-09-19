/**
 * Shared budget domain types.
 *
 * Client-safe: contains type definitions only, no server-only imports.
 */

import type { BudgetInterval } from "../../../generated/prisma/enums";

export type { BudgetInterval };

/** Lifecycle position of a budget relative to today. */
export type BudgetStatus = "ACTIVE" | "UPCOMING" | "ENDED";

/**
 * Budget view returned by GET /api/v1/workspaces/[workspaceId]/budgets.
 *
 * A budget is a range of aligned periods, so `amount` is the per-period limit
 * while `limit` is what the current view is actually measured against
 * (`amount x periods`).
 */
export interface BudgetView {
  id: string;
  subCategoryId: string;
  subCategoryName: string;
  /** Parent category of the subcategory. */
  categoryId: string;
  categoryName: string;
  /** Configured limit for a single period, as a decimal string. */
  amount: string;
  /** Aligned periods the current view covers. */
  periods: number;
  /** `amount x periods`, as a decimal string. */
  limit: string;
  interval: BudgetInterval;
  /** First day of the budget's range, `YYYY-MM-DD`. */
  startDate: string;
  /** Last day of the budget's range, `YYYY-MM-DD`; `9999-12-31` when open-ended. */
  endDate: string;
  /**
   * First day of the resolved periods for the current view, `YYYY-MM-DD`. This
   * is the row range clipped to the view, so it is always finite even for an
   * open-ended budget.
   */
  periodStart: string;
  /** Last day of the resolved periods for the current view, `YYYY-MM-DD`. */
  periodEnd: string;
  /** Net expense total across the resolved periods, as a decimal string. */
  spent: string;
  /** Percentage of the limit used (may exceed 100). Presentation only. */
  utilization: number;
  status: BudgetStatus;
  createdAt: string;
  updatedAt: string;
}

/** Form data for creating a budget. */
export interface BudgetFormData {
  subCategoryId: string;
  amount: number;
  interval: BudgetInterval;
  startDate: string;
  endDate: string;
}

/** Response shape from the budgets list endpoint. */
export interface BudgetListResponse {
  budgets: BudgetView[];
  /** Budgets returned for the requested window. */
  total: number;
  /** Every budget in the workspace, regardless of the window. */
  totalInWorkspace: number;
}
