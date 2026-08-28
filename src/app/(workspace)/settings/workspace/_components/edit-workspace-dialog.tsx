'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api/client';

interface EditWorkspaceDialogProps {
  workspace: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function EditWorkspaceDialog({
  workspace,
  onOpenChange,
  onUpdated,
}: EditWorkspaceDialogProps) {
  const [name, setName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Adjust state during render (React docs: you-might-not-need-an-effect)
  // instead of a setState-in-effect, which the lint rule flags.
  const [prevWorkspace, setPrevWorkspace] = useState(workspace);
  if (workspace !== prevWorkspace) {
    setPrevWorkspace(workspace);
    setName(workspace?.name ?? '');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !name.trim()) return;

    setIsUpdating(true);
    try {
      await apiFetch(`/api/v1/workspaces/${workspace.id}`, {
        method: 'PATCH',
        body: { name: name.trim() },
      });
      toast.success('Workspace name updated.');
      onOpenChange(false);
      onUpdated();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to update workspace name.',
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog
      open={!!workspace}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Workspace Name</DialogTitle>
          <DialogDescription>
            Update the name of your financial workspace.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Workspace Name</Label>
            <Input
              id="edit-name"
              placeholder="e.g. Personal Finance"
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
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
