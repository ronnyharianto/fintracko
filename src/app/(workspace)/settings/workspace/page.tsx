'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Briefcase, Trash2, Users, Shield, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api/client';
import { useWorkspace } from '@/components/shared/workspace-context';
import { WorkspaceCard } from '@/app/(workspace)/workspaces/_components/workspace-card';
import { CreateWorkspaceDialog } from '@/app/(workspace)/workspaces/_components/create-workspace-dialog';
import { EditWorkspaceDialog } from '@/app/(workspace)/workspaces/_components/edit-workspace-dialog';
import { InviteCollaboratorDialog } from '@/app/(workspace)/workspaces/_components/invite-collaborator-dialog';
import { DeleteWorkspaceDialog } from '@/app/(workspace)/workspaces/_components/delete-workspace-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OwnedWorkspace } from '@/features/workspaces/types';

export default function WorkspaceSettingsPage() {
  const { refreshWorkspaces } = useWorkspace();
  const [workspaces, setWorkspaces] = useState<OwnedWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [inviteWorkspaceId, setInviteWorkspaceId] = useState<string | null>(null);
  const [deleteWorkspaceId, setDeleteWorkspaceId] = useState<string | null>(null);
  // Workspace explicitly chosen in the Danger Zone picker (B5) — the delete
  // flow must never silently target the first workspace.
  const [dangerZoneWorkspaceId, setDangerZoneWorkspaceId] = useState('');

  /**
   * Pure loader: fetches the owned workspaces and returns them, throwing on
   * failure. Contains NO setState, so it is safe to call from the mount
   * effect — the `react-hooks/set-state-in-effect` lint rule flags any
   * component-scope function that sets state synchronously.
   */
  const fetchOwnedWorkspaces = async (): Promise<OwnedWorkspace[]> => {
    const { workspaces } = await apiFetch<{
      workspaces: OwnedWorkspace[];
    }>('/api/v1/workspaces?owned=true');
    return workspaces || [];
  };

  const loadOwnedWorkspaces = async () => {
    try {
      const workspaces = await fetchOwnedWorkspaces();
      setWorkspaces(workspaces);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while fetching workspaces.'
      );
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const workspaces = await fetchOwnedWorkspaces();
        if (!cancelled) setWorkspaces(workspaces);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'An error occurred while fetching workspaces.'
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRemoveCollaborator = async (
    workspaceId: string,
    memberId: string
  ) => {
    if (!confirm('Are you sure you want to remove this collaborator?')) return;

    try {
      await apiFetch(
        `/api/v1/workspaces/${workspaceId}/members/${memberId}`,
        { method: 'DELETE' },
      );
      toast.success('Collaborator removed.');
      await loadOwnedWorkspaces();
      await refreshWorkspaces();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to remove collaborator.',
      );
    }
  };

  const handleActionComplete = async () => {
    await loadOwnedWorkspaces();
    await refreshWorkspaces();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspace Management</h1>
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

      <Tabs defaultValue="workspaces" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="workspaces" className="space-y-4">
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
                  onEditClick={(w) => setEditingWorkspace({ id: w.id, name: w.name })}
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
            workspaceName={workspaces.find((w) => w.id === deleteWorkspaceId)?.name}
            onOpenChange={(open) => !open && setDeleteWorkspaceId(null)}
            onDeleted={handleActionComplete}
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Workspace Templates
              </CardTitle>
              <CardDescription>
                Templates help you quickly set up a new workspace with pre-configured accounts,
                categories, and budgets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card className="border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors">
                  <CardContent className="p-6 text-center">
                    <Briefcase className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <h4 className="font-medium">Personal Finance</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Standard personal finance tracking with common expense categories.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors">
                  <CardContent className="p-6 text-center">
                    <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <h4 className="font-medium">Family Finance</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Shared family budgeting with joint accounts and shared categories.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors">
                  <CardContent className="p-6 text-center">
                    <Shield className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <h4 className="font-medium">Small Business</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Business expense tracking with income/expense categories and tax reports.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="space-y-4">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible and destructive actions. Please proceed with caution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Delete Workspace</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete a workspace and all its data. This action cannot be undone.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Select
                    value={dangerZoneWorkspaceId}
                    onValueChange={setDangerZoneWorkspaceId}
                  >
                    <SelectTrigger className="w-full sm:w-72">
                      <SelectValue placeholder="Select a workspace…" />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaces.map((ws) => (
                        <SelectItem key={ws.id} value={ws.id}>
                          {ws.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteWorkspaceId(dangerZoneWorkspaceId)}
                    disabled={!dangerZoneWorkspaceId}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Workspace
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}