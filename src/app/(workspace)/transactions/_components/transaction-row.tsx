"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
} from "lucide-react";
import type {
  TransactionView,
  TransactionType,
} from "@/features/transactions/types";
import { formatMonthDay } from "@/lib/date-period";
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

const AMOUNT_SIGN: Record<TransactionType, string> = {
  INCOME: "+",
  EXPENSE: "-",
  TRANSFER: "",
};

interface TransactionRowProps {
  transaction: TransactionView;
  onEdit: (t: TransactionView) => void;
  onDelete: (t: TransactionView) => void;
}

export function TransactionRow({
  transaction: txn,
  onEdit,
  onDelete,
}: TransactionRowProps) {
  const Icon = TYPE_ICON[txn.type];
  const colorClass = TYPE_COLORS[txn.type];
  const amount = parseFloat(txn.amount) || 0;

  const accountName =
    txn.type === "TRANSFER"
      ? [txn.sourceAccountName, txn.destinationAccountName]
          .filter(Boolean)
          .join(" → ")
      : txn.type === "INCOME"
        ? txn.destinationAccountName
        : txn.sourceAccountName;

  const detail = txn.payeePayer ?? txn.description;

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted ${colorClass}`}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-medium">{txn.subCategoryName}</p>
        {accountName && (
          <p className="truncate text-xs leading-6 text-muted-foreground">
            {accountName}
          </p>
        )}
        {detail && (
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className={`text-sm font-semibold tabular-nums ${colorClass}`}>
          {AMOUNT_SIGN[txn.type]}
          {formatCurrency(Math.abs(amount))}
        </span>
        <div className="flex h-6 items-center gap-1">
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatMonthDay(txn.date)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:bg-transparent hover:text-foreground"
                aria-label={`Actions for ${txn.subCategoryName}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4}>
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
        {detail && (
          <p className="truncate text-xs text-muted-foreground">&nbsp;</p>
        )}
      </div>
    </div>
  );
}
