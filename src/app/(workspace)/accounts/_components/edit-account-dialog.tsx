"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { AccountView } from "@/features/accounts/types";

const TYPE_LABELS: Record<string, string> = {
  CHECKING: "Checking",
  SAVINGS: "Savings",
  CASH: "Cash",
  CREDIT_CARD: "Credit Card",
  DIGITAL_WALLET: "Digital Wallet",
  INVESTMENT: "Investment",
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  CHECKING: "bg-blue-100 text-blue-800",
  SAVINGS: "bg-green-100 text-green-800",
  CASH: "bg-yellow-100 text-yellow-800",
  CREDIT_CARD: "bg-red-100 text-red-800",
  DIGITAL_WALLET: "bg-purple-100 text-purple-800",
  INVESTMENT: "bg-orange-100 text-orange-800",
};

interface EditAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountView | null;
  onUpdated: () => void;
}

export function EditAccountDialog({
  open,
  onOpenChange,
  account,
  onUpdated,
}: EditAccountDialogProps) {
  const { activeWorkspaceId } = useWorkspace();

  const [name, setName] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Adjust state during render (React docs: you-might-not-need-an-effect)
  // instead of a setState-in-effect, which the lint rule flags.
  const [prevAccount, setPrevAccount] = useState(account);
  if (account !== prevAccount) {
    setPrevAccount(account);
    if (account && open) {
      setName(account.name);
      setInitialBalance(account.initialBalance);
      setError(null);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !activeWorkspaceId || !account) return;

    setIsSaving(true);
    setError(null);

    try {
      await apiFetch(
        `/api/v1/workspaces/${activeWorkspaceId}/accounts/${account.id}`,
        {
          method: "PATCH",
          body: {
            name: name.trim(),
            initialBalance: parseFloat(initialBalance) || 0,
          },
        },
      );
      onOpenChange(false);
      onUpdated();
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Failed to update account.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>
            Update your account name or initial balance.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="space-y-2">
            <Label>Account Type</Label>
            <span
              className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                TYPE_BADGE_COLORS[account.type] ?? "bg-gray-100 text-gray-800"
              }`}
            >
              {TYPE_LABELS[account.type] ?? account.type}
            </span>
            <p className="text-xs text-muted-foreground">
              Account type cannot be changed after creation.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-account-name">Account Name</Label>
            <Input
              id="edit-account-name"
              placeholder="e.g. Main Checking"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-account-balance">Initial Balance</Label>
            <Input
              id="edit-account-balance"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              required
            />
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
