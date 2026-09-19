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
import { formatDayHeading, formatMonthDay } from "@/lib/date-period";
import { formatCurrency } from "@/lib/utils";
import {
  TYPE_ICON,
  TYPE_TEXT_COLOR,
  type TransactionListSection,
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
 * them (xl and 2xl), because before that they would starve the other columns.
 */

interface TransactionTableProps {
  sections: TransactionListSection[];
  onEdit: (t: TransactionView) => void;
  onDelete: (t: TransactionView) => void;
  className?: string;
}

interface TransactionTableRowProps {
  transaction: TransactionView;
  showDate: boolean;
  onEdit: (t: TransactionView) => void;
  onDelete: (t: TransactionView) => void;
}

interface TransactionTableSkeletonProps {
  grouped?: boolean;
  rows?: number;
  className?: string;
}

interface TransactionDayHeaderProps {
  date: string;
  net: number;
  columnCount: number;
}

interface ColumnSpec {
  key: string;
  header: string;
  /** Applied to both the header cell and the body cell of this column. */
  cell: string;
  placeholder: string;
  /** Icon-only columns announce their header but do not draw it. */
  srOnly?: boolean;
}

/**
 * `text-left` is load-bearing: the browser centres th text by default and
 * Tailwind's preflight does not reset it, so without it every label would sit
 * centred over left-aligned cells.
 */
const HEAD_CELL =
  "sticky top-0 z-10 border-b border-border bg-card px-3 py-2 text-left text-xs font-medium whitespace-nowrap text-muted-foreground";

const CELL = "border-b border-border/60 px-3 py-2";

/**
 * Height of the column header box, which day headings stick directly beneath:
 * the text-xs line box (1rem) plus py-2 (1rem) plus the 1px bottom border.
 * This and HEAD_CELL have to change together.
 */
const COLUMN_HEADER_HEIGHT = "33px";

/**
 * Day headings are opaque rather than tinted so rows cannot show through them
 * while they are pinned under the column header.
 */
const DAY_HEADER_CELL =
  "sticky z-10 border-b border-border bg-muted px-3 py-1.5 text-left text-xs font-medium text-muted-foreground";

const XL_ONLY = "hidden xl:table-cell";

/**
 * Single source of truth for column order, width, and breakpoint visibility.
 * The header, the body rows, and the loading skeleton all read from it, so a
 * placeholder can never drift out of alignment with the data it replaces.
 * Widths live on the header cell only: with table-fixed, the first row of the
 * table defines the columns.
 *
 * Every column carries an explicit width, so trailing space is distributed
 * across all of them rather than pooling in one ballooning column.
 *
 * Amount is sized for the storage ceiling rather than typical data:
 * FinancialTransaction.amount is DECIMAL(18, 4), so the integer part reaches 14
 * digits and the widest renderable value is "99,999,999,999,999.99" - about
 * 160px of glyphs at text-sm in Geist, plus px-3 padding, hence w-48. Amounts
 * are nowrap and cannot shrink, so the width has to be reserved up front.
 *
 * Reserving it is what pushes Category to xl and Payee to 2xl. The shell gives
 * the list `viewport - 48` below lg and `viewport - 304` at lg and up, so lg
 * bottoms out at 720px and the md column set already spends 656px of it.
 */
const COLUMNS: ColumnSpec[] = [
  {
    key: "type",
    header: "Type",
    srOnly: true,
    cell: "w-10",
    placeholder: "h-7 w-7 rounded-full",
  },
  { key: "date", header: "Date", cell: "w-20", placeholder: "h-3 w-10" },
  {
    key: "category",
    header: "Category",
    cell: `w-36 ${XL_ONLY}`,
    placeholder: "h-3 w-2/3",
  },
  {
    key: "subcategory",
    header: "Subcategory",
    cell: "w-36",
    placeholder: "h-4 w-28",
  },
  { key: "account", header: "Account", cell: "w-60", placeholder: "h-3 w-2/3" },
  {
    key: "payee",
    header: "Payee / Description",
    cell: `w-40 ${XL_ONLY}`,
    placeholder: "h-3 w-3/4",
  },
  {
    key: "amount",
    header: "Amount",
    cell: "w-40 text-right",
    placeholder: "ml-auto h-4 w-28",
  },
  {
    key: "actions",
    header: "Actions",
    srOnly: true,
    cell: "",
    placeholder: "h-6 w-6",
  },
];

/**
 * Grouped lists drop the Date column: every row in a day section already has
 * the same date, and the section heading states it.
 */
function columnsFor(grouped: boolean): ColumnSpec[] {
  return grouped ? COLUMNS.filter((col) => col.key !== "date") : COLUMNS;
}

export function TransactionTable({
  sections,
  onEdit,
  onDelete,
  className,
}: TransactionTableProps) {
  const grouped = sections.some((section) => section.date !== null);
  const columns = columnsFor(grouped);

  return (
    <div className={className}>
      <table className="w-full table-fixed border-separate border-spacing-0 text-left">
        <TransactionTableHeader columns={columns} />
        {sections.map((section) => (
          <tbody key={section.date ?? "flat"}>
            {section.date && (
              <TransactionDayHeader
                date={section.date}
                net={section.net}
                columnCount={columns.length}
              />
            )}
            {section.transactions.map((txn) => (
              <TransactionTableRow
                key={txn.id}
                transaction={txn}
                showDate={!grouped}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

/** Placeholder rows for the loading state, shaped like the loaded table. */
export function TransactionTableSkeleton({
  grouped = false,
  rows = 8,
  className,
}: TransactionTableSkeletonProps) {
  const columns = columnsFor(grouped);
  const sections = grouped ? [4, 4] : [rows];

  return (
    <div className={className} aria-hidden>
      <table className="w-full table-fixed border-separate border-spacing-0 text-left">
        <TransactionTableHeader columns={columns} />
        {sections.map((sectionRows, sectionIndex) => (
          <tbody key={sectionIndex}>
            {grouped && (
              <tr>
                <th
                  scope="rowgroup"
                  colSpan={columns.length}
                  className={DAY_HEADER_CELL}
                  style={{ top: COLUMN_HEADER_HEIGHT }}
                >
                  <Skeleton className="h-3 w-24" />
                </th>
              </tr>
            )}
            {Array.from({ length: sectionRows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((col) => (
                  <td key={col.key} className={`${CELL} ${col.cell}`}>
                    <Skeleton className={col.placeholder} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

/**
 * The column set is static, so the real labels are drawn while loading rather
 * than pulsed placeholders.
 */
function TransactionTableHeader({ columns }: { columns: ColumnSpec[] }) {
  return (
    <thead>
      <tr>
        {columns.map((col) => (
          <th key={col.key} scope="col" className={`${HEAD_CELL} ${col.cell}`}>
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

/**
 * Heading for one day, pinned under the column header for as long as its
 * section is on screen; the next day's heading pushes it out. colSpan is set to
 * the full column count and relies on the browser clamping it to the columns
 * that survive the breakpoint, which is why the grouped list can add or drop
 * columns without touching this row.
 */
function TransactionDayHeader({
  date,
  net,
  columnCount,
}: TransactionDayHeaderProps) {
  return (
    <tr>
      <th
        scope="rowgroup"
        colSpan={columnCount}
        className={DAY_HEADER_CELL}
        style={{ top: COLUMN_HEADER_HEIGHT }}
      >
        <span className="flex items-center justify-between gap-2">
          <span>{formatDayHeading(date)}</span>
          <span className="tabular-nums">{formatCurrency(net)}</span>
        </span>
      </th>
    </tr>
  );
}

function TransactionTableRow({
  transaction: txn,
  showDate,
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
      {showDate && (
        <td
          className={`${CELL} text-xs tabular-nums whitespace-nowrap text-muted-foreground`}
        >
          {formatMonthDay(txn.date)}
        </td>
      )}
      <td className={`${CELL} ${XL_ONLY}`}>
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
