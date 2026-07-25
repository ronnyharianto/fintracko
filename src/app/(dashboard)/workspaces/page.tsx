'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Briefcase,
  Plus,
  Users,
  Trash2,
  UserPlus,
  Shield,
  UserX,
  AlertTriangle,
} from 'lucide-react';
import { useWorkspace } from '@/components/shared/workspace-context';

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

  // Create workspace modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceTemplate, setNewWorkspaceTemplate] = useState<
    'PERSONAL' | 'FAMILY' | 'SMALL_BUSINESS'
  >('PERSONAL');
  const [isCreating, setIsCreating] = useState(false);

  // Invite modal state
  const [inviteWorkspaceId, setInviteWorkspaceId] = useState<string | null>(
    null
  );
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Delete confirmation modal state
  const [deleteWorkspaceId, setDeleteWorkspaceId] = useState<string | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setIsCreating(true);
    try {
      const res = await fetch('/api/v1/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWorkspaceName.trim(),
          templateName: newWorkspaceTemplate,
        }),
      });

      if (res.ok) {
        setNewWorkspaceName('');
        setIsCreateOpen(false);
        await fetchOwnedWorkspaces();
        await refreshWorkspaces();
      } else {
        const json = await res.json();
        alert(json.error?.message || 'Failed to create workspace.');
      }
    } catch {
      alert('An error occurred while creating workspace.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleInviteCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteWorkspaceId || !inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      const res = await fetch(
        `/api/v1/workspaces/${inviteWorkspaceId}/members`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: inviteEmail.trim() }),
        }
      );

      if (res.ok) {
        setInviteEmail('');
        setInviteWorkspaceId(null);
        await fetchOwnedWorkspaces();
      } else {
        const json = await res.json();
        alert(json.error?.message || 'Failed to invite collaborator.');
      }
    } catch {
      alert('An error occurred while inviting collaborator.');
    } finally {
      setIsInviting(false);
    }
  };

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

  const handleDeleteWorkspace = async () => {
    if (!deleteWorkspaceId) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/workspaces/${deleteWorkspaceId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setDeleteWorkspaceId(null);
        await fetchOwnedWorkspaces();
        await refreshWorkspaces();
      } else {
        const json = await res.json();
        alert(json.error?.message || 'Failed to delete workspace.');
      }
    } catch {
      alert('An error occurred while deleting workspace.');
    } finally {
      setIsDeleting(false);
    }
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
            <Card key={ws.id} className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      {ws.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Created on {new Date(ws.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteWorkspaceId(ws.id)}
                    title="Delete Workspace"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center bg-muted/30 p-3 rounded-lg text-sm">
                  <div>
                    <div className="font-bold text-foreground">
                      {ws._count.accounts}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Accounts
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-foreground">
                      {ws._count.transactions}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Transactions
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-foreground">
                      {ws._count.budgets}
                    </div>
                    <div className="text-xs text-muted-foreground">Budgets</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      Collaborators ({ws.members.length})
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInviteWorkspaceId(ws.id)}
                    >
                      <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Invite
                    </Button>
                  </div>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {ws.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between bg-background border border-muted/50 rounded-md px-3 py-1.5 text-sm"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-medium truncate">
                            {member.user.name}
                          </span>
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
                                onClick={() =>
                                  handleRemoveCollaborator(ws.id, member.id)
                                }
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Workspace Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              Create an independent financial workspace and pick a starting
              template.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateWorkspace} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Workspace Name</Label>
              <Input
                id="name"
                placeholder="e.g. Side Hustle"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <Select
                value={newWorkspaceTemplate}
                onValueChange={(val) => setNewWorkspaceTemplate(val as any)}
              >
                <SelectTrigger id="template" className="w-full">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERSONAL">Personal Finance</SelectItem>
                  <SelectItem value="FAMILY">Family Finance</SelectItem>
                  <SelectItem value="SMALL_BUSINESS">Small Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Workspace'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite Collaborator Dialog */}
      <Dialog
        open={!!inviteWorkspaceId}
        onOpenChange={(open) => !open && setInviteWorkspaceId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Collaborator</DialogTitle>
            <DialogDescription>
              Enter the registered email address of the user you want to invite.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteCollaborator} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteWorkspaceId(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isInviting}>
                {isInviting ? 'Inviting...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteWorkspaceId}
        onOpenChange={(open) => !open && setDeleteWorkspaceId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Delete Workspace
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this workspace? This action is
              irreversible and will permanently delete all accounts,
              transactions, budgets, and remove all collaborators.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteWorkspaceId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteWorkspace}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete Workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
