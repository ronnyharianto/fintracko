/**
 * Pure period and utilization helpers for budgets.
 *
 * A budget is a *range*: it applies to every interval-aligned period inside
 * `[startDate, endDate]`, each carrying its own per-period limit. Ranges are
 * always composed of whole periods, so a start is the first day of a period and
 * an end is the last day of one. The open-ended sentinel (`9999-12-31`) is the
 * last day of December 9999, so it satisfies that rule without a special case.
 */

import type { BudgetInterval } from "../../../generated/prisma/enums";
import { parseDate, toISODate } from "@/lib/date-period";
import type { BudgetStatus } from "./types";

/** Persisted end date meaning "this budget has no end". */
export const OPEN_ENDED_DATE = "9999-12-31";

/** Last calendar day (as a day number) for a zero-based month index. */
function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * The aligned period containing `reference`. Monthly returns the month's first
 * and last day; yearly returns January 1 and December 31.
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

/** True when the budget is open-ended (has no end date). */
export function isOpenEnded(endDate: string): boolean {
  return endDate === OPEN_ENDED_DATE;
}

/** True when `dateStr` is the first day of an interval-aligned period. */
export function isPeriodStart(
  interval: BudgetInterval,
  dateStr: string,
): boolean {
  const date = parseDate(dateStr);
  if (Number.isNaN(date.getTime())) return false;

  return interval === "YEARLY"
    ? date.getMonth() === 0 && date.getDate() === 1
    : date.getDate() === 1;
}

/**
 * A budget range is valid when it starts on the first day of a period, ends on
 * the last day of one, and does not end before it starts. A single-period
 * budget and an open-ended budget are both valid ranges.
 */
export function isRangeAligned(
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

  const startsAligned = isPeriodStart(interval, startDate);
  const endsAligned =
    interval === "YEARLY"
      ? end.getMonth() === 11 && end.getDate() === 31
      : end.getDate() === lastDayOfMonth(end.getFullYear(), end.getMonth());

  return startsAligned && endsAligned;
}

/** The day before an ISO date, e.g. `previousDay("2026-07-01")` -> `"2026-06-30"`. */
export function previousDay(dateStr: string): string {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() - 1);
  return toISODate(date);
}

/** Number of aligned periods between two aligned period-start dates, inclusive. */
function countPeriods(
  interval: BudgetInterval,
  firstStart: string,
  lastStart: string,
): number {
  const first = parseDate(firstStart);
  const last = parseDate(lastStart);

  if (interval === "YEARLY") {
    return last.getFullYear() - first.getFullYear() + 1;
  }
  return (
    (last.getFullYear() - first.getFullYear()) * 12 +
    (last.getMonth() - first.getMonth()) +
    1
  );
}

/**
 * Resolve the periods a budget covers inside a viewed window.
 *
 * The window selects which periods are in play, but each contributes its full
 * extent, so a yearly budget viewed in a single month still measures against
 * the whole year, and a monthly budget viewed across a year rolls all of its
 * months up. Returns null when the budget does not reach into the window.
 */
export function resolvePeriods(
  interval: BudgetInterval,
  startDate: string,
  endDate: string,
  windowFrom: string,
  windowTo: string,
): { count: number; rangeStart: string; rangeEnd: string } | null {
  const from = startDate > windowFrom ? startDate : windowFrom;
  const to = endDate < windowTo ? endDate : windowTo;
  if (from > to) return null;

  const first = periodBounds(interval, parseDate(from));
  const last = periodBounds(interval, parseDate(to));

  return {
    count: countPeriods(interval, first.startDate, last.startDate),
    rangeStart: first.startDate,
    rangeEnd: last.endDate,
  };
}

/** A contiguous run of aligned periods, inclusive of both ends. */
export interface PeriodRun {
  start: string;
  end: string;
}

/** The day after an ISO date, e.g. `nextDay("2026-06-30")` -> `"2026-07-01"`. */
function nextDay(dateStr: string): string {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + 1);
  return toISODate(date);
}

/**
 * The periods of a budget that have already ended. The current period has not
 * elapsed, so the run stops the day before its start. Returns null when no
 * period of the range has ended yet.
 */
