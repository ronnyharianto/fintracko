"use client";

import React, { useCallback, useEffect, useState } from "react";
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
import type { TransactionView } from "@/features/transactions/types";
import type { CategoryView } from "@/features/categories/types";
import type { AccountView } from "@/features/accounts/types";
import { useBudgetForDate } from "@/features/budgets/hooks/use-budget-for-date";
import { BudgetSnapshot } from "./budget-snapshot";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/image-upload";

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionView | null;
  onUpdated: () => void;
}

export function EditTransactionDialog({
  open,
  onOpenChange,
  transaction,
  onUpdated,
}: EditTransactionDialogProps) {
  const { activeWorkspaceId } = useWorkspace();

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [payeePayer, setPayeePayer] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryView[]>([]);
  const [accounts, setAccounts] = useState<AccountView[]>([]);
  const [prevOpen, setPrevOpen] = useState(false);

  // Budget snapshot: only expense transactions are measured against budgets.
  // Editing within the same period must not double count, so the transaction's
  // stored amount is excluded from the budget's reported spend (see snapshot).
  const isBudgetRelevant = transaction?.type === "EXPENSE";
  const { budget, isLoading: isBudgetLoading } = useBudgetForDate({
    workspaceId: activeWorkspaceId,
    subCategoryId: isBudgetRelevant ? subCategoryId : null,
    date: isBudgetRelevant ? date : null,
  });
  const isSamePeriodAsTransaction =
    budget !== null &&
    transaction !== null &&
    budget.periodStart <= transaction.date &&
    transaction.date <= budget.periodEnd;

  // Pre-fill the form whenever the dialog opens (adjust state during render).
  // Keyed on the open transition rather than the transaction object so that
  // re-opening the same transaction (e.g. after cancel) still repopulates it.
  // Category/subcategory come straight from the transaction row so they are
  // set synchronously, like the other fields.
  if (open && !prevOpen) {
    setPrevOpen(true);
    if (transaction) {
      setAmount(transaction.amount ?? "");
      setDate(transaction.date ?? "");
      setCategoryId(transaction.categoryId);
      setSubCategoryId(transaction.subCategoryId);
      setSourceAccountId(transaction.sourceAccountId ?? "");
      setDestinationAccountId(transaction.destinationAccountId ?? "");
      setDescription(transaction.description ?? "");
      setPayeePayer(transaction.payeePayer ?? "");
      setAttachmentUrl(transaction.attachmentUrl ?? null);
      setError(null);
    }
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  // Fetch categories and accounts when the dialog opens so the dropdowns have
  // options to change to.
  useEffect(() => {
    if (!open || !activeWorkspaceId) return;

    let cancelled = false;
    void (async () => {
      try {
        const [catData, accData] = await Promise.all([
          apiFetch<{ categories: CategoryView[] }>(
            `/api/v1/workspaces/${activeWorkspaceId}/categories`,
          ),
          apiFetch<{ accounts: AccountView[] }>(
            `/api/v1/workspaces/${activeWorkspaceId}/accounts`,
          ),
        ]);
        if (!cancelled) {
          setCategories(catData.categories || []);
          setAccounts((accData.accounts || []).filter((a) => !a.isArchived));
        }
      } catch {
        // Errors handled by form submission
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, activeWorkspaceId]);

  // Categories of the transaction type; keep the current selection visible
  // even when it is archived so the Select has a matching item for its value.
  const fetchedCategories = categories.filter(
    (c) =>
      c.type === transaction?.type && (!c.isArchived || c.id === categoryId),
  );

  // If the transaction's own category is missing from the fetched options
  // (e.g. deleted data), add a synthetic entry so the selection still shows.
  const filteredCategories =
    !transaction ||
    fetchedCategories.some((c) => c.id === transaction.categoryId)
      ? fetchedCategories
      : [
          ...fetchedCategories,
          {
            id: transaction.categoryId,
            name: transaction.categoryName,
            type: transaction.type,
            isArchived: false,
            createdAt: "",
            subCategories: [
              {
                id: transaction.subCategoryId,
                name: transaction.subCategoryName,
                isArchived: false,
                createdAt: "",
              },
            ],
          },
        ];

  // Get subcategories for selected category
  const selectedCategory = filteredCategories.find((c) => c.id === categoryId);
  const subCategories =
    selectedCategory?.subCategories.filter(
      (s) => !s.isArchived || s.id === subCategoryId,
    ) ?? [];

  const resetForm = useCallback(() => {
    setAmount("");
    setDate("");
    setCategoryId("");
    setSubCategoryId("");
    setSourceAccountId("");
    setDestinationAccountId("");
    setDescription("");
    setPayeePayer("");
    setAttachmentUrl(null);
    setError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId || !transaction || !amount) return;

    setIsSaving(true);
    setError(null);

    try {
      await apiFetch(
        `/api/v1/workspaces/${activeWorkspaceId}/transactions/${transaction.id}`,
        {
          method: "PATCH",
          body: {
            amount,
            date: date || undefined,
            subCategoryId: subCategoryId || undefined,
            sourceAccountId: sourceAccountId || undefined,
            destinationAccountId: destinationAccountId || undefined,
            description: description || undefined,
            payeePayer: payeePayer || undefined,
            attachmentUrl: attachmentUrl || undefined,
          },
        },
      );
      toast.success("Transaction updated");
      resetForm();
      onOpenChange(false);
      onUpdated();
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Failed to update transaction.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const showSource =
    transaction?.type === "EXPENSE" || transaction?.type === "TRANSFER";
  const showDestination =
    transaction?.type === "INCOME" || transaction?.type === "TRANSFER";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Update the transaction details. The transaction type cannot be
            changed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Type (read-only) */}
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <div className="rounded-md border bg-muted px-3 py-2 text-sm">
              {transaction?.type === "EXPENSE"
                ? "Money Out"
                : transaction?.type === "INCOME"
                  ? "Money In"
                  : "Transfer"}
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-txn-amount">Amount</Label>
              <CurrencyInput
                id="edit-txn-amount"
                placeholder="0.00"
                value={amount}
                onChange={setAmount}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-txn-date">Date</Label>
              <Input
                id="edit-txn-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Category → SubCategory */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={categoryId}
                onValueChange={(v) => {
                  setCategoryId(v);
                  setSubCategoryId("");
                }}
              >
                <SelectTrigger className="mb-0 w-full text-[16px]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
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
                <SelectTrigger className="mb-0 w-full text-[16px]">
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {subCategories.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Budget snapshot (expense + budgeted subcategory + date) */}
          {isBudgetRelevant && budget && (
            <BudgetSnapshot
              budget={budget}
              isLoading={isBudgetLoading}
              amount={amount}
              excludeAmount={
                isSamePeriodAsTransaction ? (transaction?.amount ?? "0") : "0"
              }
            />
          )}

          {/* Accounts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {showSource && (
              <div className="space-y-2">
                <Label>Source</Label>
                <Select
                  value={sourceAccountId}
                  onValueChange={setSourceAccountId}
                >
                  <SelectTrigger className="mb-0 w-full text-[16px]">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {showDestination && (
              <div className="space-y-2">
                <Label>Destination</Label>
                <Select
                  value={destinationAccountId}
                  onValueChange={setDestinationAccountId}
                >
                  <SelectTrigger className="mb-0 w-full text-[16px]">
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Payee / Payer & Description */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="edit-txn-payee">Payee / Payer (optional)</Label>
              <Input
                id="edit-txn-payee"
                placeholder="Who was involved?"
                value={payeePayer}
                onChange={(e) => setPayeePayer(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="edit-txn-description">
                Description (optional)
              </Label>
              <Input
                id="edit-txn-description"
                placeholder="Any additional notes?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Attachment (optional)</Label>
            <ImageUpload value={attachmentUrl} onChange={setAttachmentUrl} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
