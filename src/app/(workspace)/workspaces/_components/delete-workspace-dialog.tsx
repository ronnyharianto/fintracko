'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';

interface DeleteWorkspaceDialogProps {
  workspaceId: string | null;
  /**
   * Name of the workspace being deleted, when known — shown in the
   * confirmation so the user always sees *which* workspace is targeted.
   */
  workspaceName?: string | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteWorkspaceDialog({
  workspaceId,
  workspaceName,
  onOpenChange,
  onDeleted,
}: DeleteWorkspaceDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!workspaceId) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/workspaces/${workspaceId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        onOpenChange(false);
        onDeleted();
      } else {
        const json = await res.json();
        alert(json.error?.message || 'Failed to delete workspace.');
      }
    } catch {
      alert('An error occurred while deleting workspace.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open={!!workspaceId}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Delete Workspace
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{' '}
            {workspaceName ? (
              <span className="font-semibold text-foreground">
                &quot;{workspaceName}&quot;
              </span>
            ) : (
              'this workspace'
            )}
            ? This action is irreversible and will permanently delete all
            accounts, transactions, budgets, and remove all collaborators.
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
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Yes, Delete Workspace'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
