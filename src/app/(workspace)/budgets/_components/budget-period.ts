import type { BudgetInterval } from "@/features/budgets/types";
import { OPEN_ENDED_DATE, periodBounds } from "@/features/budgets/utilization";
import { parseDate } from "@/lib/date-period";

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

/** Picker value for the period containing an ISO date. */
export function periodValueFromDate(
  interval: BudgetInterval,
  date: string,
): string {
  return defaultPeriodValue(interval, parseDate(date));
}

/*
 * Picker values are lexicographically ordered in both formats (`YYYY-MM` and
 * `YYYY`), so range comparisons are plain string comparisons.
 */

/**
 * Compact period token for a range. A single period collapses to one token
 * (`Sep 2026`, `2026`); a range inside one year drops the repeated year
 * (`Jan - Jun 2026`); a range crossing years keeps both (`Nov 2026 - Feb
 * 2027`). An open-ended range is shown as `Oct 2026 -`.
 */
export function formatPeriodRange(
  interval: BudgetInterval,
  startDate: string,
  endDate: string,
): string {
  const start = parseDate(startDate);
  const open = endDate === OPEN_ENDED_DATE;

  if (interval === "YEARLY") {
    const startYear = String(start.getFullYear());
    if (open) return `${startYear} -`;
    const endYear = String(parseDate(endDate).getFullYear());
    return startYear === endYear ? startYear : `${startYear} - ${endYear}`;
  }

  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const startLabel = `${startMonth} ${start.getFullYear()}`;
  if (open) return `${startLabel} -`;

  const end = parseDate(endDate);
  if (
    end.getFullYear() === start.getFullYear() &&
    end.getMonth() === start.getMonth()
  ) {
    return startLabel;
  }

  if (end.getFullYear() === start.getFullYear()) {
    const endMonth = end.toLocaleDateString("en-US", { month: "short" });
    return `${startMonth} - ${endMonth} ${end.getFullYear()}`;
  }

  return `${startLabel} - ${end.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
}
