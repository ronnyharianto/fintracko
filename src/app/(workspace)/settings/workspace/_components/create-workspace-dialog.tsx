'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api/client';

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateWorkspaceDialogProps) {
  const [name, setName] = useState('');
  const [templateName, setTemplateName] = useState<
    'PERSONAL' | 'FAMILY' | 'SMALL_BUSINESS'
  >('PERSONAL');
  const [currency, setCurrency] = useState<'USD' | 'IDR'>('USD');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      await apiFetch('/api/v1/workspaces', {
        method: 'POST',
        body: { name: name.trim(), templateName, currency },
      });
      toast.success('Workspace created.');
      setName('');
      onOpenChange(false);
      onCreated();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create workspace.',
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
          <DialogDescription>
            Create an independent financial workspace and pick a starting
            template.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="create-name">Workspace Name</Label>
            <Input
              id="create-name"
              placeholder="e.g. Side Hustle"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-template">Template</Label>
            <Select
              value={templateName}
              onValueChange={(val) =>
                setTemplateName(
                  val as 'PERSONAL' | 'FAMILY' | 'SMALL_BUSINESS'
                )
              }
            >
              <SelectTrigger id="create-template" className="w-full">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERSONAL">Personal Finance</SelectItem>
                <SelectItem value="FAMILY">Family Finance</SelectItem>
                <SelectItem value="SMALL_BUSINESS">Small Business</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-currency">Currency</Label>
            <Select
              value={currency}
              onValueChange={(val) => setCurrency(val as 'USD' | 'IDR')}
            >
              <SelectTrigger id="create-currency" className="w-full">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Currency cannot be changed after the workspace is created.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
  );
}
