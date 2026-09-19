"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  Plus,
} from "lucide-react";
import { useWorkspace } from "@/components/shared/workspace/workspace-context";
import { useWorkspaceCollection } from "@/lib/hooks/use-workspace-collection";
import type {
  BudgetListResponse,
  BudgetView,
} from "@/features/budgets/types";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { BudgetCard } from "./_components/budget-card";
import { BudgetFilters, type IntervalFilter } from "./_components/budget-filters";
import {
  formatViewLabel,
  getViewRange,
  isCurrentView,
  navigateView,
  type BudgetViewMode,
} from "./_components/budget-view-period";
import { CreateBudgetDialog } from "./_components/create-budget-dialog";
import { EditBudgetDialog } from "./_components/edit-budget-dialog";
import { BudgetGrouping } from "./_components/budget-grouping";
import { BudgetSection } from "./_components/budget-section";
import {
  buildCategorySections,
  sortBudgets,
} from "./_components/budget-sections";
import { DeleteBudgetDialog } from "./_components/delete-budget-dialog";

const VIEW_MODES: { value: BudgetViewMode; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

/**
 * Persisted alongside the other stored client preferences (`theme`,
 * `fintracko_active_workspace_id`, `fintracko_transactions_group_by_day`).
 */
const GROUPING_STORAGE_KEY = "fintracko_budgets_group_by_category";
const GROUPING_DEFAULT = true;

export default function BudgetsPage() {
  const { activeWorkspaceId } = useWorkspace();

  const [viewMode, setViewMode] = useState<BudgetViewMode>("month");
  const [refDate, setRefDate] = useState(() => new Date());
  const [intervalFilter, setIntervalFilter] = useState<IntervalFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Grouping preference. Restored after mount rather than in the initial state:
  // localStorage is unavailable during the server render, so reading it there
  // would make the first client render disagree with the server's HTML.
  const [groupByCategory, setGroupByCategory] = useState(GROUPING_DEFAULT);
  // Sections open folded, so the page reads as a scannable set of category
  // totals first. This tracks the ones the user has opened during the session.
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem(GROUPING_STORAGE_KEY);
      if (stored === "true" || stored === "false") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setGroupByCategory(stored === "true");
      }
    } catch {
      // localStorage may be unavailable (private mode); keep the default.
    }
  }, []);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetView | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingBudget, setDeletingBudget] = useState<BudgetView | null>(null);

  // The server resolves the viewed window: it decides which budgets are in
  // play and, for each, which periods the limit and spend measure against.
  const range = useMemo(
    () => getViewRange(viewMode, refDate),
    [viewMode, refDate],
  );
  const query = useMemo(
    () => new URLSearchParams({ from: range.from, to: range.to }).toString(),
    [range],
  );

  const {
    data: budgets,
    response,
    isLoading,
    error,
    refetch,
  } = useWorkspaceCollection<BudgetView, BudgetListResponse>({
    workspaceId: activeWorkspaceId,
    getPath: (id) => `/api/v1/workspaces/${id}/budgets`,
    query,
    select: (data) => data.budgets ?? [],
    fallbackMessage: "Failed to load budgets. Please try again.",
  });

  // Whether the workspace has any budget at all, so an empty month keeps the
  // period navigation instead of stranding the user.
  const hasAnyBudget = (response?.totalInWorkspace ?? 0) > 0;

  const visibleBudgets = useMemo(() => {
    const byInterval =
      intervalFilter === "ALL"
        ? budgets
        : budgets.filter((budget) => budget.interval === intervalFilter);

    const term = searchQuery.trim().toLowerCase();
    if (!term) return byInterval;

    return byInterval.filter(
      (budget) =>
        budget.subCategoryName.toLowerCase().includes(term) ||
        budget.categoryName.toLowerCase().includes(term),
    );
  }, [budgets, intervalFilter, searchQuery]);

  const summary = useMemo(() => {
    const totalBudgeted = visibleBudgets.reduce(
      (sum, budget) => sum + Number(budget.limit),
      0,
    );
    const totalSpent = visibleBudgets.reduce(
      (sum, budget) => sum + Number(budget.spent),
      0,
    );
    return {
      count: visibleBudgets.length,
      totalBudgeted,
      totalSpent,
      utilization: totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0,
    };
  }, [visibleBudgets]);

  // Alphabetical in both layouts; the sections sort their own cards the same
  // way, so grouping and flattening never disagree about order.
  const orderedBudgets = useMemo(
    () => sortBudgets(visibleBudgets),
    [visibleBudgets],
  );

  const sections = useMemo(
    () => buildCategorySections(visibleBudgets),
    [visibleBudgets],
  );

  const isCurrent = isCurrentView(viewMode, refDate);

  const handleEdit = (budget: BudgetView) => {
    setEditingBudget(budget);
    // Opening a dialog from a dropdown item can leave body pointer-events stuck
    // (Radix issue #3317); defer so the menu cleanup runs before the dialog opens.
    window.setTimeout(() => setIsEditOpen(true), 0);
  };

  const handleDelete = (budget: BudgetView) => {
    setDeletingBudget(budget);
    window.setTimeout(() => setIsDeleteOpen(true), 0);
  };

  const handleGroupingChange = (grouped: boolean) => {
    setGroupByCategory(grouped);
    try {
      localStorage.setItem(GROUPING_STORAGE_KEY, String(grouped));
    } catch {
      // localStorage may be unavailable (private mode); ignore gracefully.
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  if (!activeWorkspaceId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <PiggyBank className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">
          Select a workspace to view budgets.
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Budgets
        </h1>
        <Button
          onClick={() => setIsCreateOpen(true)}
          aria-label="New Budget"
          className="shrink-0 gap-2"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Budget</span>
        </Button>
      </div>

      {!isLoading && hasAnyBudget && (
        <>
          {/* View mode + period navigation */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:flex sm:w-auto">
              {VIEW_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setViewMode(mode.value)}
                  aria-pressed={viewMode === mode.value}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === mode.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-center">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setRefDate((d) => navigateView(viewMode, d, -1))}
                aria-label={`Previous ${viewMode}`}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-0 flex-1 text-center text-sm font-medium sm:min-w-40 sm:flex-none">
                {formatViewLabel(viewMode, refDate)}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setRefDate((d) => navigateView(viewMode, d, 1))}
                aria-label={`Next ${viewMode}`}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {!isCurrent && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setRefDate(new Date())}
                >
                  <CalendarDays className="mr-1 h-3 w-3" />
                  This {viewMode}
                </Button>
              )}
            </div>
          </div>

          {/* Search + grouping toggle */}
          <div className="flex items-center gap-2">
            <SearchInput
              className="min-w-0 flex-1"
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search budgets..."
              ariaLabel="Search budgets"
            />
            <BudgetGrouping
              grouped={groupByCategory}
              onChange={handleGroupingChange}
            />
          </div>

          {/* Interval filter */}
          <BudgetFilters
            interval={intervalFilter}
            onIntervalChange={setIntervalFilter}
          />

          {/* Summary for the visible set */}
          {summary.count > 0 && (
            <Card className="gap-3 py-5">
              <div className="space-y-3 px-6">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium">
                    Budgets in this period
                  </span>
                  <Badge className="tabular-nums">{summary.count}</Badge>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 tabular-nums">
                  <span className="text-2xl font-semibold leading-none">
                    {formatCurrency(summary.totalSpent)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    of {formatCurrency(summary.totalBudgeted)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${
                      summary.utilization > 100
                        ? "bg-red-500"
                        : summary.utilization >= 80
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    }`}
                    style={{
                      width: `${Math.min(Math.max(summary.utilization, 0), 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {summary.utilization.toFixed(1)}% of these budgets used
                </p>
              </div>
            </Card>
          )}
          {summary.count > 0 && <Separator className="my-1" />}
        </>
      )}

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="gap-3 py-4">
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && !hasAnyBudget && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <PiggyBank className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-center text-lg font-medium">No budgets yet</p>
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Set a spending limit for an expense subcategory to track it here.
          </p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Budget
          </Button>
        </div>
      )}

      {!isLoading && hasAnyBudget && budgets.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <CalendarDays className="mb-4 h-10 w-10 text-muted-foreground" />
          <p className="text-center text-lg font-medium">
            No budgets in this {viewMode}
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Use the arrows to review another {viewMode}.
          </p>
        </div>
      )}

      {!isLoading && budgets.length > 0 && visibleBudgets.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            {searchQuery.trim() ? (
              <>
                <p className="text-center text-lg font-medium">
                  No budgets match your search
                </p>
                <p className="text-center text-sm text-muted-foreground">
                  Try a different term, or clear the search.
                </p>
              </>
            ) : (
              <>
                <p className="text-center text-lg font-medium">
                  No {intervalFilter.toLowerCase()} budgets in this {viewMode}
                </p>
                <p className="text-center text-sm text-muted-foreground">
                  Switch the interval filter to see the others.
                </p>
              </>
            )}
          </div>
        )}

      {!isLoading && visibleBudgets.length > 0 && groupByCategory && (
        <div className="space-y-2">
          {sections.map((section) => (
            <BudgetSection
              key={section.categoryId}
              section={section}
              expanded={expandedCategories.has(section.categoryId)}
              onToggle={() => toggleCategory(section.categoryId)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {!isLoading && visibleBudgets.length > 0 && !groupByCategory && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {orderedBudgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <CreateBudgetDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={() => void refetch()}
        initialStartDate={range.from}
      />
      <EditBudgetDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        budget={editingBudget}
        onUpdated={() => void refetch()}
      />
      <DeleteBudgetDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        budget={deletingBudget}
        onDeleted={() => void refetch()}
      />
    </div>
  );
}
