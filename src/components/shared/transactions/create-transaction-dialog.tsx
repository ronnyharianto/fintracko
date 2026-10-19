"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
import {
  parseTransactionUtterance,
  type SubCategoryAlternative,
  type UtteranceParserContext,
} from "@/features/transactions/utterance-parser";
import { useBudgetForDate } from "@/features/budgets/hooks/use-budget-for-date";
import { BudgetSnapshot } from "./budget-snapshot";
import { TrendingUp, TrendingDown, ArrowRightLeft, Sparkles } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  useEnterToAdvance,
  useSelectHandoff,
} from "@/lib/hooks/use-enter-to-advance";

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

function getTodayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface CreateTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  /**
   * Account preselected when creating from a specific account's view: the
   * source for money out / transfers, the destination for money in.
   */
  defaultAccountId?: string;
}

export function CreateTransactionDialog({
  open,
  onOpenChange,
  onCreated,
  defaultAccountId,
}: CreateTransactionDialogProps) {
  const { activeWorkspaceId } = useWorkspace();

  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getTodayDateInputValue);
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
  // Quick-input composer: a single natural-language line fills the form
  // (typed NL path, FEATURE_TRANSACTION_VOICE_INPUT.md Section 5.7). The
  // form remains the review-and-save surface, so nothing is persisted
  // without the usual submit validation.
  const [composerText, setComposerText] = useState("");
  const [composerFeedback, setComposerFeedback] = useState<string | null>(null);
  const [composerFeedbackIsError, setComposerFeedbackIsError] = useState(false);
  const [composerAlternatives, setComposerAlternatives] = useState<
    SubCategoryAlternative[]
  >([]);
  const [prevOpen, setPrevOpen] = useState(false);
  // Enter moves through the fields instead of submitting a partial form.
  const handleEnterAdvance = useEnterToAdvance();
  // Choosing from a dropdown hands the chain to the next field, so each ref
  // points at a dropdown that can start the following step.
  const selectHandoff = useSelectHandoff();
  const categoryTriggerRef = useRef<React.ComponentRef<typeof SelectTrigger>>(
    null,
  );
  const subCategoryTriggerRef = useRef<React.ComponentRef<typeof SelectTrigger>>(
    null,
  );
  const sourceTriggerRef = useRef<React.ComponentRef<typeof SelectTrigger>>(
    null,
  );
  const destinationTriggerRef = useRef<
    React.ComponentRef<typeof SelectTrigger>
  >(null);

  // Budget snapshot: only expense transactions are measured against budgets.
  const isBudgetRelevant = type === "EXPENSE";
  const { budget, isLoading: isBudgetLoading } = useBudgetForDate({
    workspaceId: activeWorkspaceId,
    subCategoryId: isBudgetRelevant ? subCategoryId : null,
    date: isBudgetRelevant ? date : null,
  });

  // Prefill the form on each open (adjust state during render, like the edit
  // dialog) so a scoped view (e.g. an account page) starts from its account.
  if (open && !prevOpen) {
    setPrevOpen(true);
    setDate(getTodayDateInputValue());
    if (defaultAccountId) {
      applyDefaultAccount("EXPENSE");
    }
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  function applyDefaultAccount(nextType: TransactionType) {
    if (!defaultAccountId) return;
    if (nextType === "INCOME") {
      setDestinationAccountId(defaultAccountId);
      setSourceAccountId("");
    } else {
      setSourceAccountId(defaultAccountId);
      setDestinationAccountId("");
    }
  }

  function handleComposerFill() {
    const text = composerText.trim();
    if (!text) {
      setComposerFeedbackIsError(true);
      setComposerFeedback(
        'Type a phrase first, e.g. "15rb kopi pakai gopay kemarin".',
      );
      return;
    }
    const context: UtteranceParserContext = {
      today: getTodayDateInputValue(),
      categories,
      accounts,
    };
    const draft = parseTransactionUtterance(text, context);
    const hasAnySignal = Boolean(
      draft.type ||
        draft.amount ||
        draft.date ||
        draft.categoryId ||
        draft.sourceAccountId ||
        draft.destinationAccountId ||
        draft.payeePayer ||
        draft.description,
    );
    if (!hasAnySignal) {
      setComposerFeedbackIsError(true);
      setComposerFeedback(
        'Could not read any fields. Mention an amount, e.g. "beli kopi 15rb".',
      );
      setComposerAlternatives([]);
      return;
    }

    // Apply the parse as a complete draft (bypassing handleTypeChange so the
    // parsed category/account values survive the type switch). Unresolved
    // fields are cleared rather than left over from an earlier utterance,
    // matching the parser contract: empty means "choose this yourself".
    const nextType = draft.type ?? "EXPENSE";
    setType(nextType);
    setAmount(draft.amount ?? "");
    setDate(draft.date ?? getTodayDateInputValue());
    setCategoryId(draft.categoryId ?? "");
    setSubCategoryId(draft.subCategoryId ?? "");
    setSourceAccountId(draft.sourceAccountId ?? "");
    setDestinationAccountId(draft.destinationAccountId ?? "");
    setPayeePayer(draft.payeePayer ?? "");
    setDescription(draft.description ?? "");
    setComposerAlternatives(draft.subCategoryAlternatives);
    // Preselected default account applies only when the utterance named
    // no account of its own.
    if (!draft.sourceAccountId && !draft.destinationAccountId) {
      applyDefaultAccount(nextType);
    }

    const summary: string[] = [];
    const typeLabel = TYPE_OPTIONS.find((opt) => opt.value === nextType)?.label;
    if (typeLabel) summary.push(typeLabel);
    if (draft.amount !== undefined) summary.push(draft.amount);
    if (draft.date) summary.push(draft.date);
    const category = categories.find((c) => c.id === draft.categoryId);
    const sub = category?.subCategories.find((s) => s.id === draft.subCategoryId);
    if (sub) summary.push(`${category?.name ?? ""} / ${sub.name}`);
    if (draft.sourceAccountId) {
      summary.push(
        accounts.find((a) => a.id === draft.sourceAccountId)?.name ?? "",
      );
    }
    if (draft.destinationAccountId) {
      summary.push(
        accounts.find((a) => a.id === draft.destinationAccountId)?.name ?? "",
      );
    }
    if (draft.payeePayer) summary.push(draft.payeePayer);
    setComposerFeedbackIsError(false);
    const notes: string[] = [];
    if (draft.ambiguity?.kind === "TOP_UP_INTENT") {
      notes.push("Top-up detected: pick the correct transaction type yourself.");
    }
    if (draft.notes.includes("account-ambiguous")) {
      notes.push("Account name matched several accounts: double-check the account selects.");
    }
    if (draft.notes.includes("category-type-mismatch-dropped")) {
      notes.push("Category could not be matched to this type: choose one manually.");
    }
    setComposerFeedback(
      `Filled: ${[summary.join(" + "), ...notes].filter(Boolean).join(" ")}`,
    );
  }

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    setCategoryId("");
    setSubCategoryId("");
    // The account selects swap between source and destination per type, so
    // clear both to avoid submitting an account field the new type ignores.
    setSourceAccountId("");
    setDestinationAccountId("");
    applyDefaultAccount(nextType);
  };

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
    setDate(getTodayDateInputValue());
    setCategoryId("");
    setSubCategoryId("");
    setSourceAccountId("");
    setDestinationAccountId("");
    setDescription("");
    setPayeePayer("");
    setAttachmentUrl(null);
    setError(null);
    setComposerText("");
    setComposerFeedback(null);
    setComposerFeedbackIsError(false);
    setComposerAlternatives([]);
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
          amount,
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
        <form
          onSubmit={handleSubmit}
          onKeyDown={handleEnterAdvance}
          className="space-y-4 py-2"
        >
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Quick input: natural-language composer fills the form */}
          <div className="space-y-2">
            <Label htmlFor="txn-quick-input">Quick input</Label>
            <div className="flex gap-2">
              <Input
                id="txn-quick-input"
                placeholder={`e.g. "beli kopi 15rb pakai bca kemarin"`}
                value={composerText}
                onChange={(e) => {
                  setComposerText(e.target.value);
                  setComposerFeedback(null);
                  setComposerFeedbackIsError(false);
                  setComposerAlternatives([]);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    // The form-level Enter-to-advance chain must not fire
                    // while the composer parses its own input.
                    e.preventDefault();
                    e.stopPropagation();
                    handleComposerFill();
                  }
                }}
                enterKeyHint="done"
                maxLength={500}
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={handleComposerFill}
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Fill form
              </Button>
            </div>
            {/* Reserved height keeps controls from jumping as feedback
                and chips appear (AGENTS.md Section 6). */}
            <div className="min-h-5 text-xs">
              {composerFeedback && (
                <p
                  className={
                    composerFeedbackIsError
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }
                >
                  {composerFeedback}
                </p>
              )}
              {composerAlternatives.length > 0 && (
                <div
                  className="mt-1 flex flex-wrap gap-1.5"
                  aria-label="Category alternatives"
                >
                  {composerAlternatives.map((alternative) => (
                    <button
                      key={alternative.subCategoryId}
                      type="button"
                      onClick={() => {
                        setCategoryId(alternative.categoryId);
                        setSubCategoryId(alternative.subCategoryId);
                      }}
                      className="rounded-full border px-2 py-0.5 text-xs hover:bg-muted"
                    >
                      {alternative.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Type Selection */}
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleTypeChange(opt.value)}
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
                enterKeyHint="next"
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
                enterKeyHint="next"
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
                  selectHandoff.handOffFrom(categoryTriggerRef.current);
                }}
              >
                <SelectTrigger
                  ref={categoryTriggerRef}
                  className="w-full mb-0 text-[16px]"
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent
                  onCloseAutoFocus={selectHandoff.handleCloseAutoFocus}
                >
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
                onValueChange={(v) => {
                  setSubCategoryId(v);
                  selectHandoff.handOffFrom(subCategoryTriggerRef.current);
                }}
                disabled={!categoryId}
              >
                <SelectTrigger
                  ref={subCategoryTriggerRef}
                  className="w-full mb-0 text-[16px]"
                >
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent
                  onCloseAutoFocus={selectHandoff.handleCloseAutoFocus}
                >
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
            />
          )}

          {/* Accounts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {showSource && (
              <div className="space-y-2">
                <Label>Source</Label>
                <Select
                  value={sourceAccountId}
                  onValueChange={(v) => {
                    setSourceAccountId(v);
                    selectHandoff.handOffFrom(sourceTriggerRef.current);
                  }}
                >
                  <SelectTrigger
                    ref={sourceTriggerRef}
                    className="w-full mb-0 text-[16px]"
                  >
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent
                    onCloseAutoFocus={selectHandoff.handleCloseAutoFocus}
                  >
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
                  onValueChange={(v) => {
                    setDestinationAccountId(v);
                    selectHandoff.handOffFrom(destinationTriggerRef.current);
                  }}
                >
                  <SelectTrigger
                    ref={destinationTriggerRef}
                    className="w-full mb-0"
                  >
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent
                    onCloseAutoFocus={selectHandoff.handleCloseAutoFocus}
                  >
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
                enterKeyHint="next"
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
                enterKeyHint="done"
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
