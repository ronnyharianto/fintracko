"use client";

/**
 * Analytics page.
 *
 * Deeper than the dashboard's expense breakdown: browse any transaction type
 * (expense, income, transfer) by month, see the distribution by parent
 * category, drill into a category for its subcategory split, and compare
 * against a rolling monthly trend.
 */

import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import type { TransactionType } from "@/features/transactions/types";
import { useWorkspace } from "@/components/shared/workspace/workspace-context";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { useWorkspaceCollection } from "@/lib/hooks/use-workspace-collection";
import type { AnalyticsSummary } from "@/features/analytics/types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  formatPeriodLabel,
  getDateRange,
  navigateDate,
} from "@/lib/date-period";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DonutChart } from "@/components/ui/donut-chart";
import {
  FilterPills,
  type FilterPillOption,
} from "@/components/ui/filter-pills";
import { LineChart } from "@/components/ui/line-chart";

type AnalyticsType = TransactionType;

const TYPE_OPTIONS: readonly FilterPillOption<AnalyticsType>[] = [
  { value: "EXPENSE", label: "Expense" },
  { value: "INCOME", label: "Income" },
  { value: "TRANSFER", label: "Transfer" },
];

/** Plural noun for the selected type, used in captions and empty states. */
const TYPE_NOUN: Record<AnalyticsType, string> = {
  EXPENSE: "expenses",
  INCOME: "income",
  TRANSFER: "transfers",
};

/**
 * Months plotted on mobile so point labels stay legible on a narrow screen.
 * Matches the dashboard's trend window for a consistent mobile experience.
 */
const MOBILE_TREND_MONTHS = 3;

