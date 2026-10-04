"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { TransactionView } from "@/features/transactions/types";
import { formatMonthDay } from "@/lib/date-period";
import {
  TYPE_ICON,
  TYPE_TEXT_COLOR,
  formatSignedAmount,
  getAccountLabel,
  getDetailText,
} from "./transaction-presentation";

interface TransactionRowProps {
  transaction: TransactionView;
  /** False when a day heading above the card already states the date. */
  showDate?: boolean;
  onEdit: (t: TransactionView) => void;
  onDelete: (t: TransactionView) => void;
}

export function TransactionRow({
  transaction: txn,
  showDate = true,
  onEdit,
  onDelete,
}: TransactionRowProps) {
  const Icon = TYPE_ICON[txn.type];
  const colorClass = TYPE_TEXT_COLOR[txn.type];
  const accountName = getAccountLabel(txn);
  const detail = getDetailText(txn);
  // Account and detail share one muted line so the card stays two lines tall,
  // which fits noticeably more rows on a small screen.
  const secondary = [accountName, detail].filter(Boolean).join(" \u00b7 ");

  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted ${colorClass}`}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-medium">{txn.subCategoryName}</p>
        {secondary && (
          <p className="truncate text-xs text-muted-foreground">{secondary}</p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className={`text-sm font-semibold tabular-nums ${colorClass}`}>
          {formatSignedAmount(txn)}
        </span>
        <div className="flex h-6 items-center gap-1">
          {showDate && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatMonthDay(txn.date)}
            </span>
          )}
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
      </div>
    </div>
  );
}
