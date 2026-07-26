'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useWorkspace } from '@/components/shared/workspace-context';
import { ChevronDown, Plus, Briefcase, Building2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface Workspace {
  id: string;
  name: string;
  role: string;
}

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId, refreshWorkspaces, isLoading } =
    useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLButtonElement>(null);

  const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleWorkspaceChange = async (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    await refreshWorkspaces();
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
          <Button
            variant="ghost"
            className="h-9 px-3 gap-2 text-sm"
            ref={dropdownRef}
          >
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
            onClick={() => setIsOpen(false)}
          >
            No workspaces found. Create one from settings.
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
          ref={dropdownRef}
        >
          <Briefcase className="h-4 w-4 text-primary" />
          <span className="truncate max-w-45">
            {activeWorkspace?.name || 'Select Workspace'}
          </span>
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 min-w-55">
        <div className="flex items-center justify-between px-2 py-1">
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
            Your Workspaces
          </DropdownMenuLabel>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            asChild
            onClick={() => setIsOpen(false)}
          >
            <Link href="/settings/workspace?tab=workspaces">
              <Plus className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
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