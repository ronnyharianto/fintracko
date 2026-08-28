'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useWorkspace } from '@/components/shared/workspace/workspace-context';
import { ChevronDown, Plus, Briefcase, Building2, Mail, Check, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { withToast } from '@/lib/toast';

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId, isLoading, invitations, acceptInvitation, rejectInvitation } =
    useWorkspace();
  const [isOpen, setIsOpen] = useState(false);

  const handleAccept = (invitationId: string) =>
    withToast(
      () => acceptInvitation(invitationId),
      'Invitation accepted.',
      'Failed to accept invitation.',
    );

  const handleReject = (invitationId: string) =>
    withToast(
      () => rejectInvitation(invitationId),
      'Invitation rejected.',
      'Failed to reject invitation.',
    );

  const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId);

  const handleWorkspaceChange = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground animate-pulse">
        <span className="h-4 w-24 bg-muted rounded"></span>
        <ChevronDown className="h-4 w-4" />
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 px-3 gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span>No Workspace</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
            Workspaces
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-center text-muted-foreground py-3"
            asChild
          >
            <Link href="/settings/workspace?tab=workspaces">
              No workspaces found. Create one from settings.
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 px-3 gap-2 text-sm font-medium hover:bg-accent"
        >
          <span className="relative">
            <Briefcase className="h-4 w-4 text-primary" />
            {invitations.length > 0 && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500" />
            )}
          </span>
          <span className="truncate max-w-45">
            {activeWorkspace?.name || 'Select Workspace'}
          </span>
          {invitations.length > 0 && (
            <span className="text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-medium">
              {invitations.length}
            </span>
          )}
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 min-w-55">
        {invitations.length > 0 && (
          <>
            <div className="px-2 py-1.5">
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Pending Invitations ({invitations.length})
              </span>
            </div>
            <div className="mx-2 mb-1 space-y-1">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-sm text-amber-900 dark:text-amber-100">
                      {invitation.workspace.name}
                    </span>
                  </div>
                  <span className="text-xs text-amber-700 dark:text-amber-300">
                    Invited by {invitation.inviter.name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Button
                      size="sm"
                      className="h-6 px-2.5 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAccept(invitation.id);
                      }}
                    >
                      <Check className="h-3 w-3 mr-1" /> Accept
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2.5 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReject(invitation.id);
                      }}
                    >
                      <X className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
          Your Workspaces
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            className={`flex items-center gap-2 ${
              workspace.id === activeWorkspaceId ? 'bg-primary/10 text-primary' : ''
            }`}
            onClick={() => handleWorkspaceChange(workspace.id)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleWorkspaceChange(workspace.id);
              }
            }}
          >
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  workspace.id === activeWorkspaceId ? 'bg-primary' : 'bg-muted'
                }`}
              />
              <span className="truncate font-medium">{workspace.name}</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {workspace.role.toLowerCase()}
            </span>
            {workspace.id === activeWorkspaceId && (
              <Building2 className="h-3.5 w-3.5 text-primary ml-auto" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-center text-primary hover:bg-primary/10"
          asChild
          onClick={() => setIsOpen(false)}
        >
          <Link href="/settings/workspace?tab=workspaces">
            <Plus className="h-4 w-4 mr-2" />
            Manage Workspaces
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
