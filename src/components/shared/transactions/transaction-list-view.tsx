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
  TransactionListResponse,
  TransactionView,
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
  RotateCcw,
} from "lucide-react";
import { CreateTransactionDialog } from "./create-transaction-dialog";
import { EditTransactionDialog } from "./edit-transaction-dialog";
import { DeleteTransactionDialog } from "./delete-transaction-dialog";
import { TransactionRow } from "./transaction-row";
import {
  TransactionTable,
  TransactionTableSkeleton,
} from "./transaction-table";
import { TransactionSearch } from "./transaction-search";
import { buildListSections } from "./transaction-presentation";
import {
  TransactionActions,
  type SortField,
  type SortDirection,
  type TransactionFilterValue,
} from "./transaction-actions";
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
// View mode (Day / Week / Month) preference
// ---------------------------------------------------------------------------

const VIEW_MODES = ["day", "week", "month"] as const;
const VIEW_MODE_STORAGE_KEY = "fintracko_transactions_view_mode";
const VIEW_MODE_DEFAULT: ViewMode = "month";

/** Narrow a stored string back to a known view mode. */
function isViewMode(value: string): value is ViewMode {
  return (VIEW_MODES as readonly string[]).includes(value);
}

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
  /** Refreshes parent data affected by a transaction change. */
  onTransactionChanged?: () => void;
}

