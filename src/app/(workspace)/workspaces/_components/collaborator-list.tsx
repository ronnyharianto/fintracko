'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, Shield, UserX } from 'lucide-react';
import type { WorkspaceMemberView } from '@/features/workspaces/types';

interface CollaboratorListProps {
  workspaceId: string;
  members: WorkspaceMemberView[];
  onInviteClick: () => void;
  onRemoveMember: (memberId: string) => void;
}

export function CollaboratorList({
  workspaceId,
  members,
  onInviteClick,
  onRemoveMember,
}: CollaboratorListProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold flex items-center gap-1.5">
          <Users className="h-4 w-4 text-muted-foreground" />
          Collaborators ({members.length})
        </span>
        <Button variant="outline" size="sm" onClick={onInviteClick}>
          <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Invite
        </Button>
      </div>

      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between bg-background border border-muted/50 rounded-md px-3 py-1.5 text-sm"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="font-medium truncate">{member.user.name}</span>
              <span className="text-xs text-muted-foreground truncate">
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
                    onClick={() => onRemoveMember(member.id)}
                    title="Remove Collaborator"
                  >
                    <UserX className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
