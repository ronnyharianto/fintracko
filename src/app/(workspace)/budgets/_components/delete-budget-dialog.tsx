"use client";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useWorkspace } from "@/components/shared/workspace/workspace-context";
import { apiFetch } from "@/lib/api/client";
import type { BudgetView } from "@/features/budgets/types";

interface DeleteBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: BudgetView | null;
  onDeleted: () => void;
}

export function DeleteBudgetDialog({
  open,
  onOpenChange,
  budget,
  onDeleted,
}: DeleteBudgetDialogProps) {
  const { activeWorkspaceId } = useWorkspace();

  const handleConfirm = async () => {
    if (!activeWorkspaceId || !budget) return;
    await apiFetch(
      `/api/v1/workspaces/${activeWorkspaceId}/budgets/${budget.id}`,
      { method: "DELETE" },
    );
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleConfirm}
      onSuccess={onDeleted}
      title="Delete Budget"
      description={
        budget
          ? `Delete the ${budget.interval.toLowerCase()} budget for "${budget.subCategoryName}"? This cannot be undone.`
          : "This cannot be undone."
      }
      confirmLabel="Delete"
      loadingLabel="Deleting..."
      successMessage="Budget deleted."
      errorMessage="Failed to delete budget."
    />
  );
}
