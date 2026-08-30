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
import type { TransactionType } from "@/features/categories/types";

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: "INCOME", label: "Income" },
  { value: "EXPENSE", label: "Expense" },
  { value: "TRANSFER", label: "Transfer" },
];

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType: TransactionType;
  onCreated: () => void;
}

export function CreateCategoryDialog({
  open,
  onOpenChange,
  defaultType,
  onCreated,
}: CreateCategoryDialogProps) {
  const { activeWorkspaceId } = useWorkspace();

  const [name, setName] = useState("");
  const [type, setType] = useState<TransactionType>(defaultType);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !activeWorkspaceId) return;

    setIsCreating(true);
    setError(null);

    try {
      await apiFetch(
        `/api/v1/workspaces/${activeWorkspaceId}/categories`,
        {
          method: "POST",
          body: { name: name.trim(), type },
        },
      );
      setName("");
      onOpenChange(false);
      onCreated();
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Failed to create category.";
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Category</DialogTitle>
          <DialogDescription>
            Add a new category to organize your transactions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="category-name">Category Name</Label>
            <Input
              id="category-name"
              placeholder="e.g. Groceries"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category-type">Type</Label>
            <Select
              value={type}
              onValueChange={(val) => setType(val as TransactionType)}
            >
              <SelectTrigger id="category-type" className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {isCreating ? "Creating..." : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
