"use client";

import type { TransactionType } from "@/features/transactions/types";

type FilterValue = TransactionType | "ALL";

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "EXPENSE", label: "Money Out" },
  { value: "INCOME", label: "Money In" },
  { value: "TRANSFER", label: "Transfers" },
];

interface TransactionFiltersProps {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
}

export function TransactionFilters({ value, onChange }: TransactionFiltersProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {FILTER_OPTIONS.map(({ value: filterValue, label }) => (
        <button
          key={filterValue}
          onClick={() => onChange(filterValue)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            value === filterValue
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
