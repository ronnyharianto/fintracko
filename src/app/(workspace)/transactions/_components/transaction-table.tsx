"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
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

/**
 * Tablet and desktop transaction list.
 *
 * One row per transaction instead of one card, so the amount column lines up
 * across rows and roughly three times as many transactions fit on screen. The
 * table is fixed-layout so the truncating cells actually truncate rather than
 * widening their column. Category and payee appear only once there is room for
 * them (lg and xl), because before that they would starve the subcategory.
 */

interface TransactionTableProps {
  transactions: TransactionView[];
  onEdit: (t: TransactionView) => void;
  onDelete: (t: TransactionView) => void;
  className?: string;
}

interface TransactionTableRowProps {
  transaction: TransactionView;
  onEdit: (t: TransactionView) => void;
  onDelete: (t: TransactionView) => void;
}

interface TransactionTableSkeletonProps {
  rows?: number;
  className?: string;
}

interface ColumnSpec {
  header: string;
  /** Applied to both the header cell and the body cell of this column. */
  cell: string;
  placeholder: string;
  /** Icon-only columns announce their header but do not draw it. */
  srOnly?: boolean;
}

const HEAD_CELL =
  "sticky top-0 z-10 border-b border-border bg-card px-3 py-2 text-xs font-medium whitespace-nowrap text-muted-foreground";

const CELL = "border-b border-border/60 px-3 py-2";

const LG_ONLY = "hidden lg:table-cell";
const XL_ONLY = "hidden xl:table-cell";

/**
 * Single source of truth for column order, width, and breakpoint visibility.
 * The header, the body rows, and the loading skeleton all read from it, so a
 * placeholder can never drift out of alignment with the data it replaces.
 * Widths live on the header cell only: with table-fixed, the first row of the
 * table defines the columns.
 */
const COLUMNS: ColumnSpec[] = [
  {
    header: "Type",
    srOnly: true,
    cell: "w-10",
    placeholder: "h-7 w-7 rounded-full",
  },
  { header: "Date", cell: "w-20", placeholder: "h-3 w-10" },
  {
    header: "Category",
    cell: `w-40 ${LG_ONLY}`,
    placeholder: "h-3 w-2/3",
  },
  { header: "Subcategory", cell: "w-40", placeholder: "h-4 w-3/5" },
  { header: "Account", cell: "w-56", placeholder: "h-3 w-2/3" },
  {
    header: "Payee / Description",
    cell: `w-48 ${XL_ONLY}`,
    placeholder: "h-3 w-3/4",
  },
  {
    header: "Amount",
    cell: "text-right",
    placeholder: "ml-auto h-4 w-16",
  },
  { header: "Actions", srOnly: true, cell: "w-10", placeholder: "h-6 w-6" },
];

export function TransactionTable({
  transactions,
  onEdit,
  onDelete,
  className,
}: TransactionTableProps) {
  return (
    <div className={className}>
      <table className="w-full table-fixed border-separate border-spacing-0 text-left">
        <TransactionTableHeader />
        <tbody>
          {transactions.map((txn) => (
            <TransactionTableRow
              key={txn.id}
              transaction={txn}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Placeholder rows for the loading state, shaped like the loaded table. */
export function TransactionTableSkeleton({
  rows = 8,
  className,
}: TransactionTableSkeletonProps) {
  return (
    <div className={className} aria-hidden>
      <table className="w-full table-fixed border-separate border-spacing-0 text-left">
        <TransactionTableHeader />
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              {COLUMNS.map((col) => (
                <td key={col.header} className={`${CELL} ${col.cell}`}>
                  <Skeleton className={col.placeholder} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The column set is static, so the real labels are drawn while loading rather
 * than pulsed placeholders.
 */
function TransactionTableHeader() {
  return (
    <thead>
      <tr>
        {COLUMNS.map((col) => (
          <th
            key={col.header}
            scope="col"
            className={`${HEAD_CELL} ${col.cell}`}
          >
            {col.srOnly ? (
              <span className="sr-only">{col.header}</span>
            ) : (
              col.header
            )}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function TransactionTableRow({
  transaction: txn,
  onEdit,
  onDelete,
}: TransactionTableRowProps) {
  const Icon = TYPE_ICON[txn.type];
  const colorClass = TYPE_TEXT_COLOR[txn.type];
  const accountName = getAccountLabel(txn);
  const detail = getDetailText(txn);

  return (
    <tr className="group hover:bg-muted/40">
      <td className={CELL}>
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full bg-muted ${colorClass}`}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
      </td>
      <td
        className={`${CELL} text-xs tabular-nums whitespace-nowrap text-muted-foreground`}
      >
        {formatMonthDay(txn.date)}
      </td>
      <td className={`${CELL} ${LG_ONLY}`}>
        <p className="truncate text-xs text-muted-foreground">
          {txn.categoryName}
        </p>
      </td>
      <td className={CELL}>
        <p className="truncate text-sm font-medium">{txn.subCategoryName}</p>
      </td>
      <td className={CELL}>
        <p className="truncate text-xs text-muted-foreground">{accountName}</p>
      </td>
      <td className={`${CELL} ${XL_ONLY}`}>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </td>
      <td
        className={`${CELL} text-right text-sm font-semibold tabular-nums whitespace-nowrap ${colorClass}`}
      >
        {formatSignedAmount(txn)}
      </td>
      <td className={CELL}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground opacity-60 transition-opacity hover:bg-transparent hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
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
      </td>
    </tr>
  );
}
