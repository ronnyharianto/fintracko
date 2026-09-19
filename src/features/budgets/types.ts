/**
 * Shared budget domain types.
 *
 * Client-safe: contains type definitions only, no server-only imports.
 */

import type { BudgetInterval } from "../../../generated/prisma/enums";

export type { BudgetInterval };

/** Lifecycle position of a budget relative to today. */
export type BudgetStatus = "ACTIVE" | "UPCOMING" | "ENDED";

/** Budget view returned by GET /api/v1/workspaces/[workspaceId]/budgets. */
export interface BudgetView {
  id: string;
  subCategoryId: string;
  subCategoryName: string;
  /** Parent category of the subcategory. */
  categoryId: string;
  categoryName: string;
  /** Configured spending limit, as a decimal string. */
  amount: string;
  interval: BudgetInterval;
  /** Inclusive period start, `YYYY-MM-DD`. */
  startDate: string;
  /** Inclusive period end, `YYYY-MM-DD`. */
  endDate: string;
  /** Net expense total within the period, as a decimal string. */
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
  total: number;
}
