"use client";

import { CalendarDays, MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { BudgetInterval, BudgetView } from "@/features/budgets/types";
import { cn, formatCurrency } from "@/lib/utils";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatPeriodRange } from "./budget-period";

const INTERVAL_LABEL: Record<BudgetInterval, string> = {
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

const INTERVAL_VARIANT: Record<BudgetInterval, BadgeVariant> = {
  MONTHLY: "accent",
  YEARLY: "warning",
};

const PERIOD_NOUN: Record<BudgetInterval, string> = {
  MONTHLY: "month",
  YEARLY: "year",
};

/** Minimum bar width so a small nonzero usage still reads as a sliver. */
const MIN_VISIBLE_BAR_PERCENT = 3;

interface BudgetCardProps {
  budget: BudgetView;
  onEdit: (budget: BudgetView) => void;
  onDelete: (budget: BudgetView) => void;
}

export function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  const spent = Number(budget.spent);
  const amount = Number(budget.amount);
  // `limit` is what the viewed period actually measures against: the per-period
  // amount multiplied by the periods the view resolved to.
  const limit = Number(budget.limit);
  const isMultiPeriod = budget.periods > 1;
  const isOver = budget.utilization > 100;
  const clampedPercent = Math.min(Math.max(budget.utilization, 0), 100);
  const hasUsage = spent > 0;
  const barPercent = hasUsage
    ? Math.max(clampedPercent, MIN_VISIBLE_BAR_PERCENT)
    : 0;

  const barColor = isOver
    ? "bg-red-500"
    : budget.utilization >= 80
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <Card className="gap-4 py-5">
      <div className="flex items-start justify-between gap-3 px-6">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {budget.categoryName}
          </p>
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="min-w-0 truncate text-base font-semibold leading-none">
              {budget.subCategoryName}
            </h3>
            <Badge
              size="sm"
              className="shrink-0"
              variant={INTERVAL_VARIANT[budget.interval]}
            >
              {INTERVAL_LABEL[budget.interval]}
            </Badge>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="-mr-1 -mt-1 h-8 w-8 shrink-0"
              aria-label={`Actions for ${budget.subCategoryName}`}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(budget)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(budget)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* The bar and the figures under it are pinned to the bottom so every card
          in a row lines up, even though only multi-period budgets carry a
          per-period rate line above them. */}
      <div className="flex flex-1 flex-col gap-3 px-6">
        <div className="space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 tabular-nums">
            <span
              className={cn(
                "text-2xl font-semibold leading-none",
                isOver && "text-red-600",
              )}
            >
              {formatCurrency(spent)}
            </span>
            <span className="text-sm text-muted-foreground">
              of {formatCurrency(limit)}
            </span>
          </div>
          {isMultiPeriod && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatCurrency(amount)} per {PERIOD_NOUN[budget.interval]} across{" "}
              {budget.periods} {PERIOD_NOUN[budget.interval]}s
            </p>
          )}
        </div>

        <div className="mt-auto space-y-3">
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

          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "text-xs font-medium tabular-nums",
                isOver ? "text-red-600" : "text-muted-foreground",
              )}
            >
              {budget.utilization.toFixed(1)}% used
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              {/* The resolved periods, not the row range: an open-ended budget
                  shows only the periods the current view actually measures. */}
              {formatPeriodRange(
                budget.interval,
                budget.periodStart,
                budget.periodEnd,
              )}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
