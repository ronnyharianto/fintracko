"use client";

/**
 * Budget snapshot shown inside the transaction create/edit dialogs.
 *
 * Renders the budget covering the selected subcategory and transaction date:
 * period spend versus limit, a utilization bar matching the budget page's
 * card, and an amount-aware projection warning when the transaction would
 * drain the remaining budget.
 */

import React from "react";
import { AlertTriangle, CalendarDays } from "lucide-react";
import type { BudgetView } from "@/features/budgets/types";
import { parseDate } from "@/lib/date-period";
import { cn, formatCurrency } from "@/lib/utils";

/** Minimum bar width so a small nonzero usage still reads as a sliver. */
const MIN_VISIBLE_BAR_PERCENT = 3;

/** Clamp to the bar scale; the displayed percentage itself stays honest. */
function clampPercent(percent: number): number {
  return Math.min(Math.max(percent, 0), 100);
}

interface BudgetSnapshotProps {
  budget: BudgetView;
  /** True while the budget lookup for the current inputs is in flight. */
  isLoading: boolean;
  /** Signed amount of the transaction being created or edited, may be empty. */
  amount: string;
  /**
   * Amount of the existing transaction to exclude from the budget's reported
   * spend (edit only), so the projection does not count it twice.
   */
  excludeAmount?: string;
}

export function BudgetSnapshot({
  budget,
  isLoading,
  amount,
  excludeAmount,
}: BudgetSnapshotProps) {
  const limit = Number(budget.limit);
  const spent = Number(budget.spent);
  const newAmount = Number(amount) || 0;
  const oldAmount = Number(excludeAmount) || 0;

  // Budgets sum net EXPENSE amounts per period. The snapshot only renders for
  // expense transactions, so creation contributes its full amount and editing
  // contributes the delta between the new and the excluded old amount.
  const contribution = newAmount - oldAmount;
  const projectedSpend = spent + contribution;
  const utilization = limit !== 0 ? (projectedSpend / limit) * 100 : 0;
  const isOver = projectedSpend > limit;
  // Warn only when the user's own input pushes the period budget to empty or
  // negative (creation contributes the full amount, editing only the delta),
  // not when the budget was already exhausted and the edit shrinks the spend.
  const isDraining =
    limit > 0 && projectedSpend >= limit && contribution > 0;
  const barPercent = projectedSpend
    ? Math.max(clampPercent(utilization), MIN_VISIBLE_BAR_PERCENT)
    : 0;
  const barColor = isOver
    ? "bg-red-500"
    : utilization >= 80
      ? "bg-amber-500"
      : "bg-emerald-500";
  const remaining = limit - projectedSpend;
  const periodNoun =
    budget.interval === "YEARLY" ? "year" : "month";

  return (
    <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Budget
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          {formatPeriod(budget.interval, budget.periodStart)}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/40" />
          <span className="text-sm text-muted-foreground">
            Checking budget…
          </span>
        </div>
        ) : (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 tabular-nums">
            <span
              className={cn(
                "text-lg font-semibold leading-none",
                isOver && "text-red-600",
              )}
            >
              {formatCurrency(projectedSpend)}
            </span>
            <span className="text-sm text-muted-foreground">
              of {formatCurrency(limit)}
            </span>
          </div>

          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(clampPercent(utilization))}
            aria-label={`${budget.subCategoryName} budget utilization`}
          >
            <div
              className={cn("h-full rounded-full transition-all", barColor)}
              style={{ width: `${barPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "text-xs font-medium tabular-nums",
                isOver ? "text-red-600" : "text-muted-foreground",
              )}
            >
              {utilization.toFixed(1)}% used
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {remaining >= 0
                ? `${formatCurrency(remaining)} left`
                : `${formatCurrency(Math.abs(remaining))} over`}
            </span>
          </div>

          {isDraining && (
            <p className="flex items-start gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                This transaction {isOver ? "exceeds" : "empties"} the{" "}
                {budget.subCategoryName} budget for this {periodNoun}.
              </span>
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** The resolved period label, e.g. "Sep 2026" or "2026". */
function formatPeriod(
  interval: BudgetView["interval"],
  periodStart: string,
): string {
  const date = parseDate(periodStart);
  return interval === "YEARLY"
    ? String(date.getFullYear())
    : date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