function elapsedRun(
  interval: BudgetInterval,
  startDate: string,
  endDate: string,
  today: Date,
): PeriodRun | null {
  const cutoff = previousDay(periodBounds(interval, today).startDate);
  if (startDate > cutoff) return null;

  return { start: startDate, end: endDate < cutoff ? endDate : cutoff };
}

/** Periods inside a run, counted between its aligned period boundaries. */
function runPeriodCount(interval: BudgetInterval, run: PeriodRun): number {
  return countPeriods(
    interval,
    periodBounds(interval, parseDate(run.start)).startDate,
    periodBounds(interval, parseDate(run.end)).startDate,
  );
}

/** The parts of `run` that fall outside `other`, as up to two shorter runs. */
function subtractRun(
  run: PeriodRun | null,
  other: PeriodRun | null,
): PeriodRun[] {
  if (!run) return [];
  if (!other) return [run];

  const parts: PeriodRun[] = [];
  if (run.start < other.start) {
    parts.push({ start: run.start, end: previousDay(other.start) });
  }
  if (run.end > other.end) {
    parts.push({ start: nextDay(other.end), end: run.end });
  }
  return parts;
}

/** The smallest run covering both, or whichever of the two exists. */
function unionRun(a: PeriodRun | null, b: PeriodRun | null): PeriodRun | null {
  if (!a) return b;
  if (!b) return a;
  return {
    start: a.start < b.start ? a.start : b.start,
    end: a.end > b.end ? a.end : b.end,
  };
}

/** Utilization as a percentage of the limit. Guarded against a zero limit. */
export function computeUtilization(
  spent: string | number,
  limit: string | number,
): number {
  const total = Number(limit);
  if (!Number.isFinite(total) || total === 0) return 0;

  const used = Number(spent);
  if (!Number.isFinite(used)) return 0;

  return (used / total) * 100;
}

/** Where a budget sits relative to `today` (inclusive bounds). */
export function budgetStatus(
  startDate: string,
  endDate: string,
  today: Date = new Date(),
): BudgetStatus {
  const current = toISODate(today);
  if (current < startDate) return "UPCOMING";
  if (current > endDate) return "ENDED";
  return "ACTIVE";
}

/** The historical consequence of an edit, when it reaches elapsed periods. */
export interface HistoricalImpact {
  /** Periods that have already ended whose limit this edit changes. */
  periods: number;
  /** Those periods, as one or two contiguous aligned runs. */
  ranges: PeriodRun[];
  amountChanged: boolean;
}

/**
 * Determine which already-ended periods change their limit under an edit — the
 * case that silently rewrites reported history and therefore needs confirming.
 *
 * A period changes when the edit starts or stops covering it, or when it stays
 * covered while the per-period amount moves. Periods covered both before and
 * after at the same amount are untouched, so shortening a range reports only
 * the periods it drops. Returns null when nothing elapsed changes.
 */
export function describeHistoricalImpact(
  interval: BudgetInterval,
  before: { amount: string; startDate: string; endDate: string },
  after: { amount: string; startDate: string; endDate: string },
  today: Date = new Date(),
): HistoricalImpact | null {
  const beforeRun = elapsedRun(
    interval,
    before.startDate,
    before.endDate,
    today,
  );
  const afterRun = elapsedRun(
    interval,
    after.startDate,
    after.endDate,
    today,
  );
  const amountChanged = Number(before.amount) !== Number(after.amount);

  // A new amount rewrites every period still covered, and the union also spans
  // the periods the edit drops or adds. Without one, only dropped and added
  // periods move.
  const ranges = amountChanged
    ? [unionRun(beforeRun, afterRun)].filter(
        (run): run is PeriodRun => run !== null,
      )
    : [...subtractRun(beforeRun, afterRun), ...subtractRun(afterRun, beforeRun)];

  const periods = ranges.reduce(
    (sum, run) => sum + runPeriodCount(interval, run),
    0,
  );

  if (periods === 0) return null;

  return { periods, ranges, amountChanged };
}
