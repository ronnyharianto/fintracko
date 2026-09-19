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
import type { BudgetView } from "@/features/budgets/types";
import type { CategoryView } from "@/features/categories/types";
import { fetchExpenseCategories } from "./expense-categories";
import { deriveBounds } from "./budget-period";
import { YearPicker } from "./year-picker";

/** Trim trailing zeros from a Prisma decimal string for display. */
function trimDecimal(value: string): string {
  if (!value.includes(".")) return value;
  return value.replace(/0+$/, "").replace(/\.$/, "");
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
  const [categoryId, setCategoryId] = useState(budget.categoryId);
  const [subCategoryId, setSubCategoryId] = useState(budget.subCategoryId);
  const [amount, setAmount] = useState(() => trimDecimal(budget.amount));
  const [periodValue, setPeriodValue] = useState(() =>
    isMonthly ? budget.startDate.slice(0, 7) : budget.startDate.slice(0, 4),
  );
  const [categories, setCategories] = useState<CategoryView[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const bounds = deriveBounds(budget.interval, periodValue);
  const canSubmit =
    Boolean(activeWorkspaceId) &&
    Boolean(subCategoryId) &&
    Number(amount) > 0 &&
    bounds !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId || !bounds || !canSubmit) return;

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
            startDate: bounds.startDate,
            endDate: bounds.endDate,
          },
        },
      );
      onClose();
      onUpdated();
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Failed to update budget.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Budget</DialogTitle>
        <DialogDescription>
          The interval is fixed. Update the amount, period, or subcategory.
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
            <Label htmlFor="edit-budget-period">
              {isMonthly ? "Month" : "Year"}
            </Label>
            {isMonthly ? (
              <Input
                id="edit-budget-period"
                type="month"
                value={periodValue}
                onChange={(e) => setPeriodValue(e.target.value)}
                required
              />
            ) : (
              <YearPicker
                id="edit-budget-period"
                value={periodValue}
                onChange={setPeriodValue}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving || !canSubmit}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
