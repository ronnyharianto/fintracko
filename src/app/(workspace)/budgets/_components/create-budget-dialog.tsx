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
import type { BudgetInterval } from "@/features/budgets/types";
import type { CategoryView } from "@/features/categories/types";
import { fetchExpenseCategories } from "./expense-categories";
import { defaultPeriodValue, deriveBounds } from "./budget-period";
import { YearPicker } from "./year-picker";

const INTERVAL_OPTIONS: { value: BudgetInterval; label: string }[] = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

interface CreateBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateBudgetDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateBudgetDialogProps) {
  const { activeWorkspaceId } = useWorkspace();

  const [interval, setInterval] = useState<BudgetInterval>("MONTHLY");
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [periodValue, setPeriodValue] = useState(() =>
    defaultPeriodValue("MONTHLY"),
  );
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

  const bounds = deriveBounds(interval, periodValue);
  const canSubmit =
    Boolean(activeWorkspaceId) &&
    Boolean(subCategoryId) &&
    Number(amount) > 0 &&
    bounds !== null;

  const resetForm = () => {
    setInterval("MONTHLY");
    setCategoryId("");
    setSubCategoryId("");
    setAmount("");
    setPeriodValue(defaultPeriodValue("MONTHLY"));
    setError(null);
  };

  const handleIntervalChange = (next: BudgetInterval) => {
    setInterval(next);
    setPeriodValue(defaultPeriodValue(next));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId || !bounds || !canSubmit) return;

    setIsCreating(true);
    setError(null);

    try {
      await apiFetch(`/api/v1/workspaces/${activeWorkspaceId}/budgets`, {
        method: "POST",
        body: {
          subCategoryId,
          amount: Number(amount),
          interval,
          startDate: bounds.startDate,
          endDate: bounds.endDate,
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
              <Label htmlFor="budget-period">
                {interval === "MONTHLY" ? "Month" : "Year"}
              </Label>
              {interval === "MONTHLY" ? (
                <Input
                  id="budget-period"
                  type="month"
                  value={periodValue}
                  onChange={(e) => setPeriodValue(e.target.value)}
                  required
                />
              ) : (
                <YearPicker
                  id="budget-period"
                  value={periodValue}
                  onChange={setPeriodValue}
                />
              )}
            </div>
          </div>

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
