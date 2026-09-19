"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import { useWorkspace } from "@/components/shared/workspace/workspace-context";
import { formatCurrency } from "@/lib/utils";
import { parseDate } from "@/lib/date-period";
import type { BudgetView } from "@/features/budgets/types";
import {
  OPEN_ENDED_DATE,
  describeHistoricalImpact,
  periodBounds,
  type HistoricalImpact,
} from "@/features/budgets/utilization";
import type { CategoryView } from "@/features/categories/types";
import { fetchExpenseCategories } from "./expense-categories";
import {
  deriveBounds,
  formatPeriodRange,
  periodValueFromDate,
} from "./budget-period";
import { YearPicker } from "./year-picker";
import { BudgetImpactDialog } from "./budget-impact-dialog";

/** `SINGLE` covers one period, `UNTIL` covers a chosen end period, `ONGOING` never ends. */
type RepeatMode = "SINGLE" | "UNTIL" | "ONGOING";

/** Trim trailing zeros from a Prisma decimal string for display. */
function trimDecimal(value: string): string {
  if (!value.includes(".")) return value;
  return value.replace(/0+$/, "").replace(/\.$/, "");
}

/** How an existing budget's range is expressed in the form. */
function repeatModeOf(
  interval: BudgetView["interval"],
  startDate: string,
  endDate: string,
): RepeatMode {
  if (endDate === OPEN_ENDED_DATE) return "ONGOING";
  const startPeriod = periodBounds(interval, parseDate(startDate));
  return endDate === startPeriod.endDate ? "SINGLE" : "UNTIL";
}

/**
 * Ensure the budget's current category and subcategory stay selectable even
 * when they were archived after the budget was created. They remain subject to
 * server-side validation on submit.
 */
function withCurrentTarget(
  categories: CategoryView[],
  budget: BudgetView,
): CategoryView[] {
  const categoryExists = categories.some((c) => c.id === budget.categoryId);
  const base = categoryExists
    ? categories
    : [
        {
          id: budget.categoryId,
          name: budget.categoryName,
          type: "EXPENSE" as const,
          isArchived: false,
          subCategories: [],
          createdAt: budget.createdAt,
        },
        ...categories,
      ];

  return base.map((category) => {
    if (category.id !== budget.categoryId) return category;
    if (category.subCategories.some((s) => s.id === budget.subCategoryId)) {
      return category;
    }
    return {
      ...category,
      subCategories: [
        ...category.subCategories,
        {
          id: budget.subCategoryId,
          name: `${budget.subCategoryName} (archived)`,
          isArchived: false,
          createdAt: budget.createdAt,
        },
      ],
    };
  });
}

interface EditBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: BudgetView | null;
  onUpdated: () => void;
}

