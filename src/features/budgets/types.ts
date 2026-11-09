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

/** Severity of a budget threshold alert. */
export type BudgetAlertLevel = "WARNING" | "EXCEEDED";

/**
 * A budget threshold notification, independent of how it is delivered.
 *
 * The record carries everything a delivery channel needs (stable identity,
 * severity, copy, destination) and nothing that belongs to a particular
 * surface, so the in-app panel and a future push or email worker can consume
 * the same evaluation without reshaping it.
 */
export interface BudgetAlert {
  /**
   * Stable identity of one alert in one period, `budget:periodStart:level`.
   * An escalation from WARNING to EXCEEDED changes the key, so the stricter
   * level is a new notification rather than a suppressed duplicate.
   */
  dedupeKey: string;
  level: BudgetAlertLevel;
  budgetId: string;
  subCategoryName: string;
  categoryName: string;
  interval: BudgetInterval;
  /** First day of the period the alert measures, `YYYY-MM-DD`. */
  periodStart: string;
  /** Last day of that period, `YYYY-MM-DD`. */
  periodEnd: string;
  /** Net expense total for the period, as a decimal string. */
  spent: string;
  /** Period limit the spend is measured against, as a decimal string. */
  limit: string;
  /** Percentage of the limit used (may exceed 100). Presentation only. */
  utilization: number;
  /** Short heading suitable for a notification title. */
  title: string;
  /** One-sentence description of the state. */
  body: string;
  /** In-app destination for the alert. */
  actionHref: string;
}

/** Response shape from the budget alerts endpoint. */
export interface BudgetAlertListResponse {
  alerts: BudgetAlert[];
  /** Number of alerts returned. */
  total: number;
}
