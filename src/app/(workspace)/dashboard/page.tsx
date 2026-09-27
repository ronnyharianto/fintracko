"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, TrendingUp } from "lucide-react";
import { useWorkspace } from "@/components/shared/workspace/workspace-context";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { useWorkspaceCollection } from "@/lib/hooks/use-workspace-collection";
import type { BudgetView } from "@/features/budgets/types";
import type { DashboardSummary } from "@/features/analytics/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DonutChart } from "@/components/ui/donut-chart";
import {
  FilterPills,
  type FilterPillOption,
} from "@/components/ui/filter-pills";
import { LineChart } from "@/components/ui/line-chart";
import { Skeleton } from "@/components/ui/skeleton";

/** Minimum bar width so a small nonzero usage still reads as a sliver. */
const MIN_VISIBLE_BAR_PERCENT = 3;

/** Categories shown when the expense breakdown is limited to the top few. */
const TOP_EXPENSE_CATEGORIES = 5;

/**
 * Months plotted on mobile so point labels stay legible on a narrow screen.
 * Three leaves room for long amounts (up to the billions) without the labels
 * touching; the chart reserves edge space for the widest one.
 */
const MOBILE_TREND_MONTHS = 3;

/**
 * Dashboard amounts are rounded to whole units: this is a monitoring view, so
 * cents add width and noise without changing how anything reads. Exact
 * decimals remain available on the budgets and accounts pages.
 */
function formatAmount(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

type BreakdownRange = "top" | "all";

const BREAKDOWN_RANGE_OPTIONS: readonly FilterPillOption<BreakdownRange>[] = [
  { value: "top", label: `Top ${TOP_EXPENSE_CATEGORIES}` },
  { value: "all", label: "All" },
];

export default function DashboardPage() {
  const { activeWorkspaceId, workspaces } = useWorkspace();
  const isMobile = useIsMobile();

  const [breakdownRange, setBreakdownRange] = useState<BreakdownRange>("top");

  const { response, isLoading, error, refetch } = useWorkspaceCollection<
    DashboardSummary,
    DashboardSummary
  >({
    workspaceId: activeWorkspaceId,
    getPath: (id) => `/api/v1/workspaces/${id}/dashboard/summary`,
    select: (data) => (data ? [data] : []),
    fallbackMessage: "Failed to load the dashboard. Please try again.",
  });

  const monthLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [],
  );

  const workspaceName = useMemo(
    () =>
      workspaces.find((workspace) => workspace.id === activeWorkspaceId)?.name,
    [workspaces, activeWorkspaceId],
  );

  const expenseSlices = useMemo(() => {
    if (!response) return [];
    return response.expenseBreakdown.map((slice) => ({
      label: slice.categoryName,
      value: Number(slice.amount),
    }));
  }, [response]);

  const expenseTotal = useMemo(
    () => expenseSlices.reduce((sum, slice) => sum + slice.value, 0),
    [expenseSlices],
  );

  // Limited to the top categories when requested; shares stay relative to the
  // full month total via the donut's `total` prop.
  const visibleExpenseSlices = useMemo(
    () =>
      breakdownRange === "top"
        ? expenseSlices.slice(0, TOP_EXPENSE_CATEGORIES)
        : expenseSlices,
    [expenseSlices, breakdownRange],
  );

  // Mobile shows only the most recent months at a phone-sized scale; desktop
  // keeps the full window. The headline figures follow what is plotted so the
  // "since" range always matches the chart.
  const visibleTrend = useMemo(() => {
    if (!response) return [];
    return isMobile
      ? response.balanceTrend.slice(-MOBILE_TREND_MONTHS)
      : response.balanceTrend;
  }, [response, isMobile]);

  const trendPoints = useMemo(
    () =>
      visibleTrend.map((point) => ({
        label: point.label,
        axisLabel: point.axisLabel,
        value: Number(point.balance),
      })),
    [visibleTrend],
  );

  const balanceSummary = useMemo(() => {
    if (visibleTrend.length === 0) return null;
    const first = visibleTrend[0];
    const latest = visibleTrend[visibleTrend.length - 1];
    return {
      latest: Number(latest.balance),
      change: Number(latest.balance) - Number(first.balance),
      sinceLabel: first.label,
    };
  }, [visibleTrend]);

  if (!activeWorkspaceId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">
          Select a workspace to view your dashboard.
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
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          {workspaceName ? `${workspaceName} · ` : ""}
          {monthLabel}
        </p>
      </div>

      {isLoading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="gap-4 py-5">
              <div className="space-y-3 px-6">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && response && (
        <div className="grid gap-4 lg:grid-cols-2">
          <TopBudgetsCard
            title="Top 5 Monthly Budgets"
            subtitle="Closest to exhaustion this month"
            budgets={response.topMonthly}
          />
          <TopBudgetsCard
            title="Top 5 Yearly Budgets"
            subtitle="Closest to exhaustion this year"
            budgets={response.topYearly}
          />

          <CollapsibleCard
            title="Expense Breakdown"
            subtitle="By category this month"
          >
            <div className="space-y-4">
              {expenseSlices.length > TOP_EXPENSE_CATEGORIES && (
                <div className="flex justify-end">
                  <FilterPills
                    options={BREAKDOWN_RANGE_OPTIONS}
                    value={breakdownRange}
                    onChange={setBreakdownRange}
                    ariaLabel="Number of expense categories shown"
                  />
                </div>
              )}
              <DonutChart
                slices={visibleExpenseSlices}
                total={expenseTotal}
                centerLabel="Total spent"
                centerValue={formatAmount(expenseTotal)}
                valueFormatter={formatAmount}
                emptyMessage="No expenses recorded this month."
              />
            </div>
          </CollapsibleCard>

          <CollapsibleCard
            title="Balance Trend"
            subtitle="Net balance at each month end"
          >
            {balanceSummary && (
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-2xl font-semibold tabular-nums">
                  {formatAmount(balanceSummary.latest)}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium tabular-nums",
                    balanceSummary.change >= 0
                      ? "text-emerald-600"
                      : "text-red-600",
                  )}
                >
                  {balanceSummary.change >= 0 ? "+" : ""}
                  {formatAmount(balanceSummary.change)} since{" "}
                  {balanceSummary.sinceLabel}
                </span>
              </div>
            )}
            <LineChart
              points={trendPoints}
              valueFormatter={formatAmount}
              showValueLabels={false}
              compact={isMobile}
              emptyMessage="No accounts to trend yet."
            />
            {trendPoints.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Hover or tap a point for the exact amount.
              </p>
            )}
          </CollapsibleCard>
        </div>
      )}
    </div>
  );
}