export function EditBudgetDialog({
  open,
  onOpenChange,
  budget,
  onUpdated,
}: EditBudgetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {budget && (
          <EditBudgetForm
            key={budget.id}
            budget={budget}
            onClose={() => onOpenChange(false)}
            onUpdated={onUpdated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface EditBudgetFormProps {
  budget: BudgetView;
  onClose: () => void;
  onUpdated: () => void;
}

function EditBudgetForm({ budget, onClose, onUpdated }: EditBudgetFormProps) {
  const { activeWorkspaceId } = useWorkspace();

  const isMonthly = budget.interval === "MONTHLY";
  const noun = isMonthly ? "month" : "year";

  const [categoryId, setCategoryId] = useState(budget.categoryId);
  const [subCategoryId, setSubCategoryId] = useState(budget.subCategoryId);
  const [amount, setAmount] = useState(() => trimDecimal(budget.amount));
  const [startPeriodValue, setStartPeriodValue] = useState(() =>
    periodValueFromDate(budget.interval, budget.startDate),
  );
  const [endPeriodValue, setEndPeriodValue] = useState(() =>
    periodValueFromDate(budget.interval, budget.endDate),
  );
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(() =>
    repeatModeOf(budget.interval, budget.startDate, budget.endDate),
  );
  const [categories, setCategories] = useState<CategoryView[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingImpact, setPendingImpact] = useState<{
    impact: HistoricalImpact;
    splitFrom: string;
  } | null>(null);

  useEffect(() => {
    if (!activeWorkspaceId) return;

    let cancelled = false;
    void (async () => {
      try {
        const result = await fetchExpenseCategories(activeWorkspaceId);
        if (!cancelled) {
          setCategories(withCurrentTarget(result, budget));
        }
      } catch {
        if (!cancelled) setCategories(withCurrentTarget([], budget));
      } finally {
        if (!cancelled) setIsLoadingCategories(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId, budget]);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const subCategories = selectedCategory?.subCategories ?? [];

  const startBounds = deriveBounds(budget.interval, startPeriodValue);
  const endBounds = deriveBounds(budget.interval, endPeriodValue);

  const rangeEndDate =
    repeatMode === "ONGOING"
      ? OPEN_ENDED_DATE
      : repeatMode === "SINGLE"
        ? (startBounds?.endDate ?? null)
        : (endBounds?.endDate ?? null);

  const canSubmit =
    Boolean(activeWorkspaceId) &&
    Boolean(subCategoryId) &&
    Number(amount) > 0 &&
    startBounds !== null &&
    rangeEndDate !== null;

  const rangeStartDate = startBounds?.startDate ?? null;
  const amountLabel =
    Number(amount) > 0 ? formatCurrency(Number(amount)) : null;
  const startToken =
    startBounds && rangeStartDate
      ? formatPeriodRange(budget.interval, rangeStartDate, startBounds.endDate)
      : null;
  const rangeLabel =
    rangeStartDate && rangeEndDate
      ? formatPeriodRange(budget.interval, rangeStartDate, rangeEndDate)
      : null;

  const handleStartPeriodChange = (next: string) => {
    setStartPeriodValue(next);
    if (endPeriodValue < next) setEndPeriodValue(next);
  };

  /**
   * Persist the edit. `splitFrom` keeps earlier periods untouched by ending the
   * current range the day before it and starting a new one there.
   */
  const save = async (splitFrom?: string) => {
    if (!activeWorkspaceId || !startBounds || !rangeEndDate) return;

    setIsSaving(true);
    setError(null);

    try {
      await apiFetch(
        `/api/v1/workspaces/${activeWorkspaceId}/budgets/${budget.id}`,
        {
          method: "PATCH",
          body: {
            subCategoryId,
            amount: Number(amount),
            startDate: startBounds.startDate,
            endDate: rangeEndDate,
            ...(splitFrom ? { splitFrom } : {}),
          },
        },
      );
      setPendingImpact(null);
      onClose();
      onUpdated();
    } catch (err) {
      setPendingImpact(null);
      setError(
        err instanceof ApiClientError ? err.message : "Failed to update budget.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId || !startBounds || !rangeEndDate || !canSubmit) {
      return;
    }

    const impact = describeHistoricalImpact(
      budget.interval,
      {
        amount: budget.amount,
        startDate: budget.startDate,
        endDate: budget.endDate,
      },
      {
        amount: String(amount),
        startDate: startBounds.startDate,
        endDate: rangeEndDate,
      },
    );

    if (!impact) {
      await save();
      return;
    }

    // Where the new range takes over. Moving the start forward puts the
    // boundary where the user put it, so the new range begins there and the
    // earlier periods keep the old limit. Otherwise the start is unchanged, so
    // the takeover begins at the current period and every elapsed period keeps
    // its old limit.
    const splitFrom =
      startBounds.startDate > budget.startDate
        ? startBounds.startDate
        : periodBounds(budget.interval, new Date()).startDate;

    setPendingImpact({ impact, splitFrom });
  };

  // A split needs a non-empty earlier range to preserve and a new range that
  // starts inside it. Extending the start backwards cannot be split: the added
  // periods would fall inside the range being preserved.
  const canKeepHistory = pendingImpact
    ? startBounds !== null &&
      startBounds.startDate >= budget.startDate &&
      pendingImpact.splitFrom > budget.startDate &&
      pendingImpact.splitFrom <=
        (rangeEndDate ?? OPEN_ENDED_DATE)
    : false;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Budget</DialogTitle>
        <DialogDescription>
          The interval is fixed. Update the amount, range, or subcategory.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-2">
          <Label>Interval</Label>
          <p className="text-sm text-muted-foreground">
            {isMonthly ? "Monthly" : "Yearly"} (cannot be changed)
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={categoryId}
              onValueChange={(value) => {
                setCategoryId(value);
                setSubCategoryId("");
              }}
            >
              <SelectTrigger className="w-full" disabled={isLoadingCategories}>
                <SelectValue
                  placeholder={
                    isLoadingCategories ? "Loading..." : "Select category"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subcategory</Label>
            <Select
              value={subCategoryId}
              onValueChange={setSubCategoryId}
              disabled={!categoryId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select subcategory" />
              </SelectTrigger>
              <SelectContent>
                {subCategories.map((subCategory) => (
                  <SelectItem key={subCategory.id} value={subCategory.id}>
                    {subCategory.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-budget-amount">Amount</Label>
            <CurrencyInput
              id="edit-budget-amount"
              placeholder="0.00"
              value={amount}
              onChange={setAmount}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-budget-start">
              {isMonthly ? "Start month" : "Start year"}
            </Label>
            {isMonthly ? (
              <Input
                id="edit-budget-start"
                type="month"
                value={startPeriodValue}
                onChange={(e) => handleStartPeriodChange(e.target.value)}
                required
              />
            ) : (
              <YearPicker
                id="edit-budget-start"
                value={startPeriodValue}
                onChange={handleStartPeriodChange}
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-budget-repeat">Repeats</Label>
            <Select
              value={repeatMode}
              onValueChange={(value) => setRepeatMode(value as RepeatMode)}
            >
              <SelectTrigger id="edit-budget-repeat" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SINGLE">This {noun} only</SelectItem>
                <SelectItem value="UNTIL">Repeats until...</SelectItem>
                <SelectItem value="ONGOING">Repeats, no end date</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {repeatMode === "UNTIL" && (
            <div className="space-y-2">
              <Label htmlFor="edit-budget-end">End {noun}</Label>
              {isMonthly ? (
                <Input
                  id="edit-budget-end"
                  type="month"
                  min={startPeriodValue}
                  value={endPeriodValue}
                  onChange={(e) => setEndPeriodValue(e.target.value)}
                  required
                />
              ) : (
                <YearPicker
                  id="edit-budget-end"
                  value={endPeriodValue}
                  onChange={setEndPeriodValue}
                  minYear={Number(startPeriodValue)}
                />
              )}
            </div>
          )}
        </div>

        {amountLabel && startToken && rangeLabel && (
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            {repeatMode === "ONGOING"
              ? `${amountLabel} per ${noun} from ${startToken} onward, with no end date.`
              : `${amountLabel} per ${noun} (${rangeLabel}).`}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving || !canSubmit}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </form>

      {pendingImpact && (
        <BudgetImpactDialog
          open
          onOpenChange={(next) => {
            if (!next) setPendingImpact(null);
          }}
          budget={budget}
          impact={pendingImpact.impact}
          nextAmount={amount}
          canKeepHistory={canKeepHistory}
          splitFrom={pendingImpact.splitFrom}
          isSaving={isSaving}
          onApplyToAll={() => void save()}
          onKeepHistory={() => void save(pendingImpact.splitFrom)}
        />
      )}
    </>
  );
}
