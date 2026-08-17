"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { WorkspaceSummary } from "@/features/workspaces/types";

interface WorkspaceContextType {
  workspaces: WorkspaceSummary[];
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string) => void;
  isLoading: boolean;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined,
);

const WORKSPACES_ENDPOINT = "/api/v1/workspaces";
const ACTIVE_WORKSPACE_KEY = "fintracko_active_workspace_id";

// Dev-server restarts (Next.js hot reload) drop in-flight requests, and the
// browser may revalidate a stale cached response against the dead connection —
// both surface as "TypeError: Failed to fetch". Bypass the HTTP cache (the
// workspace list is dynamic) and retry transient network failures so the
// workspace switcher recovers automatically instead of being stuck on
// "No Workspace" until a manual refresh.
const MAX_FETCH_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;

async function fetchWorkspaces(): Promise<WorkspaceSummary[]> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(WORKSPACES_ENDPOINT, { cache: "no-store" });

      if (res.ok) {
        const json = await res.json();
        return json.data?.workspaces || [];
      }

      // Non-2xx responses (401/403/422/...) are deterministic — retrying
      // won't change the outcome, so return an empty list immediately.
      return [];
    } catch (error) {
      // Network-level failure: e.g. the dev server dropped the in-flight
      // request during a restart/recompile.
      lastError = error;
    }

    if (attempt < MAX_FETCH_ATTEMPTS) {
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_BASE_DELAY_MS * attempt),
      );
    }
  }

  throw lastError;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyWorkspaces = (list: WorkspaceSummary[]) => {
    setWorkspaces(list);

    if (list.length > 0) {
      const stored = localStorage.getItem(ACTIVE_WORKSPACE_KEY);

      if (stored && list.some((workspace) => workspace.id === stored)) {
        setActiveWorkspaceIdState(stored);
      } else {
        setActiveWorkspaceIdState(list[0].id);

        localStorage.setItem(ACTIVE_WORKSPACE_KEY, list[0].id);
      }
    } else {
      setActiveWorkspaceIdState(null);
      localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
    }
  };

  const refreshWorkspaces = async () => {
    try {
      const list = await fetchWorkspaces();
      applyWorkspaces(list);
    } catch (error) {
      console.error("Failed to fetch workspaces", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadWorkspaces = async () => {
      try {
        const list = await fetchWorkspaces();

        if (!cancelled) {
          applyWorkspaces(list);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch workspaces", error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadWorkspaces();

    return () => {
      cancelled = true;
    };
  }, []);

  const setActiveWorkspaceId = (id: string) => {
    setActiveWorkspaceIdState(id);
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspaceId,
        setActiveWorkspaceId,
        isLoading,
        refreshWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }

  return context;
}
