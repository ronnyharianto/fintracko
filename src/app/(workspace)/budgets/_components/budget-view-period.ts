import { getDateRange, toISODate } from "@/lib/date-period";

/** The Budgets page browses one calendar month or one calendar year at a time. */
export type BudgetViewMode = "month" | "year";

/** Inclusive date range covered by the selected view period. */
export function getViewRange(
  mode: BudgetViewMode,
  refDate: Date,
): { from: string; to: string } {
  if (mode === "year") {
    const year = refDate.getFullYear();
    return {
      from: toISODate(new Date(year, 0, 1)),
      to: toISODate(new Date(year, 11, 31)),
    };
  }
  return getDateRange("month", refDate);
}

/** Period label, e.g. "September 2026" or "2026". */
export function formatViewLabel(mode: BudgetViewMode, refDate: Date): string {
  if (mode === "year") {
    return String(refDate.getFullYear());
  }
  return refDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/** Step the reference date by one month or one year. */
export function navigateView(
  mode: BudgetViewMode,
  refDate: Date,
  direction: -1 | 1,
): Date {
  const next = new Date(refDate);
  if (mode === "year") {
    next.setFullYear(next.getFullYear() + direction);
  } else {
    next.setMonth(next.getMonth() + direction);
  }
  return next;
}

/** Whether the selected period is the current month or year. */
export function isCurrentView(
  mode: BudgetViewMode,
  refDate: Date,
  now: Date = new Date(),
): boolean {
  if (mode === "year") {
    return refDate.getFullYear() === now.getFullYear();
  }
  return (
    refDate.getFullYear() === now.getFullYear() &&
    refDate.getMonth() === now.getMonth()
  );
}
