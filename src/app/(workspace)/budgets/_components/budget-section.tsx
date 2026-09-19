"use client";

import { ChevronDown } from "lucide-react";
import type { BudgetView } from "@/features/budgets/types";
import { cn, formatCurrency } from "@/lib/utils";
import { BudgetCard } from "./budget-card";
import type { BudgetCategorySection } from "./budget-sections";

interface BudgetSectionProps {
  section: BudgetCategorySection;
  expanded: boolean;
  onToggle: () => void;
  onEdit: (budget: BudgetView) => void;
  onDelete: (budget: BudgetView) => void;
}

/**
 * One parent-category section: a collapsible header carrying the category's
 * total budget and used percentage, then its budget cards once expanded. The
 * header is deliberately lighter than a card so it does not compete with them.
 */
export function BudgetSection({
  section,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: BudgetSectionProps) {
  const isOver = section.utilization > 100;
  const barPercent = Math.min(Math.max(section.utilization, 0), 100);
  const barColor = isOver
    ? "bg-red-500"
    : section.utilization >= 80
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="-mx-1 flex w-full flex-col gap-1.5 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-muted/50"
      >
        <span className="flex w-full flex-wrap items-center gap-x-2 gap-y-1">
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              !expanded && "-rotate-90",
            )}
          />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
            {section.categoryName}
          </span>
          <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
            <span className="text-sm font-semibold">
              {formatCurrency(section.totalBudgeted)}
            </span>
            <span
              className={cn(
                "text-xs font-medium",
                isOver ? "text-red-600" : "text-muted-foreground",
              )}
            >
              {section.utilization.toFixed(1)}%
            </span>
          </span>
        </span>
        <span className="flex w-full items-center pl-6">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className={cn("block h-full rounded-full", barColor)}
              style={{ width: `${barPercent}%` }}
            />
          </span>
        </span>
      </button>

      {expanded && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {section.budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
