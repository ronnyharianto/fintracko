'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Briefcase, Plus } from 'lucide-react';
import { useWorkspace } from '@/components/shared/workspace-context';
import { WorkspaceCard } from './_components/workspace-card';
import { CreateWorkspaceDialog } from './_components/create-workspace-dialog';
import { EditWorkspaceDialog } from './_components/edit-workspace-dialog';
import { InviteCollaboratorDialog } from './_components/invite-collaborator-dialog';
import { DeleteWorkspaceDialog } from './_components/delete-workspace-dialog';

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

export default function WorkspacesPage() {
  const { refreshWorkspaces } = useWorkspace();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [inviteWorkspaceId, setInviteWorkspaceId] = useState<string | null>(
    null
  );
  const [deleteWorkspaceId, setDeleteWorkspaceId] = useState<string | null>(
    null
  );

  const fetchOwnedWorkspaces = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/workspaces?owned=true');
      if (res.ok) {
        const json = await res.json();
        setWorkspaces(json.data?.workspaces || []);
      } else {
        setError('Failed to fetch workspaces.');
      }
    } catch {
      setError('An error occurred while fetching workspaces.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOwnedWorkspaces();
  }, []);

  const handleRemoveCollaborator = async (
    workspaceId: string,
    memberId: string
  ) => {
    if (!confirm('Are you sure you want to remove this collaborator?')) return;

    try {
      const res = await fetch(
        `/api/v1/workspaces/${workspaceId}/members/${memberId}`,
        {
          method: 'DELETE',
        }
      );

      if (res.ok) {
        await fetchOwnedWorkspaces();
      } else {
        const json = await res.json();
        alert(json.error?.message || 'Failed to remove collaborator.');
      }
    } catch {
      alert('An error occurred while removing collaborator.');
    }
  };

  const handleActionComplete = async () => {
    await fetchOwnedWorkspaces();
    await refreshWorkspaces();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Workspace Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your owned workspaces, templates, and collaborators.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Workspace
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground animate-pulse">
          Loading your workspaces…
        </div>
      ) : workspaces.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No workspaces found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              You do not own any workspaces yet. Create your first workspace to
              start tracking finances.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Workspace
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {workspaces.map((ws) => (
            <WorkspaceCard
              key={ws.id}
              workspace={ws}
              onEditClick={(w) =>
                setEditingWorkspace({ id: w.id, name: w.name })
              }
              onDeleteClick={(id) => setDeleteWorkspaceId(id)}
              onInviteClick={(id) => setInviteWorkspaceId(id)}
              onRemoveMember={handleRemoveCollaborator}
            />
          ))}
        </div>
      )}

      {/* Modals / Dialogs */}
      <CreateWorkspaceDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={handleActionComplete}
      />

      <EditWorkspaceDialog
        workspace={editingWorkspace}
        onOpenChange={(open) => !open && setEditingWorkspace(null)}
        onUpdated={handleActionComplete}
      />

      <InviteCollaboratorDialog
        workspaceId={inviteWorkspaceId}
        onOpenChange={(open) => !open && setInviteWorkspaceId(null)}
        onInvited={fetchOwnedWorkspaces}
      />

      <DeleteWorkspaceDialog
        workspaceId={deleteWorkspaceId}
        onOpenChange={(open) => !open && setDeleteWorkspaceId(null)}
        onDeleted={handleActionComplete}
      />
    </div>
  );
}
