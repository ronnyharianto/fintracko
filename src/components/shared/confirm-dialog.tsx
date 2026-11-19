"use client";

import { useState } from "react";
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
import { AlertTriangle, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  onSuccess: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  loadingLabel: string;
  cancelLabel?: string;
  icon?: LucideIcon;
  successMessage: string;
  errorMessage: string;
  /**
   * Exact text the user must type before the destructive button unlocks.
   * Used for irreversible actions (deleting an account or workspace), where
   * a single mis-click must not be enough.
   */
  confirmationPhrase?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  onSuccess,
  title,
  description,
  confirmLabel,
  loadingLabel,
  cancelLabel = "Cancel",
  icon: Icon = AlertTriangle,
  successMessage,
  errorMessage,
  confirmationPhrase,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [typedConfirmation, setTypedConfirmation] = useState("");

  // Clearing here keeps the input empty whenever the dialog closes, without
  // a setState-in-effect on `open`.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTypedConfirmation("");
    }
    onOpenChange(next);
  };

  const isConfirmationTyped =
    !confirmationPhrase || typedConfirmation.trim() === confirmationPhrase;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      toast.success(successMessage);
      setTypedConfirmation("");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleOpenChange(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Icon className="h-5 w-5" /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {confirmationPhrase && (
          <div className="space-y-2">
            <Label htmlFor="confirm-phrase">
              Type <span className="font-semibold">{confirmationPhrase}</span>{" "}
              to confirm
            </Label>
            <Input
              id="confirm-phrase"
              value={typedConfirmation}
              onChange={(event) => setTypedConfirmation(event.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || !isConfirmationTyped}
          >
            {isLoading ? loadingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