export function TransactionListView({
  title = "Transactions",
  header,
  accountId,
  defaultAccountId,
  createDisabled = false,
  onTransactionChanged,
}: TransactionListViewProps) {
  const { activeWorkspaceId } = useWorkspace();

  // View mode & date navigation
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODE_DEFAULT);
  const [refDate, setRefDate] = useState(() => new Date());

  // Filters
  const [typeFilter, setTypeFilter] = useState<TransactionFilterValue>("ALL");

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Sort
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Day grouping. Restored after mount rather than in the initial state:
  // localStorage is unavailable during the server render, so reading it there
  // would make the first client render disagree with the server's HTML.
  const [groupByDay, setGroupByDay] = useState(DAY_GROUPING_DEFAULT);

  // Restore the persisted view mode after mount. localStorage is not available
  // during the server render, so it cannot seed the initial state without
  // making the first client render disagree with the server's HTML.
  useLayoutEffect(() => {
    try {
      const storedMode = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (storedMode && isViewMode(storedMode)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setViewMode(storedMode);
      }
    } catch {
      // localStorage may be unavailable (private mode); keep the default.
    }
  }, []);

  // Day grouping. Restored after mount the same way as the view mode above.
  useLayoutEffect(() => {
    try {
      const storedGrouping = localStorage.getItem(DAY_GROUPING_STORAGE_KEY);
      if (storedGrouping === "true" || storedGrouping === "false") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setGroupByDay(storedGrouping === "true");
      }
    } catch {
      // localStorage may be unavailable (private mode); keep the default.
    }
  }, []);

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionView | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingTransaction, setDeletingTransaction] =
    useState<TransactionView | null>(null);

  // The viewed period is part of the request, not a client-side slice over the
  // first page. The endpoint returns exactly this window, and `fetchAll` pages
  // through every row in it, so the list, search, type filter, and Summary all
  // see the complete period even when it exceeds one page. `accountId` narrows
  // the same request to one account.
  const dateRange = useMemo(
    () => getDateRange(viewMode, refDate),
    [viewMode, refDate],
  );

  const query = useMemo(() => {
    const params = new URLSearchParams({
      from: dateRange.from,
      to: dateRange.to,
    });
    if (accountId) params.set("accountId", accountId);
    return params.toString();
  }, [accountId, dateRange]);

  const {
    data: transactions,
    response,
    isLoading,
    isRefreshing,
    error,
    refetch,
  } = useWorkspaceCollection<TransactionView, TransactionListResponse>({
    workspaceId: activeWorkspaceId,
    getPath: (id) => `/api/v1/workspaces/${id}/transactions`,
    query,
    // Pull every page of the window; a period wider than one page must not
    // silently drop rows from the list or the Summary totals.
    fetchAll: { getTotal: (data) => data.total, pageSize: 100 },
    select: (data) => data.transactions ?? [],
    fallbackMessage: "Failed to load transactions. Please try again.",
  });

  const handleTransactionChanged = () => {
    void refetch();
    onTransactionChanged?.();
  };

  // The period is enforced server-side, so only the in-memory type filter and
  // search narrow the (already complete) period rows here.
  const filteredTransactions = useMemo(() => {
    let result = transactions.filter(
      (t) => typeFilter === "ALL" || t.type === typeFilter,
    );

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
  }, [transactions, typeFilter, searchQuery]);

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

  // A period change re-runs the fetch but keeps the previous payload, so only
  // the first load (and workspace switches) should show the full skeleton;
  // later refetches keep the list on screen and signal pending via `aria-busy`.
  const isInitialLoading = isLoading && !isRefreshing;

  // Whether this scope has any transactions at all, regardless of the period in
  // view, so an empty account is not reported as an empty period.
  const hasAnyTransactions = (response?.scopeTotal ?? 0) > 0;

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

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      // localStorage may be unavailable (private mode); ignore gracefully.
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 sm:gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        {header ?? (
          <h1 className="text-xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h1>
        )}
        <Button
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          aria-label={
            createDisabled
              ? "New transaction (account archived)"
              : "New transaction"
          }
          className="h-9 w-9 shrink-0 px-0 sm:h-8 sm:w-auto sm:px-2.5"
          disabled={createDisabled}
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">New transaction</span>
        </Button>
      </div>

      {/* View Mode + Date Navigation */}
      {!isInitialLoading && (
        <div className="flex items-center gap-2 sm:justify-between">
          {/* View mode pills */}
          <div className="flex shrink-0 gap-0.5 rounded-lg bg-muted p-1 sm:gap-1">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode}
                onClick={() => handleViewModeChange(mode)}
                aria-label={mode.charAt(0).toUpperCase() + mode.slice(1)}
                aria-pressed={viewMode === mode}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors sm:px-3 ${
                  viewMode === mode
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="sm:hidden">{mode.charAt(0).toUpperCase()}</span>
                <span className="hidden sm:inline">
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </span>
              </button>
            ))}
          </div>

          {/* Date navigation */}
          <div className="flex min-w-0 flex-1 items-center justify-between gap-1 sm:flex-none sm:justify-center sm:gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setRefDate((d) => navigateDate(viewMode, d, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-0 flex-1 truncate text-center text-sm font-medium sm:min-w-45 sm:flex-none">
              {formatPeriodLabel(viewMode, refDate)}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setRefDate((d) => navigateDate(viewMode, d, 1))}
              disabled={isToday}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isToday && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 shrink-0 px-0 sm:w-auto sm:px-2"
                onClick={() => setRefDate(new Date())}
                aria-label="Today"
              >
                <RotateCcw className="h-3 w-3 sm:mr-1" />
                <span className="sr-only sm:not-sr-only">Today</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Search and less-used list controls */}
      {!isInitialLoading && transactions.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <TransactionSearch value={searchQuery} onChange={setSearchQuery} />
          </div>
          <TransactionActions
            field={sortField}
            direction={sortDirection}
            grouped={groupByDay}
            filter={typeFilter}
            onSortChange={(field, direction) => {
              setSortField(field);
              setSortDirection(direction);
            }}
            onGroupingChange={handleGroupingChange}
            onFilterChange={setTypeFilter}
          />
        </div>
      )}

      {/* Summary */}
      {!isInitialLoading && filteredTransactions.length > 0 && (
        <Card className="hidden gap-0 py-1.5 sm:flex">
          <CardContent className="grid grid-cols-3 gap-x-2 px-4 py-2 sm:gap-4 sm:py-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Income</span>
              <span className="truncate text-sm font-semibold tabular-nums text-emerald-600">
                {formatCurrency(summary.totalIncome)}
              </span>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Expense</span>
              <span className="truncate text-sm font-semibold tabular-nums text-red-600">
                {formatCurrency(summary.totalExpense)}
              </span>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Net</span>
              <span
                className={`truncate text-sm font-semibold tabular-nums ${
                  summary.net >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {formatCurrency(summary.net)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isInitialLoading && (
        <Card className="flex-1 min-h-0 overflow-hidden p-1.5 md:p-0">
          <div className="flex-1 min-h-0 px-1.5 overflow-y-auto md:px-0">
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

      {/* Empty State — this scope has no transactions at all */}
      {!isInitialLoading &&
        transactions.length === 0 &&
        !hasAnyTransactions && (
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

      {/* Empty State — this scope has transactions, but none in this period */}
      {!isInitialLoading && transactions.length === 0 && hasAnyTransactions && (
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

      {/* Empty State — type filter or search removed every row in the period */}
      {!isInitialLoading &&
        transactions.length > 0 &&
        filteredTransactions.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <EmptyStateIllustration icon="no-period" className="mb-4" />
            <p className="text-center text-lg font-medium">
              No matching transactions
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Try clearing the search or changing the type filter.
            </p>
          </div>
        )}

      {/* Transaction List */}
      {!isInitialLoading && sortedTransactions.length > 0 && (
        <div
          className={`flex flex-col gap-2 min-h-0 flex-1 transition-opacity ${
            isRefreshing ? "opacity-60" : ""
          }`}
          aria-busy={isRefreshing}
        >
          {/* Separator */}
          <Separator className="my-1" />

          {/* Scrollable transaction list */}
          <Card className="flex-1 min-h-0 overflow-hidden p-0 md:p-0">
            <div className="flex-1 min-h-0 px-1.5 overflow-y-auto md:px-0">
              {/* Mobile: one card per transaction, under a day heading when grouped */}
              <div className="space-y-1.5 py-2 md:hidden">
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
        onCreated={handleTransactionChanged}
        defaultAccountId={defaultAccountId}
      />
      <EditTransactionDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        transaction={editingTransaction}
        onUpdated={handleTransactionChanged}
      />
      <DeleteTransactionDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        transaction={deletingTransaction}
        onDeleted={handleTransactionChanged}
      />
    </div>
  );
}
