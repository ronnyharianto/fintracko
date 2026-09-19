import type { BudgetInterval } from "@/features/budgets/types";
import { periodBounds } from "@/features/budgets/utilization";

/** The period picker holds `YYYY-MM` for monthly and `YYYY` for yearly. */
export function defaultPeriodValue(interval: BudgetInterval, from?: Date): string {
  const date = from ?? new Date();
  if (interval === "YEARLY") {
    return String(date.getFullYear());
  }
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

/** Derive aligned start/end dates from an interval and picker value. */
export function deriveBounds(
  interval: BudgetInterval,
  periodValue: string,
): { startDate: string; endDate: string } | null {
  if (interval === "MONTHLY") {
    const [year, month] = periodValue.split("-").map(Number);
    if (!year || !month || month < 1 || month > 12) return null;
    return periodBounds("MONTHLY", new Date(year, month - 1, 1));
  }

  const year = Number(periodValue);
  if (!Number.isInteger(year) || year < 1900 || year > 9999) return null;
  return periodBounds("YEARLY", new Date(year, 0, 1));
}
