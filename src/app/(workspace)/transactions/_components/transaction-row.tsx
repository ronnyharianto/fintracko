"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, TrendingUp, TrendingDown, ArrowRightLeft } from "lucide-react";
import type { TransactionView, TransactionType } from "@/features/transactions/types";
import { formatShortDate } from "@/lib/date-period";
import { formatCurrency } from "@/lib/utils";

const TYPE_COLORS: Record<TransactionType, string> = {
  INCOME: "text-emerald-600",
  EXPENSE: "text-red-600",
  TRANSFER: "text-blue-600",
};

const TYPE_ICON: Record<TransactionType, typeof TrendingUp> = {
  INCOME: TrendingUp,
  EXPENSE: TrendingDown,
  TRANSFER: ArrowRightLeft,
};

interface TransactionRowProps {
  transaction: TransactionView;
  onEdit: (t: TransactionView) => void;
  onDelete: (t: TransactionView) => void;
}

export function TransactionRow({ transaction: txn, onEdit, onDelete }: TransactionRowProps) {
  const Icon = TYPE_ICON[txn.type];
  const colorClass = TYPE_COLORS[txn.type];
  const amount = parseFloat(txn.amount) || 0;

  const accountName =
    txn.type === "TRANSFER"
      ? [txn.sourceAccountName, txn.destinationAccountName].filter(Boolean).join(" → ")
      : txn.type === "INCOME"
        ? txn.destinationAccountName
        : txn.sourceAccountName;

  return (
    <div className="group flex items-center gap-3 py-3">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted ${colorClass}`}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">
            {formatShortDate(txn.date)}
            {accountName ? ` - ${accountName}` : ""}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(txn)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(txn)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">{txn.subCategoryName}</p>
          <p className={`shrink-0 text-sm font-semibold tabular-nums ${colorClass}`}>
            {txn.type === "EXPENSE" ? "-" : txn.type === "INCOME" ? "+" : ""}
            {formatCurrency(Math.abs(amount))}
          </p>
        </div>
        {txn.description && (
          <p className="truncate text-xs text-muted-foreground">{txn.description}</p>
        )}
      </div>
    </div>
  );
}