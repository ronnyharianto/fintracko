"use client";

import { useWorkspace } from "@/components/shared/workspace/workspace-context";
import { apiFetch } from "@/lib/api/client";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { TransactionView } from "@/features/transactions/types";

interface DeleteTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionView | null;
  onDeleted: () => void;
}

export function DeleteTransactionDialog({
  open,
  onOpenChange,
  transaction,
  onDeleted,
}: DeleteTransactionDialogProps) {
  const { activeWorkspaceId } = useWorkspace();

  const handleDelete = async () => {
    if (!activeWorkspaceId || !transaction) return;
    await apiFetch(
      `/api/v1/workspaces/${activeWorkspaceId}/transactions/${transaction.id}`,
      { method: "DELETE" },
    );
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleDelete}
      onSuccess={onDeleted}
      title="Delete Transaction"
      description="Are you sure you want to delete this transaction? This will reverse the balance change on affected accounts."
      confirmLabel="Delete"
      loadingLabel="Deleting..."
      successMessage="Transaction deleted"
      errorMessage="Failed to delete transaction"
    />
  );
}
