"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { WorkspaceSummary, PendingInvitation } from "@/features/workspaces/types";
import { ApiClientError, apiFetch } from "@/lib/api/client";

interface WorkspaceContextType {
  workspaces: WorkspaceSummary[];
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string) => void;
  isLoading: boolean;
  refreshWorkspaces: () => Promise<void>;
  invitations: PendingInvitation[];
  refreshInvitations: () => Promise<void>;
  acceptInvitation: (invitationId: string) => Promise<void>;
  rejectInvitation: (invitationId: string) => Promise<void>;
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
      const data = await apiFetch<{ workspaces: WorkspaceSummary[] }>(
        WORKSPACES_ENDPOINT,
        { headers: { "Cache-Control": "no-cache" } },
      );
      return data.workspaces || [];
    } catch (error) {
      // Auth and validation failures are deterministic; only retry network
      // or service-unavailable failures.
      if (
        error instanceof ApiClientError &&
        error.code !== "SERVICE_UNAVAILABLE"
      ) {
        return [];
      }
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
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);

  const fetchInvitations = useCallback(async () => {
    try {
      const { invitations: list } = await apiFetch<{
        invitations: PendingInvitation[];
      }>("/api/v1/invitations");
      setInvitations(list || []);
    } catch {
      // Silently ignore — invitations are non-critical
    }
  }, []);

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

  /**
   * Core fetch+apply — no loading-state side effects so it can be called
   * from both the mount effect (which manages loading itself) and
   * `refreshWorkspaces`.
   */
  const fetchAndApply = useCallback(async () => {
    const list = await fetchWorkspaces();
    applyWorkspaces(list);
  }, []);

  // Mount fetch + invitation polling
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        if (!cancelled) {
          await fetchAndApply();
          await fetchInvitations();
        }
      } catch {
        if (!cancelled) console.error("Failed to fetch workspaces");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    const pollInterval = Number(
      process.env.NEXT_PUBLIC_INVITATION_POLL_INTERVAL_MS,
    ) || 30000;
    const interval = setInterval(() => {
      if (!cancelled) {
        void fetchInvitations();
      }
    }, pollInterval);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchAndApply, fetchInvitations]);

  const refreshWorkspaces = async () => {
    try {
      await fetchAndApply();
    } catch {
      console.error("Failed to fetch workspaces");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshInvitations = async () => {
    await fetchInvitations();
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    await apiFetch(`/api/v1/invitations/${invitationId}/accept`, {
      method: "POST",
    });
    await fetchInvitations();
    await fetchAndApply();
  };

  const handleRejectInvitation = async (invitationId: string) => {
    await apiFetch(`/api/v1/invitations/${invitationId}/reject`, {
      method: "POST",
    });
    await fetchInvitations();
  };

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
        invitations,
        refreshInvitations,
        acceptInvitation: handleAcceptInvitation,
        rejectInvitation: handleRejectInvitation,
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
