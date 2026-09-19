"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import type {
  BudgetInterval,
  BudgetView,
} from "@/features/budgets/types";
import {
  previousDay,
  type HistoricalImpact,
} from "@/features/budgets/utilization";
import { formatPeriodRange } from "./budget-period";

const PERIOD_NOUN: Record<BudgetInterval, string> = {
  MONTHLY: "month",
  YEARLY: "year",
};

interface BudgetImpactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: BudgetView;
  impact: HistoricalImpact;
  /** Per-period limit the user is saving, as a decimal string. */
  nextAmount: string;
  /** Whether the service can split the range to protect elapsed periods. */
  canKeepHistory: boolean;
  /** First day of the new range when history is kept, `YYYY-MM-DD`. */
  splitFrom: string;
  isSaving: boolean;
  onApplyToAll: () => void;
  onKeepHistory: () => void;
}

/**
 * Confirmation shown when an edit changes budgets for periods that have already
 * ended. Nothing is written until the user chooses: applying rewrites reported
 * history, while keeping history splits the range so past periods stay as they
 * were reported.
 */
export function BudgetImpactDialog({
  open,
  onOpenChange,
  budget,
  impact,
  nextAmount,
  canKeepHistory,
  splitFrom,
  isSaving,
  onApplyToAll,
  onKeepHistory,
}: BudgetImpactDialogProps) {
  const noun = PERIOD_NOUN[budget.interval];
  const periods = `${impact.periods} ${impact.periods === 1 ? noun : `${noun}s`}`;
  // Dropping or adding periods at both ends leaves two separate runs.
  const rangeLabel = impact.ranges
    .map((run) => formatPeriodRange(budget.interval, run.start, run.end))
    .join(" and ");

  const change = impact.amountChanged
    ? `Changing the limit from ${formatCurrency(Number(budget.amount))} to ${formatCurrency(Number(nextAmount))}`
    : "Adjusting the range";

  const keptUntil = formatPeriodRange(
    budget.interval,
    previousDay(splitFrom),
    previousDay(splitFrom),
  );
  const startsFrom = formatPeriodRange(
    budget.interval,
    splitFrom,
    splitFrom,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change past periods?</DialogTitle>
          <DialogDescription>
            {change} affects {periods} that {impact.periods === 1 ? "has" : "have"}{" "}
            already passed ({rangeLabel}). Their reported usage and any reports
            covering them will change.
          </DialogDescription>
        </DialogHeader>

        {canKeepHistory ? (
          <p className="text-xs text-muted-foreground">
            Keeping history ends the current range in {keptUntil} and starts the
            new one in {startsFrom}, so nothing already reported changes.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            A split point has to fall inside the range, so there is no point at
            which to keep past periods unchanged here.
          </p>
        )}

        <DialogFooter className="gap-2 sm:flex-col sm:items-stretch">
          <Button onClick={onApplyToAll} disabled={isSaving}>
            {isSaving ? "Saving..." : "Apply to all periods"}
          </Button>
          {canKeepHistory && (
            <Button
              variant="outline"
              onClick={onKeepHistory}
              disabled={isSaving}
            >
              Keep past periods unchanged
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
