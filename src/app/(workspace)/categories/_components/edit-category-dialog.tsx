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
import { apiFetch } from "@/lib/api/client";
import { useAsyncFormAction } from "@/lib/hooks/use-async-form-action";

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
  const {
    isPending: isSaving,
    error,
    clearError,
    run,
  } = useAsyncFormAction();
  const [showConfirm, setShowConfirm] = useState(false);

  // Adjust state during render (React docs: you-might-not-need-an-effect)
  const [prevTarget, setPrevTarget] = useState(target);
  if (target !== prevTarget) {
    setPrevTarget(target);
    if (target && open) {
      setName(target.name);
      clearError();
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

    // If name changed, show confirmation first
    if (name.trim() !== target.name) {
      setShowConfirm(true);
      return;
    }

    // Name unchanged, save directly
    await save();
  };

  const save = async () => {
    setShowConfirm(false);

    const errorMessage = await run(async () => {
      await apiFetch(target.endpoint, {
        method: "PATCH",
        body: { name: name.trim() },
      });
    }, "Failed to update.");
    if (errorMessage !== null) return;

    onOpenChange(false);
    onUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) setShowConfirm(false);
      onOpenChange(o);
    }}>
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
          <p className="text-xs text-muted-foreground">
            This will update all existing transactions.<br />
            To keep the old name on past transactions, archive and create a new one instead.
          </p>
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

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {isCategory ? "Category" : "Subcategory"}?</DialogTitle>
            <DialogDescription>
              Renaming from <strong>{target.name}</strong> to <strong>{name.trim()}</strong> will
              update the name on all existing transactions that use this
              {isCategory ? " category" : " subcategory"}.<br /><br />
              <strong>This action cannot be undone.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Go Back
            </Button>
            <Button onClick={() => void save()} disabled={isSaving}>
              {isSaving ? "Saving..." : "Confirm Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
