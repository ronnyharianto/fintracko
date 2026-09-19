"use client";

import type { TransactionType } from "@/features/transactions/types";
import {
  FilterPills,
  type FilterPillOption,
} from "@/components/ui/filter-pills";

export type TransactionFilterValue = TransactionType | "ALL";

const FILTER_OPTIONS: readonly FilterPillOption<TransactionFilterValue>[] = [
  { value: "ALL", label: "All" },
  { value: "EXPENSE", label: "Money Out" },
  { value: "INCOME", label: "Money In" },
  { value: "TRANSFER", label: "Transfers" },
];

interface TransactionFiltersProps {
  value: TransactionFilterValue;
  onChange: (value: TransactionFilterValue) => void;
}

export function TransactionFilters({
  value,
  onChange,
}: TransactionFiltersProps) {
  return (
    <FilterPills
      options={FILTER_OPTIONS}
      value={value}
      onChange={onChange}
      ariaLabel="Filter by transaction type"
    />
  );
}
