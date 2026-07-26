'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Briefcase, Trash2, Edit2 } from 'lucide-react';
import { CollaboratorList } from './collaborator-list';

interface Member {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  members: Member[];
  _count: {
    accounts: number;
    transactions: number;
    budgets: number;
  };
}

interface WorkspaceCardProps {
  workspace: Workspace;
  onEditClick: (workspace: Workspace) => void;
  onDeleteClick: (workspaceId: string) => void;
  onInviteClick: (workspaceId: string) => void;
  onRemoveMember: (workspaceId: string, memberId: string) => void;
}

export function WorkspaceCard({
  workspace,
  onEditClick,
  onDeleteClick,
  onInviteClick,
  onRemoveMember,
}: WorkspaceCardProps) {
  return (
    <Card className="flex flex-col justify-between">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              {workspace.name}
            </CardTitle>
            <CardDescription className="mt-1">
              Created on {new Date(workspace.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
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
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center bg-muted/30 p-3 rounded-lg text-sm">
          <div>
            <div className="font-bold text-foreground">
              {workspace._count.accounts}
            </div>
            <div className="text-xs text-muted-foreground">Accounts</div>
          </div>
          <div>
            <div className="font-bold text-foreground">
              {workspace._count.transactions}
            </div>
            <div className="text-xs text-muted-foreground">Transactions</div>
          </div>
          <div>
            <div className="font-bold text-foreground">
              {workspace._count.budgets}
            </div>
            <div className="text-xs text-muted-foreground">Budgets</div>
          </div>
        </div>

        <CollaboratorList
          workspaceId={workspace.id}
          members={workspace.members}
          onInviteClick={() => onInviteClick(workspace.id)}
          onRemoveMember={(memberId) => onRemoveMember(workspace.id, memberId)}
        />
      </CardContent>
    </Card>
  );
}
