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
import type { TransactionType } from "@/features/transactions/types";
import type { CategoryView } from "@/features/categories/types";
import type { AccountView } from "@/features/accounts/types";
import { TrendingUp, TrendingDown, ArrowRightLeft } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";

const TYPE_OPTIONS: {
  value: TransactionType;
  label: string;
  icon: typeof TrendingUp;
  color: string;
}[] = [
  {
    value: "EXPENSE",
    label: "Money Out",
    icon: TrendingDown,
    color: "border-red-500 bg-red-50 text-red-700",
  },
  {
    value: "INCOME",
    label: "Money In",
    icon: TrendingUp,
    color: "border-emerald-500 bg-emerald-50 text-emerald-700",
  },
  {
    value: "TRANSFER",
    label: "Transfer",
    icon: ArrowRightLeft,
    color: "border-blue-500 bg-blue-50 text-blue-700",
  },
];

interface CreateTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateTransactionDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateTransactionDialogProps) {
  const { activeWorkspaceId } = useWorkspace();

  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [payeePayer, setPayeePayer] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryView[]>([]);
  const [accounts, setAccounts] = useState<AccountView[]>([]);

  // Fetch categories and accounts when dialog opens
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
          setCategories(
            (catData.categories || []).filter((c) => !c.isArchived),
          );
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

  // Filter categories by transaction type
  const filteredCategories = categories.filter((c) => c.type === type);

  // Get subcategories for selected category
  const selectedCategory = filteredCategories.find((c) => c.id === categoryId);
  const subCategories =
    selectedCategory?.subCategories.filter((s) => !s.isArchived) ?? [];

  const resetForm = useCallback(() => {
    setType("EXPENSE");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
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
    if (!activeWorkspaceId || !amount || !subCategoryId) return;

    setIsCreating(true);
    setError(null);

    try {
      await apiFetch(`/api/v1/workspaces/${activeWorkspaceId}/transactions`, {
        method: "POST",
        body: {
          type,
          amount: parseFloat(amount) || 0,
          date,
          subCategoryId,
          sourceAccountId: sourceAccountId || undefined,
          destinationAccountId: destinationAccountId || undefined,
          description: description || undefined,
          payeePayer: payeePayer || undefined,
          attachmentUrl: attachmentUrl || undefined,
        },
      });
      resetForm();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Failed to create transaction.";
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  const showSource = type === "EXPENSE" || type === "TRANSFER";
  const showDestination = type === "INCOME" || type === "TRANSFER";

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
          <DialogTitle>New Transaction</DialogTitle>
          <DialogDescription>
            Record a new financial transaction.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Type Selection */}
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setType(opt.value);
                      setCategoryId("");
                      setSubCategoryId("");
                    }}
                    className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-xs font-medium transition-colors ${
                      type === opt.value
                        ? opt.color
                        : "border-muted bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="txn-amount">Amount</Label>
              <CurrencyInput
                id="txn-amount"
                placeholder="0.00"
                value={amount}
                onChange={setAmount}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="txn-date">Date</Label>
              <Input
                id="txn-date"
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
                <SelectTrigger className="w-full mb-0 text-[16px]">
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
                <SelectTrigger className="w-full mb-0 text-[16px]">
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

          {/* Accounts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {showSource && (
              <div className="space-y-2">
                <Label>Source</Label>
                <Select
                  value={sourceAccountId}
                  onValueChange={setSourceAccountId}
                >
                  <SelectTrigger className="w-full mb-0 text-[16px]">
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
                  <SelectTrigger className="w-full mb-0">
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
              <Label htmlFor="txn-payee">Payee / Payer (optional)</Label>
              <Input
                id="txn-payee"
                placeholder="Who was involved?"
                value={payeePayer}
                onChange={(e) => setPayeePayer(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="txn-description">Description (optional)</Label>
              <Input
                id="txn-description"
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
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
