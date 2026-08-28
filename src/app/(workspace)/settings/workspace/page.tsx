"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Briefcase } from "lucide-react";
import { useWorkspace } from "@/components/shared/workspace-context";
import { useOwnedWorkspaces } from "@/features/workspaces/hooks/use-owned-workspaces";
import { WorkspaceCard } from "@/app/(workspace)/workspaces/_components/workspace-card";
import { CreateWorkspaceDialog } from "@/app/(workspace)/workspaces/_components/create-workspace-dialog";
import { EditWorkspaceDialog } from "@/app/(workspace)/workspaces/_components/edit-workspace-dialog";
import { InviteCollaboratorDialog } from "@/app/(workspace)/workspaces/_components/invite-collaborator-dialog";
import { DeleteWorkspaceDialog } from "@/app/(workspace)/workspaces/_components/delete-workspace-dialog";
import { RemoveCollaboratorDialog } from "@/app/(workspace)/workspaces/_components/remove-collaborator-dialog";

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

        <DeleteWorkspaceDialog
          workspaceId={deleteWorkspaceId}
          workspaceName={
            workspaces.find((w) => w.id === deleteWorkspaceId)?.name
          }
          onOpenChange={(open) => !open && setDeleteWorkspaceId(null)}
          onDeleted={handleActionComplete}
        />

        <RemoveCollaboratorDialog
          workspaceId={removeTarget?.workspaceId ?? null}
          memberId={removeTarget?.memberId ?? null}
          memberName={removeTarget?.memberName ?? null}
          onOpenChange={(open) => !open && setRemoveTarget(null)}
          onRemoved={handleActionComplete}
        />
      </div>
    </div>
  );
}
