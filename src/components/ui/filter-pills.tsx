"use client";

import { cn } from "@/lib/utils";

export interface FilterPillOption<T extends string> {
  value: T;
  label: string;
}

interface FilterPillsProps<T extends string> {
  options: readonly FilterPillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the pill group, e.g. "Filter by interval". */
  ariaLabel: string;
  className?: string;
}

/**
 * Single-select pill row shared by the workspace list pages. Scrolls
 * horizontally on narrow screens instead of wrapping.
 */
export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: FilterPillsProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex gap-2 overflow-x-auto pb-1", className)}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
