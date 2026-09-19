"use client";

/**
 * Full transaction list view: period navigation, filters, search, sort,
 * grouping, summary, list, and the create/edit/delete dialogs.
 *
 * Extracted from the transactions page so any surface that lists
 * transactions (the workspace-wide page and the per-account detail view)
 * renders through this one component; changes here apply everywhere.
 *
 * Pass `accountId` to scope the list to one account. The scope is enforced
 * server-side by the transactions endpoint (`accountId` query parameter),
 * so the client cannot show transactions outside the account.
 */

import { useLayoutEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/components/shared/workspace/workspace-context";
import type {
  TransactionView,
  TransactionType,
} from "@/features/transactions/types";
import { sumTransactions } from "@/features/transactions/summary";
import { useWorkspaceCollection } from "@/lib/hooks/use-workspace-collection";
import {
  formatDayHeading,
  formatPeriodLabel,
  getDateRange,
  isSamePeriod,
  navigateDate,
  type ViewMode,
} from "@/lib/date-period";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  CalendarDays,
} from "lucide-react";
import { CreateTransactionDialog } from "./create-transaction-dialog";
import { EditTransactionDialog } from "./edit-transaction-dialog";
import { DeleteTransactionDialog } from "./delete-transaction-dialog";
import { TransactionRow } from "./transaction-row";
import {
  TransactionTable,
  TransactionTableSkeleton,
} from "./transaction-table";
import { TransactionFilters } from "./transaction-filters";
import { TransactionSearch } from "./transaction-search";
import { TransactionGrouping } from "./transaction-grouping";
import { buildListSections } from "./transaction-presentation";
import {
  TransactionSort,
  type SortField,
  type SortDirection,
} from "./transaction-sort";
import { EmptyStateIllustration } from "./empty-state-illustrations";

// ---------------------------------------------------------------------------
// Day grouping preference
// ---------------------------------------------------------------------------

/**
 * Persisted so the list keeps the shape the user last chose, alongside the
 * other stored client preferences (`theme`, `fintracko_active_workspace_id`).
 */
const DAY_GROUPING_STORAGE_KEY = "fintracko_transactions_group_by_day";
const DAY_GROUPING_DEFAULT = true;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TransactionListViewProps {
  /** Heading shown when `header` is not provided. */
  title?: string;
  /** Replaces the default heading; the New Transaction button stays. */
  header?: React.ReactNode;
  /** Scope the list to transactions touching this account. */
  accountId?: string;
  /** Account preselected when creating a transaction from this view. */
  defaultAccountId?: string;
  /** Disables the New Transaction button (e.g. archived account scope). */
  createDisabled?: boolean;
}

