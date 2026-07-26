"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface Workspace {
  id: string;
  name: string;
  role: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string) => void;
  isLoading: boolean;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined
);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch('/api/v1/workspaces');
      if (res.ok) {
        const json = await res.json();
        const list = json.data?.workspaces || [];
        setWorkspaces(list);
        if (list.length > 0) {
          const stored = localStorage.getItem('fintracko_active_workspace_id');
          if (stored && list.some((w: Workspace) => w.id === stored)) {
            setActiveWorkspaceIdState(stored);
          } else {
            setActiveWorkspaceIdState(list[0].id);
            localStorage.setItem('fintracko_active_workspace_id', list[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch workspaces', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const setActiveWorkspaceId = (id: string) => {
    setActiveWorkspaceIdState(id);
    localStorage.setItem('fintracko_active_workspace_id', id);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspaceId,
        setActiveWorkspaceId,
        isLoading,
        refreshWorkspaces: fetchWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
