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
  /**
   * Query string appended to the path (without a leading `?`). Include it when
   * `getPath` alone cannot express the request, such as a collection scoped to
   * a date window: changing it re-runs the fetch.
   */
  query?: string;
  /** Extracts the item list from the response envelope data. */
  select: (data: R) => T[];
  /** Fallback message when the error is not an ApiClientError. */
  fallbackMessage: string;
}

export interface UseWorkspaceCollectionResult<T, R> {
  data: T[];
  /** Last raw payload (the envelope's `data`), for fields `select` drops. */
  response: R | null;
  isLoading: boolean;
  error: string | null;
  /** Manually re-fetch the collection. */
  refetch: () => Promise<void>;
}

export function useWorkspaceCollection<T, R = unknown>({
  workspaceId,
  getPath,
  query,
  select,
  fallbackMessage,
}: UseWorkspaceCollectionOptions<T, R>): UseWorkspaceCollectionResult<T, R> {
  const [data, setData] = useState<T[]>([]);
  const [response, setResponse] = useState<R | null>(null);
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

  const fetchData = useCallback(async (): Promise<{
    items: T[];
    payload: R | null;
  }> => {
    if (!workspaceId) return { items: [], payload: null };
    const path = getPathRef.current(workspaceId);
    const payload = await apiFetch<R>(query ? `${path}?${query}` : path);
    return { items: selectRef.current(payload), payload };
  }, [workspaceId, query]);

  useEffect(() => {
    let cancelled = false;
    if (!workspaceId) return;

    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchData();
        if (!cancelled) {
          setData(result.items);
          setResponse(result.payload);
        }
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
      const result = await fetchData();
      setData(result.items);
      setResponse(result.payload);
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : fallbackRef.current,
      );
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, fetchData]);

  return { data, response, isLoading, error, refetch };
}