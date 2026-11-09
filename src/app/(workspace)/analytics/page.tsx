"use client";

/**
 * Analytics page.
 *
 * Deeper than the dashboard's expense breakdown: browse any transaction type
 * (expense, income, transfer) by an arbitrary date range, see the distribution
 * by parent category, drill into a category for its subcategory split, and
 * compare against a trend for the selected window.
 *
 * The date range is echoed back by the API, so labels on stale data always
 * describe the payload that is actually on screen.
 */

import { useMemo, useState } from "react";
import {
  BarChart3,
  ChevronLeft,
  Loader2,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import type { TransactionType } from "@/features/transactions/types";
import type {
  AnalyticsGranularity,
  AnalyticsSummary,
  AnalyticsTrendPoint,
} from "@/features/analytics/types";
import { useWorkspace } from "@/components/shared/workspace/workspace-context";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { useWorkspaceCollection } from "@/lib/hooks/use-workspace-collection";
import { formatRangeLabel } from "@/features/analytics/periods";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getDateRange, toISODate } from "@/lib/date-period";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DonutChart } from "@/components/ui/donut-chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FilterPills,
  type FilterPillOption,
} from "@/components/ui/filter-pills";
import { LineChart } from "@/components/ui/line-chart";

type AnalyticsType = TransactionType;

type RangePreset =
  | "this-month"
  | "last-30"
  | "last-90"
  | "this-year"
  | "custom";

const TYPE_OPTIONS: readonly FilterPillOption<AnalyticsType>[] = [
  { value: "EXPENSE", label: "Expense" },
  { value: "INCOME", label: "Income" },
  { value: "TRANSFER", label: "Transfer" },
];

const RANGE_PRESETS: readonly FilterPillOption<RangePreset>[] = [
  { value: "this-month", label: "This month" },
  { value: "last-30", label: "Last 30 days" },
  { value: "last-90", label: "Last 90 days" },
  { value: "this-year", label: "This year" },
];

/** Plural noun for the selected type, used in captions and empty states. */
const TYPE_NOUN: Record<AnalyticsType, string> = {
  EXPENSE: "expenses",
  INCOME: "income",
  TRANSFER: "transfers",
};

/** Adjective for the trend bucket size. */
const GRANULARITY_LABEL: Record<AnalyticsGranularity, string> = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
};

/** Whole units: analytics is a monitoring view, so cents only add noise. */
function formatAmount(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function currentMonthRange(): { from: string; to: string } {
  return getDateRange("month", new Date());
}

function lastDaysRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));
  return { from: toISODate(from), to: toISODate(to) };
}

function currentYearRange(): { from: string; to: string } {
  const now = new Date();
  return {
    from: toISODate(new Date(now.getFullYear(), 0, 1)),
    to: toISODate(new Date(now.getFullYear(), 11, 31)),
  };
}

function rangeForPreset(
  preset: RangePreset,
): { from: string; to: string } | null {
  switch (preset) {
    case "this-month":
      return currentMonthRange();
    case "last-30":
      return lastDaysRange(30);
    case "last-90":
      return lastDaysRange(90);
    case "this-year":
      return currentYearRange();
    default:
      return null;
  }
}

/** Which preset (if any) the current range matches. */
function detectPreset(range: { from: string; to: string }): RangePreset {
  for (const preset of RANGE_PRESETS) {
    const candidate = rangeForPreset(preset.value);
    if (candidate?.from === range.from && candidate?.to === range.to) {
      return preset.value;
    }
  }
  return "custom";
}

/**
 * Blank axis labels when there are more buckets than the chart can label
 * legibly. The first and last buckets always keep a label, and tooltips keep
 * the full label for every point.
 */
function thinAxisLabels(
  points: AnalyticsTrendPoint[],
  maxLabels: number,
): AnalyticsTrendPoint[] {
  if (points.length <= maxLabels) return points;
  const step = Math.ceil((points.length - 1) / (maxLabels - 1));
  return points.map((point, index) => {
    const keep =
      index === 0 || index === points.length - 1 || index % step === 0;
    return keep ? point : { ...point, axisLabel: "" };
  });
}