export function TransactionListView({
  title = "Transactions",
  header,
  accountId,
  defaultAccountId,
  createDisabled = false,
}: TransactionListViewProps) {
  const { activeWorkspaceId } = useWorkspace();

  // View mode & date navigation
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [refDate, setRefDate] = useState(() => new Date());

  // Filters
  const [typeFilter, setTypeFilter] = useState<TransactionType | "ALL">("ALL");

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Sort
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Day grouping. Restored after mount rather than in the initial state:
  // localStorage is unavailable during the server render, so reading it there
  // would make the first client render disagree with the server's HTML.
  const [groupByDay, setGroupByDay] = useState(DAY_GROUPING_DEFAULT);

  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem(DAY_GROUPING_STORAGE_KEY);
      if (stored === "true" || stored === "false") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setGroupByDay(stored === "true");
      }
    } catch {
      // localStorage may be unavailable (private mode); keep the default.
    }
  }, []);

  // Summary visibility
  const [isSummaryVisible, setIsSummaryVisible] = useState(true);

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionView | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingTransaction, setDeletingTransaction] =
    useState<TransactionView | null>(null);

  // Server-side scope: the endpoint filters by account, so a change of scope
  // re-runs the fetch through the query dependency.
  const query = useMemo(() => {
    if (!accountId) return undefined;
    return new URLSearchParams({ accountId }).toString();
  }, [accountId]);

  const {
    data: transactions,
    isLoading,
    error,
    refetch,
  } = useWorkspaceCollection<
    TransactionView,
    { transactions: TransactionView[]; total: number }
  >({
    workspaceId: activeWorkspaceId,
    getPath: (id) => `/api/v1/workspaces/${id}/transactions`,
    query,
    select: (data) => data.transactions ?? [],
    fallbackMessage: "Failed to load transactions. Please try again.",
  });

  // Compute date range for current view
  const dateRange = useMemo(
    () => getDateRange(viewMode, refDate),
    [viewMode, refDate],
  );

  // Filter transactions by date range and type
  const filteredTransactions = useMemo(() => {
    let result = transactions.filter((t) => {
      const inRange = t.date >= dateRange.from && t.date <= dateRange.to;
      const matchesType = typeFilter === "ALL" || t.type === typeFilter;
      return inRange && matchesType;
    });

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.subCategoryName.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.payeePayer?.toLowerCase().includes(query) ||
          t.categoryName.toLowerCase().includes(query),
      );
    }

    return result;
  }, [transactions, dateRange, typeFilter, searchQuery]);

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "date":
          comparison = a.date.localeCompare(b.date);
          break;
        case "amount":
          comparison = parseFloat(a.amount) - parseFloat(b.amount);
          break;
        case "category":
          comparison = a.categoryName.localeCompare(b.categoryName);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [filteredTransactions, sortField, sortDirection]);

  // Summary for the filtered period. Uses the same arithmetic as the day
  // section totals so the two can never disagree.
  const summary = useMemo(
    () => sumTransactions(filteredTransactions),
    [filteredTransactions],
  );

  // List sections: one per day when grouping is on, otherwise a single flat
  // section, so both layouts render through one path.
  const listSections = useMemo(
    () =>
      buildListSections(sortedTransactions, {
        grouped: groupByDay,
        direction: sortDirection,
      }),
    [sortedTransactions, groupByDay, sortDirection],
  );

  const isToday = isSamePeriod(viewMode, refDate, new Date());
  const isScoped = Boolean(accountId);

  if (!activeWorkspaceId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <ArrowRightLeft className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">
          Select a workspace to view transactions.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive">{error}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => void refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  const handleEdit = (t: TransactionView) => {
    setEditingTransaction(t);
    // Opening a dialog from a dropdown item can leave body pointer-events stuck
    // (Radix issue #3317); defer so the menu cleanup runs before the dialog opens.
    window.setTimeout(() => setIsEditOpen(true), 0);
  };

  const handleDelete = (t: TransactionView) => {
    setDeletingTransaction(t);
    window.setTimeout(() => setIsDeleteOpen(true), 0);
  };

  const handleGroupingChange = (grouped: boolean) => {
    setGroupByDay(grouped);
    try {
      localStorage.setItem(DAY_GROUPING_STORAGE_KEY, String(grouped));
    } catch {
      // localStorage may be unavailable (private mode); ignore gracefully.
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        {header ?? (
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h1>
        )}
        <Button
          size="icon"
          onClick={() => setIsCreateOpen(true)}
          aria-label={
            createDisabled ? "New Transaction (account archived)" : "New Transaction"
          }
          disabled={createDisabled}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* View Mode + Date Navigation */}
      {!isLoading && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* View mode pills */}
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 sm:flex sm:w-auto">
            {(["day", "week", "month"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === mode
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Date navigation */}
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-center">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setRefDate((d) => navigateDate(viewMode, d, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-0 flex-1 text-center text-sm font-medium sm:min-w-45 sm:flex-none">
              {formatPeriodLabel(viewMode, refDate)}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setRefDate((d) => navigateDate(viewMode, d, 1))}
              disabled={isToday}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isToday && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setRefDate(new Date())}
              >
                <CalendarDays className="mr-1 h-3 w-3" />
                Today
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Search and Sort */}
      {!isLoading && transactions.length > 0 && (
        <div className="flex gap-2 items-center">
          <div className="flex-1 min-w-0">
            <TransactionSearch value={searchQuery} onChange={setSearchQuery} />
          </div>
          <TransactionSort
            field={sortField}
            direction={sortDirection}
            onChange={(field, direction) => {
              setSortField(field);
              setSortDirection(direction);
            }}
          />
          <TransactionGrouping
            grouped={groupByDay}
            onChange={handleGroupingChange}
          />
        </div>
      )}

      {/* Type Filter */}
      {!isLoading && transactions.length > 0 && (
        <TransactionFilters value={typeFilter} onChange={setTypeFilter} />
      )}

      {/* Summary */}
      {!isLoading && filteredTransactions.length > 0 && (
        <Card className="gap-0 py-2">
          <div className="flex items-center justify-between px-4 sm:px-6">
            <span className="text-sm font-medium text-muted-foreground">
              Summary
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsSummaryVisible((v) => !v)}
              aria-expanded={isSummaryVisible}
            >
              {isSummaryVisible ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              <span className="sr-only">
                {isSummaryVisible ? "Hide summary" : "Show summary"}
              </span>
            </Button>
          </div>
          {isSummaryVisible && (
            <CardContent className="divide-y divide-border pl-8 pr-4 sm:pl-10 sm:pr-6">
              <div className="flex items-center justify-between gap-4 py-2">
                <span className="text-sm text-muted-foreground">Income</span>
                <span className="text-sm font-semibold tabular-nums text-emerald-600">
                  {formatCurrency(summary.totalIncome)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <span className="text-sm text-muted-foreground">Expense</span>
                <span className="text-sm font-semibold tabular-nums text-red-600">
                  {formatCurrency(summary.totalExpense)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <span className="text-sm text-muted-foreground">Net</span>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    summary.net >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(summary.net)}
                </span>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="flex-1 overflow-hidden p-2 md:p-0">
          <div className="max-h-[60vh] px-2 overflow-y-auto md:px-0">
            {/* Mobile: card placeholders */}
            <div className="space-y-4 py-2 md:hidden">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Array.from({ length: 2 }).map((_, j) => (
                      <Skeleton key={j} className="h-12 w-full" />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tablet and desktop: ledger placeholders */}
            <TransactionTableSkeleton
              className="hidden md:block"
              grouped={groupByDay}
            />
          </div>
        </Card>
      )}

      {/* Empty State — no transactions at all */}
      {!isLoading && transactions.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <EmptyStateIllustration icon="no-transactions" className="mb-4" />
          <p className="text-center text-lg font-medium">
            {isScoped
              ? "No transactions for this account yet"
              : "No transactions yet"}
          </p>
          <p className="mb-4 text-center text-sm text-muted-foreground">
            {isScoped
              ? "Create a transaction to start tracking this account."
              : "Create a transaction to start tracking your finances."}
          </p>
          {!createDisabled && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Transaction
            </Button>
          )}
        </div>
      )}

      {/* Empty State — no transactions in this period */}
      {!isLoading &&
        transactions.length > 0 &&
        filteredTransactions.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <EmptyStateIllustration icon="no-period" className="mb-4" />
            <p className="text-center text-lg font-medium">
              No transactions in this period
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Try a different date range or create a new transaction.
            </p>
          </div>
        )}

      {/* Transaction List */}
      {!isLoading && sortedTransactions.length > 0 && (
        <div className="flex flex-col gap-4 min-h-0 flex-1">
          {/* Separator */}
          <Separator className="my-1" />

          {/* Scrollable transaction list */}
          <Card className="flex-1 overflow-hidden p-2 md:p-0">
            <div className="max-h-[60vh] px-2 overflow-y-auto md:px-0">
              {/* Mobile: one card per transaction, under a day heading when grouped */}
              <div className="space-y-2 py-2 md:hidden">
                {listSections.map((section) => (
                  <div key={section.date ?? "flat"} className="space-y-2">
                    {section.date && (
                      // Pinned like the table's day headings so the current day
                      // stays visible; opaque so cards cannot show through it.
                      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card px-1 py-2 text-xs font-medium text-muted-foreground">
                        <span>{formatDayHeading(section.date)}</span>
                        <span className="tabular-nums">
                          {formatCurrency(section.net)}
                        </span>
                      </div>
                    )}
                    {section.transactions.map((txn) => (
                      <Card key={txn.id} className="py-0">
                        <CardContent className="px-2 sm:px-6">
                          <TransactionRow
                            transaction={txn}
                            showDate={!section.date}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ))}
              </div>

              {/* Tablet and desktop: one ledger row per transaction */}
              <TransactionTable
                className="hidden md:block"
                sections={listSections}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Dialogs */}
      <CreateTransactionDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={() => void refetch()}
        defaultAccountId={defaultAccountId}
      />
      <EditTransactionDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        transaction={editingTransaction}
        onUpdated={() => void refetch()}
      />
      <DeleteTransactionDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        transaction={deletingTransaction}
        onDeleted={() => void refetch()}
      />
    </div>
  );
}
