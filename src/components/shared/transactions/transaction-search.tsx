"use client";

import { SearchInput } from "@/components/ui/search-input";

interface TransactionSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function TransactionSearch({ value, onChange }: TransactionSearchProps) {
  return (
    <SearchInput
      value={value}
      onChange={onChange}
      placeholder="Search transactions..."
      ariaLabel="Search transactions"
    />
  );
}
