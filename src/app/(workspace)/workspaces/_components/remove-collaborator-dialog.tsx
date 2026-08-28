"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";

interface RemoveCollaboratorDialogProps {
  workspaceId: string | null;
  memberId: string | null;
  memberName: string | null;
  onOpenChange: (open: boolean) => void;
  onRemoved: () => void;
}

export function RemoveCollaboratorDialog({
  workspaceId,
  memberId,
  memberName,
  onOpenChange,
  onRemoved,
}: RemoveCollaboratorDialogProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    if (!workspaceId || !memberId) return;

    setIsRemoving(true);
    try {
      await apiFetch(`/api/v1/workspaces/${workspaceId}/members/${memberId}`, {
        method: "DELETE",
      });
      toast.success("Collaborator removed.");
      onOpenChange(false);
      onRemoved();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove collaborator.",
      );
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Dialog
      open={!!workspaceId && !!memberId}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Remove Collaborator
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to remove{" "}
            {memberName ? (
              <span className="font-semibold text-foreground">
                {memberName}
              </span>
            ) : (
              "this collaborator"
            )}{" "}
            from the workspace? They will lose access to all accounts,
            transactions, and budgets in this workspace.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleRemove}
            disabled={isRemoving}
          >
            {isRemoving ? "Removing..." : "Yes, Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
