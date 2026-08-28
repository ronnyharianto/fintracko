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

interface CancelInvitationDialogProps {
  invitationId: string | null;
  inviteeName: string | null;
  onOpenChange: (open: boolean) => void;
  onCancelled: () => void;
}

export function CancelInvitationDialog({
  invitationId,
  inviteeName,
  onOpenChange,
  onCancelled,
}: CancelInvitationDialogProps) {
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    if (!invitationId) return;

    setIsCancelling(true);
    try {
      await apiFetch(`/api/v1/invitations/${invitationId}`, {
        method: "DELETE",
      });
      toast.success("Invitation cancelled.");
      onOpenChange(false);
      onCancelled();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to cancel invitation.",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Dialog
      open={!!invitationId}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Cancel Invitation
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel the pending invitation for{' '}
            {inviteeName ? (
              <span className="font-semibold text-foreground">
                {inviteeName}
              </span>
            ) : (
              'this user'
            )}? They will no longer be able to accept this invitation.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Keep Invitation
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleCancel}
            disabled={isCancelling}
          >
            {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
