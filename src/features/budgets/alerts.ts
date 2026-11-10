/**
 * Budget threshold alerts.
 *
 * Thresholds and behavior live here so every surface classifies usage the same
 * way: the budget card, the category section header, the transaction budget
 * snapshot, the dashboard, and the alerts feed.
 *
 * Behavior:
 * - WARNING from 80% of the limit up to and including 100%
 * - EXCEEDED above 100%; spending exactly the limit is fully used, not over
 * - Only ACTIVE budgets alert, evaluated against one interval period
 * - Alerts are derived from live spend, never stored, so they clear on their
 *   own when usage drops, the period rolls over, or the budget changes
 *
 * Delivery-agnostic: `BudgetAlert` carries a stable `dedupeKey` plus the copy a
 * channel would send, so a future push or email worker can deliver the same
 * record without a redesign. Delivery bookkeeping (which alert was already
 * sent, or dismissed) belongs to that future channel, not to the evaluation.
 */

import { formatCurrency } from "@/lib/utils";
import type {
  BudgetAlert,
  BudgetAlertLevel,
  BudgetView,
} from "./types";

/**
 * Percentage-of-limit boundaries. `warning` is inclusive; `exceeded` is
 * exclusive, so a budget at exactly its limit is fully used rather than over.
 */
export const BUDGET_ALERT_THRESHOLDS = {
  warning: 80,
  exceeded: 100,
} as const;

/** Severity for a utilization percentage, or null when the budget is on track. */
export function alertLevelFor(utilization: number): BudgetAlertLevel | null {
  if (!Number.isFinite(utilization)) return null;
  if (utilization > BUDGET_ALERT_THRESHOLDS.exceeded) return "EXCEEDED";
  if (utilization >= BUDGET_ALERT_THRESHOLDS.warning) return "WARNING";
  return null;
}

/** Exceeded alerts sort before warnings. */
const LEVEL_RANK: Record<BudgetAlertLevel, number> = {
  EXCEEDED: 0,
  WARNING: 1,
};

/** The interval period as it reads in copy: "month" or "year". */
function periodNoun(interval: BudgetView["interval"]): string {
  return interval === "YEARLY" ? "year" : "month";
}

/**
 * Build the alerts for a set of budget views.
 *
 * Callers pass budgets already resolved to their current period. Amounts are
 * formatted for the notification copy only; the decimal strings are carried
 * alongside so a channel never has to parse the copy back into money.
 */
export function buildBudgetAlerts(
  budgets: readonly BudgetView[],
): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];

  for (const budget of budgets) {
    if (budget.status !== "ACTIVE") continue;

    const level = alertLevelFor(budget.utilization);
    if (!level) continue;

    const noun = periodNoun(budget.interval);
    const percent = Math.round(budget.utilization);

    alerts.push({
      dedupeKey: `${budget.id}:${budget.periodStart}:${level}`,
      level,
      budgetId: budget.id,
      subCategoryName: budget.subCategoryName,
      categoryName: budget.categoryName,
      interval: budget.interval,
      periodStart: budget.periodStart,
      periodEnd: budget.periodEnd,
      spent: budget.spent,
      limit: budget.limit,
      utilization: budget.utilization,
      title:
        level === "EXCEEDED"
          ? `${budget.subCategoryName} is over budget`
          : `${budget.subCategoryName} is nearing its limit`,
      body: `Spent ${formatCurrency(Number(budget.spent))} of ${formatCurrency(
        Number(budget.limit),
      )} for this ${noun} (${percent}% used).`,
      actionHref: "/budgets",
    });
  }

  return alerts.sort(
    (a, b) =>
      LEVEL_RANK[a.level] - LEVEL_RANK[b.level] ||
      b.utilization - a.utilization ||
      a.subCategoryName.localeCompare(b.subCategoryName),
  );
}
