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

interface InviteCollaboratorDialogProps {
  workspaceId: string | null;
  onOpenChange: (open: boolean) => void;
  onInvited: () => void;
}

export function InviteCollaboratorDialog({
  workspaceId,
  onOpenChange,
  onInvited,
}: InviteCollaboratorDialogProps) {
  const [email, setEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !email.trim()) return;

    setIsInviting(true);
    try {
      await apiFetch(`/api/v1/workspaces/${workspaceId}/members`, {
        method: 'POST',
        body: { email: email.trim() },
      });
      toast.success('Invitation sent.');
      setEmail('');
      onOpenChange(false);
      onInvited();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to invite collaborator.',
      );
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <Dialog
      open={!!workspaceId}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Collaborator</DialogTitle>
          <DialogDescription>
            Enter the registered email address of the user you want to invite.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
            <Button type="submit" disabled={isInviting}>
              {isInviting ? 'Inviting...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
