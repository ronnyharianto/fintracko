"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TransactionType } from "@/features/transactions/types";
import { ArrowDownUp, Ellipsis, Filter } from "lucide-react";

export type SortField = "date" | "amount" | "category";
export type SortDirection = "asc" | "desc";
export type TransactionFilterValue = TransactionType | "ALL";

interface SortOption {
  value: string;
  field: SortField;
  direction: SortDirection;
  label: string;
}

const SORT_OPTIONS: readonly SortOption[] = [
  {
    value: "date:desc",
    field: "date",
    direction: "desc",
    label: "Date: newest first",
  },
  {
    value: "date:asc",
    field: "date",
    direction: "asc",
    label: "Date: oldest first",
  },
  {
    value: "amount:desc",
    field: "amount",
    direction: "desc",
    label: "Amount: highest first",
  },
  {
    value: "amount:asc",
    field: "amount",
    direction: "asc",
    label: "Amount: lowest first",
  },
  {
    value: "category:asc",
    field: "category",
    direction: "asc",
    label: "Category: A to Z",
  },
  {
    value: "category:desc",
    field: "category",
    direction: "desc",
    label: "Category: Z to A",
  },
];

const FILTER_OPTIONS: readonly {
  value: TransactionFilterValue;
  label: string;
}[] = [
  { value: "ALL", label: "All" },
  { value: "EXPENSE", label: "Money Out" },
  { value: "INCOME", label: "Money In" },
  { value: "TRANSFER", label: "Transfers" },
];

interface TransactionActionsProps {
  field: SortField;
  direction: SortDirection;
  grouped: boolean;
  filter: TransactionFilterValue;
  onSortChange: (field: SortField, direction: SortDirection) => void;
  onGroupingChange: (grouped: boolean) => void;
  onFilterChange: (filter: TransactionFilterValue) => void;
}

export function TransactionActions({
  field,
  direction,
  grouped,
  filter,
  onSortChange,
  onGroupingChange,
  onFilterChange,
}: TransactionActionsProps) {
  const sortValue = `${field}:${direction}`;

  const handleSortChange = (value: string) => {
    const option = SORT_OPTIONS.find((candidate) => candidate.value === value);
    if (option) {
      onSortChange(option.field, option.direction);
    }
  };

  const handleFilterChange = (value: string) => {
    const option = FILTER_OPTIONS.find((candidate) => candidate.value === value);
    if (option) {
      onFilterChange(option.value);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5">
          <Ellipsis className="h-4 w-4" />
          Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ArrowDownUp className="mr-2 h-4 w-4 text-muted-foreground" />
            Sort by
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={sortValue}
              onValueChange={handleSortChange}
            >
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuRadioItem
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            Filter by type
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={filter}
              onValueChange={handleFilterChange}
            >
              {FILTER_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuCheckboxItem
          checked={grouped}
          onCheckedChange={(checked) => onGroupingChange(checked === true)}
        >
          Group by day
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
