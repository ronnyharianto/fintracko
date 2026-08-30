"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/components/shared/workspace/workspace-context";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import type { TransactionView, TransactionType } from "@/features/transactions/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { CreateTransactionDialog } from "./_components/create-transaction-dialog";
import { EditTransactionDialog } from "./_components/edit-transaction-dialog";
import { DeleteTransactionDialog } from "./_components/delete-transaction-dialog";
import { TransactionRow } from "./_components/transaction-row";
import { TransactionFilters } from "./_components/transaction-filters";

// ---------------------------------------------------------------------------
// View mode & date range helpers
// ---------------------------------------------------------------------------

type ViewMode = "day" | "week" | "month";

/** Parse a YYYY-MM-DD string to a local Date (no timezone shift). */
function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Format a Date to YYYY-MM-DD. */
function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Get the start and end dates for a given view mode and reference date. */
function getDateRange(mode: ViewMode, refDate: Date): { from: string; to: string } {
  const start = new Date(refDate);
  const end = new Date(refDate);

  if (mode === "day") {
    // Single day
  } else if (mode === "week") {
    // Week: Monday to Sunday
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday = 0
    start.setDate(start.getDate() - diff);
    end.setDate(start.getDate() + 6);
  } else {
    // Month: first day to last day
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
  }

  return { from: toISODate(start), to: toISODate(end) };
}

/** Format the period label for display. */
function formatPeriodLabel(mode: ViewMode, refDate: Date): string {
  if (mode === "day") {
    return refDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (mode === "week") {
    const { from, to } = getDateRange("week", refDate);
    const start = parseDate(from);
    const end = parseDate(to);
    const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${startStr} – ${endStr}`;
  }

  // Month
  return refDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Navigate the reference date by a given mode and direction. */
function navigateDate(mode: ViewMode, refDate: Date, direction: -1 | 1): Date {
  const next = new Date(refDate);
  if (mode === "day") {
    next.setDate(next.getDate() + direction);
  } else if (mode === "week") {
    next.setDate(next.getDate() + direction * 7);
  } else {
    next.setMonth(next.getMonth() + direction);
  }
  return next;
}

/** Check if two dates are in the same period. */
function isSamePeriod(mode: ViewMode, a: Date, b: Date): boolean {
  if (mode === "day") {
    return toISODate(a) === toISODate(b);
  }
  if (mode === "week") {
    return getDateRange("week", a).from === getDateRange("week", b).from;
  }
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

/** Group transactions by date. */
function groupByDate(transactions: TransactionView[]) {
  const groups: Record<string, TransactionView[]> = {};
  for (const t of transactions) {
    const dateKey = t.date;
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(t);
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function TransactionsPage() {
  const { activeWorkspaceId } = useWorkspace();

  const [transactions, setTransactions] = useState<TransactionView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View mode & date navigation
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [refDate, setRefDate] = useState(() => new Date());

  // Filters
  const [typeFilter, setTypeFilter] = useState<TransactionType | "ALL">("ALL");

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionView | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState<TransactionView | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!activeWorkspaceId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch<{ transactions: TransactionView[]; total: number }>(
        `/api/v1/workspaces/${activeWorkspaceId}/transactions`,
      );
      setTransactions(data.transactions || []);
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Failed to load transactions. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!activeWorkspaceId || cancelled) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ transactions: TransactionView[]; total: number }>(
          `/api/v1/workspaces/${activeWorkspaceId}/transactions`,
        );
        if (!cancelled) setTransactions(data.transactions || []);
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof ApiClientError
              ? err.message
              : "Failed to load transactions. Please try again.";
          setError(message);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId]);

  // Compute date range for current view
  const dateRange = useMemo(() => getDateRange(viewMode, refDate), [viewMode, refDate]);

  // Filter transactions by date range and type
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const inRange = t.date >= dateRange.from && t.date <= dateRange.to;
      const matchesType = typeFilter === "ALL" || t.type === typeFilter;
      return inRange && matchesType;
    });
  }, [transactions, dateRange, typeFilter]);

  const groupedTransactions = useMemo(() => groupByDate(filteredTransactions), [filteredTransactions]);

  // Summary for the filtered period
  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    for (const t of filteredTransactions) {
      const amount = parseFloat(t.amount) || 0;
      if (t.type === "INCOME") totalIncome += amount;
      if (t.type === "EXPENSE") totalExpense += amount;
    }
    return { totalIncome, totalExpense, net: totalIncome - totalExpense };
  }, [filteredTransactions]);

  const formatCurrency = (value: number) =>
    value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (dateStr: string) => {
    const date = parseDate(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isToday = isSamePeriod(viewMode, refDate, new Date());

  if (!activeWorkspaceId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <ArrowRightLeft className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Select a workspace to view transactions.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => void fetchTransactions()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Transactions</h1>
          {!isLoading && (
            <p className="text-3xl font-bold tracking-tight sm:text-4xl">
              {formatCurrency(summary.net)}
            </p>
          )}
        </div>
        <div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Transaction
          </Button>
        </div>
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
            <span className="min-w-0 flex-1 text-center text-sm font-medium sm:min-w-[180px] sm:flex-none">
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

      {/* Summary Cards */}
      {!isLoading && filteredTransactions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(summary.totalIncome)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expense</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpense)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${summary.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatCurrency(summary.net)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Type Filter */}
      {!isLoading && transactions.length > 0 && (
        <TransactionFilters value={typeFilter} onChange={setTypeFilter} />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
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
      )}

      {/* Empty State — no transactions at all */}
      {!isLoading && transactions.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <ArrowRightLeft className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-center text-lg font-medium">No transactions yet</p>
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Create a transaction to start tracking your finances.
          </p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Transaction
          </Button>
        </div>
      )}

      {/* Empty State — no transactions in this period */}
      {!isLoading && transactions.length > 0 && filteredTransactions.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <ArrowRightLeft className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-center text-lg font-medium">No transactions in this period</p>
          <p className="text-center text-sm text-muted-foreground">
            Try a different date range or create a new transaction.
          </p>
        </div>
      )}

      {/* Transaction List grouped by date */}
      {!isLoading && groupedTransactions.length > 0 && (
        <div className="space-y-4">
          {groupedTransactions.map(([dateKey, txns]) => (
            <Card key={dateKey}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {formatDate(dateKey)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0 divide-y">
                {txns.map((txn) => (
                  <TransactionRow
                    key={txn.id}
                    transaction={txn}
                    onEdit={(t) => {
                      setEditingTransaction(t);
                      setIsEditOpen(true);
                    }}
                    onDelete={(t) => {
                      setDeletingTransaction(t);
                      setIsDeleteOpen(true);
                    }}
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateTransactionDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={() => void fetchTransactions()}
      />
      <EditTransactionDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        transaction={editingTransaction}
        onUpdated={() => void fetchTransactions()}
      />
      <DeleteTransactionDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        transaction={deletingTransaction}
        onDeleted={() => void fetchTransactions()}
      />
    </div>
  );
}
