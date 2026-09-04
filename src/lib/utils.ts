/**
 * Shared utility helpers for the presentation layer.
 *
 * Per docs/core/PROJECT_STRUCTURE.md §2.4, src/lib/utils.ts hosts fast
 * formatting helpers such as Tailwind class merges.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Conditionally merges Tailwind CSS class names while resolving conflicts
 * (e.g. `cn("p-4", condition && "p-6")` -> `"p-6"`).
 *
 * Uses `clsx` for conditional joining and `tailwind-merge` to deduplicate
 * conflicting Tailwind utility classes, keeping the final className string
 * deterministic and free of dead utilities.
 *
 * @param inputs - ClassValue entries (strings, arrays, objects, or nested).
 * @returns A single merged className string.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Derive up to 2 uppercase initials from a user's display name.
 * Returns "?" when the name is empty or absent.
 *
 * @example
 *   getInitials("Jane Doe")  // "JD"
 *   getInitials("alice")     // "A"
 *   getInitials(null)        // "?"
 */
export function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Format a numeric amount as a 2-decimal locale string.
 *
 * @example
 *   formatCurrency(1234.5)  // "1,234.50"
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Group items by a string key, preserving first-seen key order.
 *
 * @example
 *   groupBy([{ d: "2026-01-02" }, { d: "2026-01-01" }], (t) => t.d)
 *   // Map { "2026-01-02" => [...], "2026-01-01" => [...] }
 */
export function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const groupKey = key(item);
    const list = groups.get(groupKey);
    if (list) {
      list.push(item);
    } else {
      groups.set(groupKey, [item]);
    }
  }
  return groups;
}
