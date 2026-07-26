'use client';

import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
    }
  }, [workspace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !name.trim()) return;

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/v1/workspaces/${workspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (res.ok) {
        onOpenChange(false);
        onUpdated();
      } else {
        const json = await res.json();
        alert(json.error?.message || 'Failed to update workspace name.');
      }
    } catch {
      alert('An error occurred while updating workspace name.');
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
