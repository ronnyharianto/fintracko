"use client";

import type { BudgetInterval } from "@/features/budgets/types";
import {
  FilterPills,
  type FilterPillOption,
} from "@/components/ui/filter-pills";

export type IntervalFilter = BudgetInterval | "ALL";

const INTERVAL_OPTIONS: readonly FilterPillOption<IntervalFilter>[] = [
  { value: "ALL", label: "All" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

interface BudgetFiltersProps {
  interval: IntervalFilter;
  onIntervalChange: (value: IntervalFilter) => void;
}

export function BudgetFilters({
  interval,
  onIntervalChange,
}: BudgetFiltersProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Interval</p>
      <FilterPills
        options={INTERVAL_OPTIONS}
        value={interval}
        onChange={onIntervalChange}
        ariaLabel="Filter by interval"
      />
    </div>
  );
}
