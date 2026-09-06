"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, ArrowUp, ArrowDown, SortAsc } from "lucide-react";

export type SortField = "date" | "amount" | "category";
export type SortDirection = "asc" | "desc";

interface TransactionSortProps {
  field: SortField;
  direction: SortDirection;
  onChange: (field: SortField, direction: SortDirection) => void;
}

const FIELD_LABELS: Record<SortField, string> = {
  date: "Date",
  amount: "Amount",
  category: "Category",
};

export function TransactionSort({
  field,
  direction,
  onChange,
}: TransactionSortProps) {
  const handleSelect = (newField: SortField) => {
    if (field === newField) {
      // Toggle direction
      onChange(newField, direction === "asc" ? "desc" : "asc");
    } else {
      // New field, default to desc for date/amount, asc for category
      onChange(newField, newField === "category" ? "asc" : "desc");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1">
          <SortAsc className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs">{FIELD_LABELS[field]}</span>
          {direction === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => handleSelect("date")}
          className={field === "date" ? "bg-muted" : ""}
        >
          <span className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            Date
            {field === "date" && (
              <span className="ml-auto text-xs text-muted-foreground">
                {direction === "asc" ? "↑" : "↓"}
              </span>
            )}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSelect("amount")}
          className={field === "amount" ? "bg-muted" : ""}
        >
          <span className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            Amount
            {field === "amount" && (
              <span className="ml-auto text-xs text-muted-foreground">
                {direction === "asc" ? "↑" : "↓"}
              </span>
            )}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSelect("category")}
          className={field === "category" ? "bg-muted" : ""}
        >
          <span className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            Category
            {field === "category" && (
              <span className="ml-auto text-xs text-muted-foreground">
                {direction === "asc" ? "↑" : "↓"}
              </span>
            )}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
