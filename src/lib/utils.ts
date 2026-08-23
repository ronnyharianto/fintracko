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
