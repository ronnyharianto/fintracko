"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { AccountType } from "@/features/accounts/types";

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "CHECKING", label: "Checking" },
  { value: "SAVINGS", label: "Savings" },
  { value: "CASH", label: "Cash" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "DIGITAL_WALLET", label: "Digital Wallet" },
  { value: "INVESTMENT", label: "Investment" },
];

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateAccountDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateAccountDialogProps) {
  const { activeWorkspaceId } = useWorkspace();

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("CHECKING");
  const [initialBalance, setInitialBalance] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !activeWorkspaceId) return;

    setIsCreating(true);
    setError(null);

    try {
      await apiFetch(
        `/api/v1/workspaces/${activeWorkspaceId}/accounts`,
        {
          method: "POST",
          body: {
            name: name.trim(),
            type,
            initialBalance: parseFloat(initialBalance) || 0,
          },
        },
      );
      setName("");
      setType("CHECKING");
      setInitialBalance("");
      onOpenChange(false);
      onCreated();
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Failed to create account.";
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Account</DialogTitle>
          <DialogDescription>
            Add a financial account to track your balances.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="account-name">Account Name</Label>
            <Input
              id="account-name"
              placeholder="e.g. Main Checking"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-type">Account Type</Label>
            <Select
              value={type}
              onValueChange={(val) => setType(val as AccountType)}
            >
              <SelectTrigger id="account-type" className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-balance">Initial Balance</Label>
            <Input
              id="account-balance"
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
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
