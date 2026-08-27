/**
 * Hook for fetching and managing owned workspaces on the settings page.
 *
 * Encapsulates the mount-fetch, manual refetch, loading, and error states
 * that were previously duplicated between a component-scope `fetchOwnedWorkspaces`
 * function, a `loadOwnedWorkspaces` wrapper, and a `useEffect` mount block
 * in `settings/workspace/page.tsx`.
 *
 * The raw fetch function (`fetchOwnedWorkspaces`) is also exposed for callers
 * that only need the data without the side-effects (e.g. the invite dialog's
 * `onInvited` callback).
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api/client";
import type { OwnedWorkspace } from "@/features/workspaces/types";

export interface UseOwnedWorkspacesResult {
  workspaces: OwnedWorkspace[];
  isLoading: boolean;
  error: string | null;
  /** Manually re-fetch the owned workspaces list. */
  refetch: () => Promise<void>;
  /** Raw fetch — returns the list without touching component state. */
  fetchOwnedWorkspaces: () => Promise<OwnedWorkspace[]>;
}

export function useOwnedWorkspaces(): UseOwnedWorkspacesResult {
  const [workspaces, setWorkspaces] = useState<OwnedWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOwnedWorkspaces = useCallback(async (): Promise<
    OwnedWorkspace[]
  > => {
    const { workspaces: list } = await apiFetch<{
      workspaces: OwnedWorkspace[];
    }>("/api/v1/workspaces?owned=true");
    return list || [];
  }, []);

  const load = useCallback(async () => {
    try {
      const list = await fetchOwnedWorkspaces();
      setWorkspaces(list);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while fetching workspaces.",
      );
    }
  }, [fetchOwnedWorkspaces]);

  useEffect(() => {
    let cancelled = false;

    void fetchOwnedWorkspaces()
      .then((list) => {
        if (!cancelled) {
          setWorkspaces(list);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "An error occurred while fetching workspaces.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchOwnedWorkspaces]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await load();
    setIsLoading(false);
  }, [load]);

  return { workspaces, isLoading, error, refetch, fetchOwnedWorkspaces };
}
