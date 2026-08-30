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

interface EditCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: {
    type: "category" | "subcategory";
    id: string;
    name: string;
    /** API endpoint for the PATCH request. Caller constructs this. */
    endpoint: string;
  } | null;
  onUpdated: () => void;
}

export function EditCategoryDialog({
  open,
  onOpenChange,
  target,
  onUpdated,
}: EditCategoryDialogProps) {
  const [name, setName] = useState(target?.name ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Adjust state during render (React docs: you-might-not-need-an-effect)
  const [prevTarget, setPrevTarget] = useState(target);
  if (target !== prevTarget) {
    setPrevTarget(target);
    if (target && open) {
      setName(target.name);
      setError(null);
    }
  }

  if (!target) return null;

  const isCategory = target.type === "category";
  const title = isCategory ? "Edit Category" : "Edit Subcategory";
  const description = isCategory
    ? "Update the category name."
    : "Update the subcategory name.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      await apiFetch(target.endpoint, {
        method: "PATCH",
        body: { name: name.trim() },
      });
      onOpenChange(false);
      onUpdated();
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Failed to update.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
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
