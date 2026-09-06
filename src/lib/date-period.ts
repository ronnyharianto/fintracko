/**
 * Day/week/month period helpers for workspace pages with date navigation.
 *
 * Pure presentation utilities shared by pages that render period-scoped
 * lists (transactions today; budgets, analytics, and dashboard later).
 */

export type ViewMode = "day" | "week" | "month";

/** Parse a YYYY-MM-DD string to a local Date (no timezone shift). */
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Format a YYYY-MM-DD string as a short date (e.g. "Sep 1, 2026"). */
export function formatShortDate(dateStr: string): string {
  const date = parseDate(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format a Date to YYYY-MM-DD. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Get the start and end dates for a given view mode and reference date. */
export function getDateRange(mode: ViewMode, refDate: Date): { from: string; to: string } {
  const start = new Date(refDate);
  const end = new Date(refDate);

  if (mode === "day") {
    // Single day
  } else if (mode === "week") {
    // Week: Monday to Sunday
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday = 0
    start.setDate(start.getDate() - diff);
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 6);
  } else {
    // Month: first day to last day
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
  }

  return { from: toISODate(start), to: toISODate(end) };
}

/** Format the period label for display. */
export function formatPeriodLabel(mode: ViewMode, refDate: Date): string {
  if (mode === "day") {
    return refDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (mode === "week") {
    const { from, to } = getDateRange("week", refDate);
    const start = parseDate(from);
    const end = parseDate(to);
    const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${startStr} – ${endStr}`;
  }

  // Month
  return refDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Navigate the reference date by a given mode and direction. */
export function navigateDate(mode: ViewMode, refDate: Date, direction: -1 | 1): Date {
  const next = new Date(refDate);
  if (mode === "day") {
    next.setDate(next.getDate() + direction);
  } else if (mode === "week") {
    next.setDate(next.getDate() + direction * 7);
  } else {
    next.setMonth(next.getMonth() + direction);
  }
  return next;
}

/** Check if two dates are in the same period. */
export function isSamePeriod(mode: ViewMode, a: Date, b: Date): boolean {
  if (mode === "day") {
    return toISODate(a) === toISODate(b);
  }
  if (mode === "week") {
    return getDateRange("week", a).from === getDateRange("week", b).from;
  }
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}