/** Whole units: analytics is a monitoring view, so cents only add noise. */
function formatAmount(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/**
 * Type and month of the payload on screen. Charts render from this rather
 * than the pending selection, so a refetch never labels stale data with the
 * new filter's type or month.
 */
interface PayloadIdentity {
  type: AnalyticsType;
  /** First day of the payload's window, `YYYY-MM-DD`. */
  from: string;
}

function samePayloadIdentity(
  a: PayloadIdentity,
  b: PayloadIdentity,
): boolean {
  return a.type === b.type && a.from === b.from;
}

/** Parse a YYYY-MM-DD string to a local Date (no timezone shift). */
function parseDay(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Check if two dates fall in the same calendar month. */
function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export default function AnalyticsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const isMobile = useIsMobile();

  const [type, setType] = useState<AnalyticsType>("EXPENSE");
  const [refDate, setRefDate] = useState(() => new Date());
  // Drill-down state is stamped with the current view key, so changing the
  // type or month resets it without a state-syncing effect.
  const [drill, setDrill] = useState<{
    key: string;
    categoryId: string;
  } | null>(null);

  const range = useMemo(() => getDateRange("month", refDate), [refDate]);
  const viewKey = `${type}|${range.from}`;

  const query = useMemo(
    () =>
      new URLSearchParams({
        type,
        from: range.from,
        to: range.to,
      }).toString(),
    [type, range],
  );

  const { response, isLoading, isRefreshing, error, refetch } =
    useWorkspaceCollection<AnalyticsSummary, AnalyticsSummary>({
    workspaceId: activeWorkspaceId,
    getPath: (id) => `/api/v1/workspaces/${id}/analytics/summary`,
    query,
    select: (data) => (data ? [data] : []),
    fallbackMessage: "Failed to load analytics. Please try again.",
  });

  // What is on screen. `response` survives query refetches, so charts keep
  // rendering the previous month/type while the new one loads.
  const loaded = response;
  const isStale =
    isRefreshing &&
    loaded !== null &&
    !samePayloadIdentity(loaded, { type, from: range.from });
  const loadedIdentity: PayloadIdentity = loaded ?? { type, from: range.from };

  const drilledCategoryId = drill?.key === viewKey ? drill.categoryId : null;
  const drilledCategory = useMemo(
    () =>
      loaded?.categories.find(
        (category) => category.id === drilledCategoryId,
      ) ?? null,
    [loaded, drilledCategoryId],
  );

  // The donut shows level-2 slices once drilled into a category, level-1
  // slices otherwise.
  const slices = useMemo(() => {
    if (!loaded) return [];
    const level = drilledCategory
      ? drilledCategory.subCategories
      : loaded.categories;
    return level.map((slice) => ({
      label: slice.name,
      value: Number(slice.amount),
    }));
  }, [loaded, drilledCategory]);

  const donutTotal = drilledCategory
    ? Number(drilledCategory.amount)
    : Number(loaded?.total ?? 0);

  const trendPoints = useMemo(
    () =>
      (loaded?.trend ?? []).map((point) => ({
        label: point.label,
        axisLabel: point.axisLabel,
        value: Number(point.amount),
      })),
    [loaded],
  );

  // Mobile shows only the most recent months at a phone-sized scale; desktop
  // keeps the full six-month window.
  const visibleTrend = useMemo(
    () => (isMobile ? trendPoints.slice(-MOBILE_TREND_MONTHS) : trendPoints),
    [trendPoints, isMobile],
  );

  const isCurrent = isSameMonth(refDate, new Date());

  const canDrill =
    !drilledCategory &&
    (loaded?.categories.some(
      (category) => category.subCategories.length > 0,
    ) ??
      false);

  const handleSliceClick = (index: number) => {
    if (!loaded || drilledCategory) return;
    const category = loaded.categories[index];
    // Only drill when there is a subcategory level to show; otherwise the
    // donut would come up empty.
    if (category && category.subCategories.length > 0) {
      setDrill({ key: viewKey, categoryId: category.id });
    }
  };

  if (!activeWorkspaceId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">
          Select a workspace to view analytics.
        </p>
      </div>
    );
  }

  if (error && !loaded) {
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
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Analytics
          </h1>
          {isStale && (
            <>
              <Loader2
                className="h-4 w-4 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
              <span className="sr-only">Updating analytics…</span>
            </>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Browse {TYPE_NOUN[type]} by category and over time
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterPills
          options={TYPE_OPTIONS}
          value={type}
          onChange={setType}
          ariaLabel="Transaction type"
        />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              setRefDate((date) => navigateDate("month", date, -1))
            }
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-40 text-center text-sm font-medium">
            {formatPeriodLabel("month", refDate)}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setRefDate((date) => navigateDate("month", date, 1))}
            aria-label="Next month"
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
              This month
            </Button>
          )}
        </div>
      </div>

      {isLoading && !loaded && (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index} className="gap-4 py-5">
              <CardHeader className="px-6">
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="space-y-3 px-6">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="space-y-4">
          {error && loaded && (
            <div
              role="status"
              className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5"
            >
              <p className="flex items-center gap-2 text-sm text-destructive">
                <TriangleAlert
                  className="h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                {error}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() => void refetch()}
              >
                Retry
              </Button>
              <span className="sr-only">
                Still showing previously loaded analytics.
              </span>
            </div>
          )}

          {loaded && (
            <div
              className={cn(
                "space-y-4 transition-opacity duration-200",
                isRefreshing && "pointer-events-none opacity-60",
              )}
            >
              <Card className="gap-4 py-5">
                <CardHeader className="px-6">
                  <CardTitle className="text-base">
                    {drilledCategory ? "Subcategory breakdown" : "By category"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {samePayloadIdentity(loadedIdentity, {
                      type,
                      from: range.from,
                    })
                      ? drilledCategory
                        ? `${drilledCategory.name} · ${formatPeriodLabel(
                            "month",
                            refDate,
                          )}`
                        : `Level 1 categories · ${formatPeriodLabel(
                            "month",
                            refDate,
                          )}`
                      : `${TYPE_NOUN[loadedIdentity.type]} · ${formatPeriodLabel(
                          "month",
                          parseDay(loadedIdentity.from),
                        )}`}
                  </p>
                </CardHeader>
                <CardContent className="px-6">
              {drilledCategory ? (
                <div className="mb-4 flex items-center gap-1 text-sm">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setDrill(null)}
                  >
                    <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                    All categories
                  </Button>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate font-medium">
                    {drilledCategory.name}
                  </span>
                </div>
              ) : (
                canDrill && (
                  <p className="mb-4 text-xs text-muted-foreground">
                    Click a category to see its subcategories.
                  </p>
                )
              )}

              <DonutChart
                // Remount on level change so the donut's internal selection
                // does not carry a stale index into the new slice set.
                key={drilledCategoryId ?? "all"}
                slices={slices}
                total={donutTotal}
                showShare
                onSliceClick={canDrill ? handleSliceClick : undefined}
                centerLabel={
                  drilledCategory
                    ? "This category"
                    : `Total ${TYPE_NOUN[loadedIdentity.type]}`
                }
                centerValue={formatAmount(donutTotal)}
                valueFormatter={formatAmount}
                emptyMessage={`No ${TYPE_NOUN[loadedIdentity.type]} this month.`}
              />
            </CardContent>
          </Card>

          <Card className="gap-4 py-5">
            <CardHeader className="px-6">                  <CardTitle className="text-base">Trend</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Monthly {TYPE_NOUN[loadedIdentity.type]} over the last 6
                    months
                  </p>
            </CardHeader>
            <CardContent className="px-6">
              {/* Same behaviour as the dashboard's balance trend: the month
                  amounts stay hidden until the user hovers or taps a point. */}
              <LineChart
                points={visibleTrend}
                valueFormatter={formatAmount}
                showValueLabels={false}
                compact={isMobile}
                emptyMessage="No data to trend yet."
              />
              {visibleTrend.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Hover or tap a point for the exact amount.
                </p>
              )}
            </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
