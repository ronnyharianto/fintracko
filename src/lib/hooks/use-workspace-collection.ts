/**
 * Hook for fetching a workspace-scoped collection from the Fintracko API.
 *
 * Encapsulates the mount-fetch (with cancellation), manual refetch, loading,
 * and error states that pages previously duplicated inline (see the old
 * transactions and accounts pages). Works for any resource under
 * `/api/v1/workspaces/:id/...`; the caller provides the path builder and a
 * selector that extracts the item list from the response envelope.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiClientError } from "@/lib/api/client";

export interface UseWorkspaceCollectionOptions<T, R> {
  /** Authenticated workspace id. When falsy the hook stays idle. */
  workspaceId: string | null | undefined;
  /** Builds the API path for the given workspace id. */
  getPath: (workspaceId: string) => string;
  /** Extracts the item list from the response envelope data. */
  select: (data: R) => T[];
  /** Fallback message when the error is not an ApiClientError. */
  fallbackMessage: string;
}

export interface UseWorkspaceCollectionResult<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  /** Manually re-fetch the collection. */
  refetch: () => Promise<void>;
}

export function useWorkspaceCollection<T, R = unknown>({
  workspaceId,
  getPath,
  select,
  fallbackMessage,
}: UseWorkspaceCollectionOptions<T, R>): UseWorkspaceCollectionResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Callers pass inline callbacks; sync them into refs so the fetch effect
  // only re-runs when the workspace actually changes.
  const getPathRef = useRef(getPath);
  const selectRef = useRef(select);
  const fallbackRef = useRef(fallbackMessage);

  useEffect(() => {
    getPathRef.current = getPath;
    selectRef.current = select;
    fallbackRef.current = fallbackMessage;
  });

  const fetchData = useCallback(async (): Promise<T[]> => {
    if (!workspaceId) return [];
    const response = await apiFetch<R>(getPathRef.current(workspaceId));
    return selectRef.current(response);
  }, [workspaceId]);

  useEffect(() => {
    let cancelled = false;
    if (!workspaceId) return;

    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const list = await fetchData();
        if (!cancelled) setData(list);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError ? err.message : fallbackRef.current,
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, fetchData]);

  const refetch = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    setError(null);
    try {
      const list = await fetchData();
      setData(list);
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : fallbackRef.current,
      );
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, fetchData]);

  return { data, isLoading, error, refetch };
}