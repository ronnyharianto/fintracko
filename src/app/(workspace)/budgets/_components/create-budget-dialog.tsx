"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { resolvePeriods } from "@/features/budgets/utilization";
import type { BudgetInterval } from "@/features/budgets/types";
import type { CategoryView } from "@/features/categories/types";
import { fetchExpenseCategories } from "./expense-categories";
import {
  defaultPeriodValue,
  deriveBounds,
  formatPeriodRange,
} from "./budget-period";
import { YearPicker } from "./year-picker";

/**
 * `SINGLE` covers one period, `UNTIL` covers a chosen end period, and `ONGOING`
 * leaves the end date open (the recurring default).
 */
type RepeatMode = "SINGLE" | "UNTIL" | "ONGOING";

const PERIOD_NOUN: Record<BudgetInterval, string> = {
  MONTHLY: "month",
  YEARLY: "year",
};

const INTERVAL_OPTIONS: { value: BudgetInterval; label: string }[] = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

interface CreateBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  /** Start of the period being reviewed; new budgets default to it. */
  initialStartDate?: string;
}

export function CreateBudgetDialog({
  open,
  onOpenChange,
  onCreated,
  initialStartDate,
}: CreateBudgetDialogProps) {
  const { activeWorkspaceId } = useWorkspace();

  const anchorDate = initialStartDate ? parseDate(initialStartDate) : undefined;

  const [interval, setInterval] = useState<BudgetInterval>("MONTHLY");
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [startPeriodValue, setStartPeriodValue] = useState(() =>
    defaultPeriodValue("MONTHLY", anchorDate),
  );
  const [endPeriodValue, setEndPeriodValue] = useState(() =>
    defaultPeriodValue("MONTHLY", anchorDate),
  );
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("ONGOING");
  const [categories, setCategories] = useState<CategoryView[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !activeWorkspaceId) return;

    let cancelled = false;
    void (async () => {
      setIsLoadingCategories(true);
      try {
        const result = await fetchExpenseCategories(activeWorkspaceId);
        if (!cancelled) setCategories(result);
      } catch {
        if (!cancelled) setCategories([]);
      } finally {
        if (!cancelled) setIsLoadingCategories(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, activeWorkspaceId]);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const subCategories = selectedCategory?.subCategories ?? [];

  const noun = PERIOD_NOUN[interval];
  const startBounds = deriveBounds(interval, startPeriodValue);
  const endBounds = deriveBounds(interval, endPeriodValue);

  const rangeEndDate =
    repeatMode === "ONGOING"
      ? null
      : repeatMode === "SINGLE"
        ? (startBounds?.endDate ?? null)
        : (endBounds?.endDate ?? null);

  const periodCount = useMemo(() => {
    if (!startBounds || !rangeEndDate) return null;
    return (
      resolvePeriods(
        interval,
        startBounds.startDate,
        rangeEndDate,
        startBounds.startDate,
        rangeEndDate,
      )?.count ?? null
    );
  }, [interval, startBounds, rangeEndDate]);

  const canSubmit =
    Boolean(activeWorkspaceId) &&
    Boolean(subCategoryId) &&
    Number(amount) > 0 &&
    startBounds !== null &&
    (repeatMode !== "UNTIL" || endBounds !== null);

  const resetForm = () => {
    setInterval("MONTHLY");
    setCategoryId("");
    setSubCategoryId("");
    setAmount("");
    setStartPeriodValue(defaultPeriodValue("MONTHLY", anchorDate));
    setEndPeriodValue(defaultPeriodValue("MONTHLY", anchorDate));
    setRepeatMode("ONGOING");
    setError(null);
  };

  const handleIntervalChange = (next: BudgetInterval) => {
    setInterval(next);
    setStartPeriodValue(defaultPeriodValue(next, anchorDate));
    setEndPeriodValue(defaultPeriodValue(next, anchorDate));
  };

  const handleStartPeriodChange = (next: string) => {
    setStartPeriodValue(next);
    // Keep the end period at or after the start so the range stays ordered.
    if (endPeriodValue < next) setEndPeriodValue(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId || !startBounds || !canSubmit) return;

    setIsCreating(true);
    setError(null);

    try {
      await apiFetch(`/api/v1/workspaces/${activeWorkspaceId}/budgets`, {
        method: "POST",
        body: {
          subCategoryId,
          amount: Number(amount),
          interval,
          startDate: startBounds.startDate,
          ...(rangeEndDate ? { endDate: rangeEndDate } : {}),
        },
      });
      resetForm();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Failed to create budget.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const amountLabel = Number(amount) > 0 ? formatCurrency(Number(amount)) : null;
  const rangeStartDate = startBounds?.startDate ?? null;
  const startLabel =
    startBounds && rangeStartDate
      ? formatPeriodRange(interval, rangeStartDate, startBounds.endDate)
      : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Budget</DialogTitle>
          <DialogDescription>
            Set a spending limit for an expense subcategory.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-2">
            <Label>Interval</Label>
            <div className="grid grid-cols-2 gap-2">
              {INTERVAL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleIntervalChange(option.value)}
                  aria-pressed={interval === option.value}
                  className={`rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
                    interval === option.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-muted bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
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
          {!isLoadingCategories && categories.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Create an expense category and subcategory first.
            </p>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="budget-amount">Amount</Label>
              <CurrencyInput
                id="budget-amount"
                placeholder="0.00"
                value={amount}
                onChange={setAmount}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget-start">
                {interval === "MONTHLY" ? "Start month" : "Start year"}
              </Label>
              {interval === "MONTHLY" ? (
                <Input
                  id="budget-start"
                  type="month"
                  value={startPeriodValue}
                  onChange={(e) => handleStartPeriodChange(e.target.value)}
                  required
                />
              ) : (
                <YearPicker
                  id="budget-start"
                  value={startPeriodValue}
                  onChange={handleStartPeriodChange}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="budget-repeat">Repeats</Label>
              <Select
                value={repeatMode}
                onValueChange={(value) => setRepeatMode(value as RepeatMode)}
              >
                <SelectTrigger id="budget-repeat" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINGLE">This {noun} only</SelectItem>
                  <SelectItem value="UNTIL">Repeats until...</SelectItem>
                  <SelectItem value="ONGOING">
                    Repeats, no end date
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {repeatMode === "UNTIL" && (
              <div className="space-y-2">
                <Label htmlFor="budget-end">
                  End {interval === "MONTHLY" ? "month" : "year"}
                </Label>
                {interval === "MONTHLY" ? (
                  <Input
                    id="budget-end"
                    type="month"
                    min={startPeriodValue}
                    value={endPeriodValue}
                    onChange={(e) => setEndPeriodValue(e.target.value)}
                    required
                  />
                ) : (
                  <YearPicker
                    id="budget-end"
                    value={endPeriodValue}
                    onChange={setEndPeriodValue}
                    minYear={Number(startPeriodValue)}
                  />
                )}
              </div>
            )}
          </div>

          {amountLabel && startLabel && (
            <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              {repeatMode === "ONGOING" ? (
                <>
                  {amountLabel} per {noun} starting {startLabel}, with no end
                  date.
                </>
              ) : (
                <>
                  {amountLabel} per {noun}
                  {periodCount && periodCount > 1
                    ? ` for ${periodCount} ${noun}s`
                    : ""}
                  {rangeEndDate && rangeStartDate
                    ? ` (${formatPeriodRange(interval, rangeStartDate, rangeEndDate)})`
                    : ""}
                  .
                </>
              )}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || !canSubmit}>
              {isCreating ? "Creating..." : "Create Budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
