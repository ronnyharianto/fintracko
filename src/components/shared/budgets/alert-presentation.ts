/**
 * Presentation mapping for budget alert severities.
 *
 * Kept out of `@/features/budgets/alerts` so the domain module stays free of
 * Tailwind classes, and shared so the budget cards, section headers, dashboard
 * rows, and alert panel cannot drift apart.
 */

import type { BudgetAlertLevel } from "@/features/budgets/types";
import type { BadgeVariant } from "@/components/ui/badge";

/** Badge copy. Text, not color, states the severity. */
export const BUDGET_ALERT_LABEL: Record<BudgetAlertLevel, string> = {
  WARNING: "Nearing limit",
  EXCEEDED: "Over limit",
};

/** Badge treatment matching each severity. */
export const BUDGET_ALERT_BADGE_VARIANT: Record<
  BudgetAlertLevel,
  BadgeVariant
> = {
  WARNING: "warning",
  EXCEEDED: "danger",
};

/** Utilization bar fill; emerald when the budget is on track. */
export function budgetBarClass(level: BudgetAlertLevel | null): string {
  if (level === "EXCEEDED") return "bg-red-500";
  if (level === "WARNING") return "bg-amber-500";
  return "bg-emerald-500";
}