export default function AnalyticsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const isMobile = useIsMobile();

  const [type, setType] = useState<AnalyticsType>("EXPENSE");
  const [range, setRange] = useState(currentMonthRange);
  // Drill-down state is stamped with the current view key, so changing the
  // type, range, or workspace resets it without a state-syncing effect.
  const [drill, setDrill] = useState<{
    key: string;
    categoryId: string;
  } | null>(null);

  const viewKey = `${activeWorkspaceId ?? ""}|${type}|${range.from}|${range.to}`;

  const query = useMemo(() => {
    const params = new URLSearchParams({
      type,
      from: range.from,
      to: range.to,
    });
    return params.toString();
  }, [type, range]);

  const { response, isLoading, isRefreshing, error, refetch } =
    useWorkspaceCollection<AnalyticsSummary, AnalyticsSummary>({
      workspaceId: activeWorkspaceId,
      getPath: (id) => `/api/v1/workspaces/${id}/analytics/summary`,
      query,
      select: (data) => (data ? [data] : []),
      fallbackMessage: "Failed to load analytics. Please try again.",
    });

  // What is on screen. `response` survives query refetches, so charts keep
  // rendering the previous range/type while the new selection loads.
  const loaded = response;
  const currentFilterKey = `${type}|${range.from}|${range.to}`;
  const loadedFilterKey = loaded
    ? `${loaded.type}|${loaded.from}|${loaded.to}`
    : null;
  const isStale =
    isRefreshing && loaded !== null && loadedFilterKey !== currentFilterKey;

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

  const trendPoints = useMemo(() => {
    const points = thinAxisLabels(loaded?.trend ?? [], isMobile ? 4 : 6);
    return points.map((point) => ({
      label: point.label,
      axisLabel: point.axisLabel,
      value: Number(point.amount),
    }));
  }, [loaded, isMobile]);

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

  const activePreset = detectPreset(range);
  const defaultRange = currentMonthRange();
  const isDefaultSelection =
    type === "EXPENSE" &&
    range.from === defaultRange.from &&
    range.to === defaultRange.to;

  const handleRangePreset = (preset: RangePreset) => {
    const next = rangeForPreset(preset);
    if (next) setRange(next);
  };

  const handleFromChange = (value: string) => {
    if (!value) return;
    setRange((current) => ({
      from: value,
      to: value > current.to ? value : current.to,
    }));
  };

  const handleToChange = (value: string) => {
    if (!value) return;
    setRange((current) => ({
      from: value < current.from ? value : current.from,
      to: value,
    }));
  };

  const handleReset = () => {
    setType("EXPENSE");
    setRange(currentMonthRange());
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

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FilterPills
            options={TYPE_OPTIONS}
            value={type}
            onChange={setType}
            ariaLabel="Transaction type"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={handleReset}
            disabled={isDefaultSelection}
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset filters
          </Button>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <FilterPills
            options={RANGE_PRESETS}
            value={activePreset}
            onChange={handleRangePreset}
            ariaLabel="Date range presets"
          />

          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label
                htmlFor="analytics-from"
                className="text-xs text-muted-foreground"
              >
                From
              </Label>
              <Input
                id="analytics-from"
                type="date"
                value={range.from}
                max={range.to}
                onChange={(event) => handleFromChange(event.target.value)}
                className="h-9 w-36"
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="analytics-to"
                className="text-xs text-muted-foreground"
              >
                To
              </Label>
              <Input
                id="analytics-to"
                type="date"
                value={range.to}
                min={range.from}
                onChange={(event) => handleToChange(event.target.value)}
                className="h-9 w-36"
              />
            </div>
          </div>
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

      {(loaded || !isLoading) && (
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
                  <CardTitle className="min-w-0 truncate text-base">
                    {drilledCategory ? drilledCategory.name : "By category"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {drilledCategory
                      ? `Subcategory breakdown · ${formatRangeLabel(
                          loaded.from,
                          loaded.to,
                        )}`
                      : `Level 1 categories · ${formatRangeLabel(
                          loaded.from,
                          loaded.to,
                        )}`}
                  </p>
                  {drilledCategory && (
                    <CardAction>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => setDrill(null)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        All categories
                      </Button>
                    </CardAction>
                  )}
                </CardHeader>
                <CardContent className="px-6">
                  {!drilledCategory && canDrill && (
                    <p className="mb-4 text-xs text-muted-foreground">
                      Click a slice to inspect it. Click a category name to see
                      its subcategories.
                    </p>
                  )}

                  <DonutChart
                    // Remount on level or filter change so the donut's
                    // internal selection does not carry a stale index into the
                    // new slice set.
                    key={`${viewKey}|${drilledCategoryId ?? "all"}`}
                    slices={slices}
                    total={donutTotal}
                    showShare
                    onSliceClick={canDrill ? handleSliceClick : undefined}
                    centerLabel={
                      drilledCategory
                        ? "This category"
                        : `Total ${TYPE_NOUN[loaded.type]}`
                    }
                    centerValue={formatAmount(donutTotal)}
                    valueFormatter={formatAmount}
                    emptyMessage={`No ${TYPE_NOUN[loaded.type]} in this date range.`}
                  />
                </CardContent>
              </Card>

              <Card className="gap-4 py-5">
                <CardHeader className="px-6">
                  <CardTitle className="text-base">Trend</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {GRANULARITY_LABEL[loaded.granularity]}{" "}
                    {TYPE_NOUN[loaded.type]} ·{" "}
                    {formatRangeLabel(loaded.from, loaded.to)}
                  </p>
                </CardHeader>
                <CardContent className="px-6">
                  {/* Same behaviour as the dashboard's balance trend: the
                      amounts stay hidden until the user hovers or taps a
                      point. Daily and monthly buckets keep every point; only
                      the axis labels are thinned. */}
                  <LineChart
                    points={trendPoints}
                    valueFormatter={formatAmount}
                    showValueLabels={false}
                    compact={isMobile}
                    emptyMessage="No data to trend yet."
                    ariaLabel={`${GRANULARITY_LABEL[loaded.granularity]} ${
                      TYPE_NOUN[loaded.type]
                    } trend from ${formatRangeLabel(
                      loaded.from,
                      loaded.to,
                    )}`}
                  />
                  {trendPoints.length > 0 && (
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
