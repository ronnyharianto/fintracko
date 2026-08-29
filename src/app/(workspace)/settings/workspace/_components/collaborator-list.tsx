'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, Shield, UserX, Clock, Ban } from 'lucide-react';
import type { WorkspaceMemberView, WorkspaceInvitationView } from '@/features/workspaces/types';

interface CollaboratorListProps {
  members: WorkspaceMemberView[];
  invitations: WorkspaceInvitationView[];
  onInviteClick: () => void;
  onRemoveMember: (memberId: string, memberName: string) => void;
  onCancelInvitation: (invitationId: string, inviteeName: string) => void;
}

export function CollaboratorList({
  members,
  invitations,
  onInviteClick,
  onRemoveMember,
  onCancelInvitation,
}: CollaboratorListProps) {
  return (
    <div className="space-y-2 min-w-0">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-sm font-semibold flex items-center gap-1.5 shrink-0">
          <Users className="h-4 w-4 text-muted-foreground" />
          Collaborators ({members.length})
        </span>
        <Button variant="outline" size="sm" onClick={onInviteClick} className="shrink-0">
          <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Invite
        </Button>
      </div>

      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between bg-background border border-muted/50 rounded-md px-3 py-1.5 text-sm min-w-0 overflow-hidden"
          >
            <div className="flex items-center gap-2 truncate min-w-0">
              <span className="font-medium truncate">{member.user.name}</span>
              <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                ({member.user.email})
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {member.role === 'OWNER' ? (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Owner
                </span>
              ) : (
                <>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    Collaborator
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                    onClick={() => onRemoveMember(member.id, member.user.name)}
                    title="Remove Collaborator"
                  >
                    <UserX className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-center justify-between bg-background border border-dashed border-muted rounded-md px-3 py-1.5 text-sm opacity-70 min-w-0 overflow-hidden"
          >
            <div className="flex items-center gap-2 truncate min-w-0">
              <span className="font-medium truncate">{invitation.invitee.name}</span>
              <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                ({invitation.invitee.email})
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" /> Pending
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                onClick={() => onCancelInvitation(invitation.id, invitation.invitee.name)}
                title="Cancel Invitation"
              >
                <Ban className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
