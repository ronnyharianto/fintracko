/**
 * Pure period and utilization helpers for budgets.
 *
 * These functions contain no database or request access so they can be reused
 * by the Zod schemas, the service layer, and the client form alike.
 */

import type { BudgetInterval } from "../../../generated/prisma/enums";
import { parseDate, toISODate } from "@/lib/date-period";
import type { BudgetStatus } from "./types";

/** Last calendar day (as a day number) for a zero-based month index. */
function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * A monthly budget must span exactly one calendar month: start on the 1st and
 * end on the last day of that same month.
 *
 * A yearly budget must span exactly one calendar year: start Jan 1, end Dec 31.
 */
export function isPeriodAligned(
  interval: BudgetInterval,
  startDate: string,
  endDate: string,
): boolean {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return false;
  }
  if (endDate < startDate) {
    return false;
  }

  if (interval === "MONTHLY") {
    const sameMonth =
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth();
    return (
      sameMonth &&
      start.getDate() === 1 &&
      end.getDate() === lastDayOfMonth(end.getFullYear(), end.getMonth())
    );
  }

  // YEARLY
  return (
    start.getMonth() === 0 &&
    start.getDate() === 1 &&
    end.getMonth() === 11 &&
    end.getDate() === 31 &&
    start.getFullYear() === end.getFullYear()
  );
}

/**
 * Two inclusive `YYYY-MM-DD` periods overlap when each starts on or before the
 * other ends. Plain string comparison is valid for ISO dates.
 */
export function periodsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

/**
 * Utilization as a percentage of the configured limit. `amount` is validated
 * to be greater than zero by the schema, so division is guarded defensively.
 */
export function computeUtilization(
  spent: string | number,
  amount: string | number,
): number {
  const limit = Number(amount);
  if (!Number.isFinite(limit) || limit === 0) {
    return 0;
  }
  const used = Number(spent);
  if (!Number.isFinite(used)) {
    return 0;
  }
  return (used / limit) * 100;
}

/** Where a budget sits relative to `today` (inclusive bounds). */
export function budgetStatus(
  startDate: string,
  endDate: string,
  today: Date = new Date(),
): BudgetStatus {
  const current = toISODate(today);
  if (current < startDate) {
    return "UPCOMING";
  }
  if (current > endDate) {
    return "ENDED";
  }
  return "ACTIVE";
}

/**
 * Derive the aligned period bounds for an interval around a reference date.
 * Used to default the period picker in the create dialog.
 */
export function periodBounds(
  interval: BudgetInterval,
  reference: Date,
): { startDate: string; endDate: string } {
  const year = reference.getFullYear();

  if (interval === "YEARLY") {
    return {
      startDate: toISODate(new Date(year, 0, 1)),
      endDate: toISODate(new Date(year, 11, 31)),
    };
  }

  const monthIndex = reference.getMonth();
  return {
    startDate: toISODate(new Date(year, monthIndex, 1)),
    endDate: toISODate(
      new Date(year, monthIndex, lastDayOfMonth(year, monthIndex)),
    ),
  };
}
