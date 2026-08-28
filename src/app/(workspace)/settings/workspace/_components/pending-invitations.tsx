'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Check, X } from 'lucide-react';
import { withToast } from '@/lib/toast';
import { usePendingInvitations } from '@/features/workspaces/hooks/use-pending-invitations';

interface PendingInvitationsProps {
  onAccepted?: () => void;
}

export function PendingInvitations({ onAccepted }: PendingInvitationsProps) {
  const { invitations, isLoading, acceptInvitation, rejectInvitation } =
    usePendingInvitations();

  const handleAccept = async (invitationId: string) => {
    await withToast(
      () => acceptInvitation(invitationId),
      'Invitation accepted. You are now a collaborator.',
      'Failed to accept invitation.',
    );
    onAccepted?.();
  };

  const handleReject = (invitationId: string) =>
    withToast(
      () => rejectInvitation(invitationId),
      'Invitation rejected.',
      'Failed to reject invitation.',
    );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground animate-pulse">
          Loading invitations…
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Mail className="h-5 w-5" />
          Pending Invitations
        </CardTitle>
        <CardDescription>
          Workspace invitations you have received but have not responded to yet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-center justify-between border border-amber-200 dark:border-amber-800 bg-white dark:bg-amber-950/50 rounded-md px-4 py-3"
          >
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{invitation.workspace.name}</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Invited by {invitation.inviter.name} ({invitation.inviter.email})
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => handleAccept(invitation.id)}
              >
                <Check className="h-3.5 w-3.5 mr-1" /> Accept
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900"
                onClick={() => handleReject(invitation.id)}
              >
                <X className="h-3.5 w-3.5 mr-1" /> Reject
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
