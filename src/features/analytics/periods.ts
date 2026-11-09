/**
 * Date bucketing for the analytics trend.
 *
 * The trend window is user-selected, so the bucket size is chosen from the
 * range length. All arithmetic is UTC-based: transaction dates are PostgreSQL
 * `date` values that Prisma returns at UTC midnight, so local Date math would
 * shift buckets near timezone boundaries.
 */

import type { AnalyticsGranularity } from "./types";

const DAY_MS = 86_400_000;
const WEEK_MS = DAY_MS * 7;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** One point on the trend's x-axis. */
export interface TrendBucket {
  /** `YYYY-MM-DD` for daily/weekly buckets, `YYYY-MM` for monthly buckets. */
  key: string;
  /** Full display label used by tooltips. */
  label: string;
  /** Short axis label used by the chart. */
  axisLabel: string;
}

/** Parse a `YYYY-MM-DD` string into a UTC-midnight Date. */
function parseDay(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Format a Date as `YYYY-MM-DD` without local-time conversion. */
function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Monday on or before `date`, in UTC. */
function startOfWeek(date: Date): Date {
  const day = date.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  return new Date(date.getTime() - offset * DAY_MS);
}

function dayBucket(iso: string): TrendBucket {
  const [year, month, day] = iso.split("-").map(Number);
  const monthName = MONTHS[month - 1];
  return {
    key: iso,
    label: `${monthName} ${day}, ${year}`,
    axisLabel: `${monthName} ${day}`,
  };
}

function weekBucket(mondayISO: string): TrendBucket {
  const [year, month, day] = mondayISO.split("-").map(Number);
  const monthName = MONTHS[month - 1];
  return {
    key: mondayISO,
    label: `Week of ${monthName} ${day}, ${year}`,
    axisLabel: `${monthName} ${day}`,
  };
}

function monthBucket(key: string): TrendBucket {
  const [year, month] = key.split("-").map(Number);
  const monthName = MONTHS[month - 1];
  return {
    key,
    label: `${monthName} ${year}`,
    axisLabel: `${monthName} ${String(year).slice(-2)}`,
  };
}

/** Number of calendar days in the inclusive range, regardless of time of day. */
export function inclusiveDaySpan(from: string, to: string): number {
  return (
    Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / DAY_MS) + 1
  );
}

/**
 * Pick the trend bucket size from the range length.
 *
 * Daily and weekly caps keep the number of plotted points readable on a phone,
 * while long ranges fall back to months.
 */
export function resolveGranularity(
  from: string,
  to: string,
): AnalyticsGranularity {
  const span = inclusiveDaySpan(from, to);
  if (span <= 31) return "day";
  if (span <= 180) return "week";
  return "month";
}

/**
 * Build every bucket covering `from` to `to`, oldest first.
 *
 * The first weekly bucket starts on the Monday on or before `from`, and the
 * first monthly bucket is the month containing `from`; the underlying query
 * still starts at `from`, so those leading buckets may be partial.
 */
export function buildTrendBuckets(
  from: string,
  to: string,
): { granularity: AnalyticsGranularity; buckets: TrendBucket[] } {
  const granularity = resolveGranularity(from, to);
  const end = parseDay(to);
  const buckets: TrendBucket[] = [];

  if (granularity === "day") {
    for (
      let cursor = parseDay(from);
      cursor.getTime() <= end.getTime();
      cursor = new Date(cursor.getTime() + DAY_MS)
    ) {
      buckets.push(dayBucket(toISODate(cursor)));
    }
  } else if (granularity === "week") {
    for (
      let cursor = startOfWeek(parseDay(from));
      cursor.getTime() <= end.getTime();
      cursor = new Date(cursor.getTime() + WEEK_MS)
    ) {
      buckets.push(weekBucket(toISODate(cursor)));
    }
  } else {
    const start = parseDay(from);
    for (
      let cursor = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1),
      );
      cursor.getTime() <= end.getTime();
      cursor = new Date(
        Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1),
      )
    ) {
      buckets.push(monthBucket(toISODate(cursor).slice(0, 7)));
    }
  }

  return { granularity, buckets };
}

/** Map a `YYYY-MM-DD` transaction date to its trend bucket key. */
export function bucketKeyForISODate(
  iso: string,
  granularity: AnalyticsGranularity,
): string {
  if (granularity === "day") return iso;
  if (granularity === "week") return toISODate(startOfWeek(parseDay(iso)));
  return iso.slice(0, 7);
}

/** Format an inclusive `YYYY-MM-DD` range for captions. */
export function formatRangeLabel(from: string, to: string): string {
  const start = parseDay(from);
  const end = parseDay(to);
  const startMonth = MONTHS[start.getUTCMonth()];
  const endMonth = MONTHS[end.getUTCMonth()];
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();

  if (from === to) {
    return `${startMonth} ${start.getUTCDate()}, ${startYear}`;
  }

  if (startYear === endYear && startMonth === endMonth) {
    return `${startMonth} ${start.getUTCDate()}–${end.getUTCDate()}, ${startYear}`;
  }

  if (startYear === endYear) {
    return `${startMonth} ${start.getUTCDate()} – ${endMonth} ${end.getUTCDate()}, ${startYear}`;
  }

  return `${startMonth} ${start.getUTCDate()}, ${startYear} – ${endMonth} ${end.getUTCDate()}, ${endYear}`;
}
