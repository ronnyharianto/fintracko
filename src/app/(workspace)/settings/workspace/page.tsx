"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Briefcase } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useWorkspace } from "@/components/shared/workspace-context";
import { useOwnedWorkspaces } from "@/features/workspaces/hooks/use-owned-workspaces";
import { WorkspaceCard } from "@/app/(workspace)/settings/workspace/_components/workspace-card";
import { CreateWorkspaceDialog } from "@/app/(workspace)/settings/workspace/_components/create-workspace-dialog";
import { EditWorkspaceDialog } from "@/app/(workspace)/settings/workspace/_components/edit-workspace-dialog";
import { InviteCollaboratorDialog } from "@/app/(workspace)/settings/workspace/_components/invite-collaborator-dialog";


export default function WorkspaceSettingsPage() {
  const { refreshWorkspaces } = useWorkspace();
  const {
    workspaces,
    isLoading,
    error,
    refetch: refetchOwned,
  } = useOwnedWorkspaces();

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [inviteWorkspaceId, setInviteWorkspaceId] = useState<string | null>(
    null,
  );
  const [deleteWorkspaceId, setDeleteWorkspaceId] = useState<string | null>(
    null,
  );
  const [removeTarget, setRemoveTarget] = useState<{
    workspaceId: string;
    memberId: string;
    memberName: string;
  } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{
    invitationId: string;
    inviteeName: string;
  } | null>(null);

  const handleActionComplete = async () => {
    await refetchOwned();
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
            Manage your owned workspaces and collaborators.
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

      <div className="space-y-4">
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
                You do not own any workspaces yet. Create your first workspace
                to start tracking finances.
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
                onRemoveMember={(workspaceId, memberId, memberName) =>
                  setRemoveTarget({ workspaceId, memberId, memberName })
                }
                onCancelInvitation={(_workspaceId, invitationId, inviteeName) =>
                  setCancelTarget({ invitationId, inviteeName })
                }
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
          onInvited={refetchOwned}
        />

        <ConfirmDialog
          open={!!deleteWorkspaceId}
          onOpenChange={(open) => !open && setDeleteWorkspaceId(null)}
          onConfirm={async () => {
            await apiFetch(`/api/v1/workspaces/${deleteWorkspaceId}`, {
              method: 'DELETE',
            });
          }}
          onSuccess={handleActionComplete}
          title="Delete Workspace"
          description={
            <>Are you sure you want to delete {workspaces.find((w) => w.id === deleteWorkspaceId)?.name ? (
              <span className="font-semibold text-foreground">
                &quot;{workspaces.find((w) => w.id === deleteWorkspaceId)?.name}&quot;
              </span>
            ) : (
              'this workspace'
            )}? This action is irreversible and will permanently delete all accounts, transactions, budgets, and remove all collaborators.</>
          }
          confirmLabel="Yes, Delete Workspace"
          loadingLabel="Deleting..."
          successMessage="Workspace deleted."
          errorMessage="Failed to delete workspace."
        />

        <ConfirmDialog
          open={!!removeTarget?.workspaceId && !!removeTarget?.memberId}
          onOpenChange={(open) => !open && setRemoveTarget(null)}
          onConfirm={async () => {
            if (!removeTarget) return;
            await apiFetch(`/api/v1/workspaces/${removeTarget.workspaceId}/members/${removeTarget.memberId}`, {
              method: 'DELETE',
            });
          }}
          onSuccess={handleActionComplete}
          title="Remove Collaborator"
          description={
            <>Are you sure you want to remove {removeTarget?.memberName ? (
              <span className="font-semibold text-foreground">
                {removeTarget.memberName}
              </span>
            ) : (
              'this collaborator'
            )} from the workspace? They will lose access to all accounts, transactions, and budgets in this workspace.</>
          }
          confirmLabel="Yes, Remove"
          loadingLabel="Removing..."
          successMessage="Collaborator removed."
          errorMessage="Failed to remove collaborator."
        />

        <ConfirmDialog
          open={!!cancelTarget?.invitationId}
          onOpenChange={(open) => !open && setCancelTarget(null)}
          onConfirm={async () => {
            if (!cancelTarget) return;
            await apiFetch(`/api/v1/invitations/${cancelTarget.invitationId}`, {
              method: 'DELETE',
            });
          }}
          onSuccess={handleActionComplete}
          title="Cancel Invitation"
          description={
            <>Are you sure you want to cancel the pending invitation for {cancelTarget?.inviteeName ? (
              <span className="font-semibold text-foreground">
                {cancelTarget.inviteeName}
              </span>
            ) : (
              'this user'
            )}? They will no longer be able to accept this invitation.</>
          }
          confirmLabel="Yes, Cancel"
          loadingLabel="Cancelling..."
          cancelLabel="Keep Invitation"
          successMessage="Invitation cancelled."
          errorMessage="Failed to cancel invitation."
        />
      </div>
    </div>
  );
}