/**
 * Dashboard card whose header toggles the body open and closed. The header
 * stays a fixed height so collapsing never shifts the surrounding grid.
 *
 * Cards start collapsed on mobile so the dashboard reads as a scannable list
 * of headers; a manual toggle wins over the viewport default from then on.
 */
function CollapsibleCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const isMobile = useIsMobile();
  const [toggleOverride, setToggleOverride] = useState<boolean | null>(null);
  const expanded = toggleOverride ?? !isMobile;
  const contentId = useId();

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <button
        type="button"
        onClick={() => setToggleOverride(!expanded)}
        aria-expanded={expanded}
        aria-controls={contentId}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-6 py-5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="min-w-0">
          <span className="block text-base font-semibold leading-none">
            {title}
          </span>
          <span className="mt-1.5 block text-sm text-muted-foreground">
            {subtitle}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            !expanded && "-rotate-90",
          )}
        />
      </button>

      {expanded && (
        <div id={contentId} className="px-6 pb-5">
          {children}
        </div>
      )}
    </Card>
  );
}

function TopBudgetsCard({
  title,
  subtitle,
  budgets,
}: {
  title: string;
  subtitle: string;
  budgets: BudgetView[];
}) {
  return (
    <CollapsibleCard title={title} subtitle={subtitle}>
      {budgets.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          No budgets to show.
        </div>
      ) : (
        <ul className="space-y-4">
          {budgets.map((budget) => (
            <TopBudgetRow key={budget.id} budget={budget} />
          ))}
        </ul>
      )}
    </CollapsibleCard>
  );
}

function TopBudgetRow({ budget }: { budget: BudgetView }) {
  const spent = Number(budget.spent);
  const limit = Number(budget.limit);
  const isOver = budget.utilization > 100;
  const clampedPercent = Math.min(Math.max(budget.utilization, 0), 100);
  const barPercent =
    spent > 0 ? Math.max(clampedPercent, MIN_VISIBLE_BAR_PERCENT) : 0;

  const barColor = isOver
    ? "bg-red-500"
    : budget.utilization >= 80
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <li className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {budget.subCategoryName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {budget.categoryName}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 text-xs font-medium tabular-nums",
            isOver ? "text-red-600" : "text-muted-foreground",
          )}
        >
          {budget.utilization.toFixed(1)}% used
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clampedPercent)}
        aria-label={`${budget.subCategoryName} utilization`}
      >
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${barPercent}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {formatAmount(spent)} of {formatAmount(limit)}
      </p>
    </li>
  );
}
