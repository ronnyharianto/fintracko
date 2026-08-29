"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Briefcase, Trash2, Edit2 } from "lucide-react";
import { CollaboratorList } from "./collaborator-list";
import { OwnedWorkspace } from "@/features/workspaces/types";

interface WorkspaceCardProps {
  workspace: OwnedWorkspace;
  onEditClick: (workspace: OwnedWorkspace) => void;
  onDeleteClick: (workspaceId: string) => void;
  onInviteClick: (workspaceId: string) => void;
  onRemoveMember: (
    workspaceId: string,
    memberId: string,
    memberName: string,
  ) => void;
  onCancelInvitation: (
    workspaceId: string,
    invitationId: string,
    inviteeName: string,
  ) => void;
}

export function WorkspaceCard({
  workspace,
  onEditClick,
  onDeleteClick,
  onInviteClick,
  onRemoveMember,
  onCancelInvitation,
}: WorkspaceCardProps) {
  const currencyLabel =
    workspace.currency === "IDR"
      ? "IDR - Indonesian Rupiah"
      : "USD - US Dollar";

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <CardTitle className="text-xl flex items-center gap-2 min-h-9">
              <Briefcase className="h-5 w-5 text-primary shrink-0" />
              <span className="truncate">{workspace.name}</span>
            </CardTitle>
            <CardDescription className="mt-1">{currencyLabel}</CardDescription>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-muted"
              onClick={() => onEditClick(workspace)}
              title="Edit Workspace Name"
            >
              <Edit2 className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDeleteClick(workspace.id)}
              title="Delete Workspace"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 overflow-hidden">
        <CollaboratorList
          members={workspace.members}
          invitations={workspace.invitations}
          onInviteClick={() => onInviteClick(workspace.id)}
          onRemoveMember={(memberId, memberName) =>
            onRemoveMember(workspace.id, memberId, memberName)
          }
          onCancelInvitation={(invitationId, inviteeName) =>
            onCancelInvitation(workspace.id, invitationId, inviteeName)
          }
        />
      </CardContent>
    </Card>
  );
}
