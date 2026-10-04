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
  /**
   * Opt-in exhaustive fetch. When set, the hook requests successive pages
   * (appending `page` and `limit` to `query`) until it has collected `getTotal`
   * rows, so a bounded window with more rows than a single page cannot silently
   * truncate. The returned `response` stays the first page's payload, which
   * carries the collection aggregates (`total`, `scopeTotal`).
   */
  fetchAll?: UseWorkspaceCollectionFetchAll<R>;
  /** Extracts the item list from the response envelope data. */
  select: (data: R) => T[];
  /** Fallback message when the error is not an ApiClientError. */
  fallbackMessage: string;
}

/** Configuration for {@link UseWorkspaceCollectionOptions.fetchAll}. */
export interface UseWorkspaceCollectionFetchAll<R> {
  /** Total row count as reported by the payload. */
  getTotal: (data: R) => number;
  /** Rows requested per page. Must match the server's page size. Defaults to 100. */
  pageSize?: number;
}

export interface UseWorkspaceCollectionResult<T, R> {
  data: T[];
  /** Last raw payload (the envelope's `data`), for fields `select` drops. */
  response: R | null;
  isLoading: boolean;
  error: string | null;
  /**
   * Machine-readable code of the last `ApiClientError` (e.g. `NOT_FOUND`),
   * for callers that branch on the failure kind rather than the message.
   */
  errorCode: string | null;
  /** Manually re-fetch the collection. */
  refetch: () => Promise<void>;
  /**
   * True when a workspace-scoped fetch is in flight for a query change while
   * the previous payload is still rendered. Distinct from `isLoading`, which
   * also covers workspace switches and first loads, where there is no previous
   * payload to keep on screen.
   */
  isRefreshing: boolean;
}

export function useWorkspaceCollection<T, R = unknown>({
  workspaceId,
  getPath,
  query,
  fetchAll,
  select,
  fallbackMessage,
}: UseWorkspaceCollectionOptions<T, R>): UseWorkspaceCollectionResult<T, R> {
  const [data, setData] = useState<T[]>([]);
  const [response, setResponse] = useState<R | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Callers pass inline callbacks; sync them into refs so the fetch effect
  // only re-runs when the workspace actually changes.
  const getPathRef = useRef(getPath);
  const selectRef = useRef(select);
  const fallbackRef = useRef(fallbackMessage);
  const fetchAllRef = useRef(fetchAll);

  useEffect(() => {
    getPathRef.current = getPath;
    selectRef.current = select;
    fallbackRef.current = fallbackMessage;
    fetchAllRef.current = fetchAll;
  });

  const applyError = useCallback((err: unknown) => {
    setError(
      err instanceof ApiClientError ? err.message : fallbackRef.current,
    );
    setErrorCode(err instanceof ApiClientError ? err.code : null);
  }, []);

  const fetchData = useCallback(async (): Promise<{
    items: T[];
    payload: R | null;
  }> => {
    if (!workspaceId) return { items: [], payload: null };
    const path = getPathRef.current(workspaceId);
    const fetchAllOption = fetchAllRef.current;

    if (!fetchAllOption) {
      const payload = await apiFetch<R>(query ? `${path}?${query}` : path);
      return { items: selectRef.current(payload), payload };
    }

    const pageSize = fetchAllOption.pageSize ?? 100;
    // Hard ceiling so a malformed total can never spin the page loop forever.
    const MAX_PAGES = 50;
    const items: T[] = [];
    let payload: R | null = null;

    for (let page = 1; page <= MAX_PAGES; page++) {
      const params = new URLSearchParams(query ?? "");
      params.set("page", String(page));
      params.set("limit", String(pageSize));
      const pagePayload = await apiFetch<R>(`${path}?${params.toString()}`);
      if (payload === null) payload = pagePayload;

      const pageItems = selectRef.current(pagePayload);
      items.push(...pageItems);

      // Stop once every reported row is collected, or when the server returns
      // an empty page — the collection is exhausted either way.
      if (
        pageItems.length === 0 ||
        items.length >= fetchAllOption.getTotal(pagePayload)
      ) {
        break;
      }
    }

    return { items, payload };
  }, [workspaceId, query]);

  // Workspace switches must drop stale data immediately — the workspace is
  // not in the fetched payload, so the only honest state for a previous
  // workspace's rows is the loading skeleton. Query refetches keep the
  // previous payload instead, so callers can render stale-but-labeled data.
  // React's documented "adjust state during render" pattern: resetting here
  // (rather than in an effect) re-renders synchronously before commit, so no
  // stale frame is ever painted.
  const [lastWorkspaceId, setLastWorkspaceId] = useState(workspaceId);
  if (lastWorkspaceId !== workspaceId) {
    setLastWorkspaceId(workspaceId);
    if (response !== null) {
      setIsLoading(true);
      setData([]);
      setResponse(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    if (!workspaceId) return;

    void (async () => {
      setIsLoading(true);
      setError(null);
      setErrorCode(null);
      try {
        const result = await fetchData();
        if (!cancelled) {
          setData(result.items);
          setResponse(result.payload);
        }
      } catch (err) {
        if (!cancelled) applyError(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, fetchData, applyError]);

  const refetch = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      const result = await fetchData();
      setData(result.items);
      setResponse(result.payload);
    } catch (err) {
      applyError(err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, fetchData, applyError]);

  return {
    data,
    response,
    isLoading,
    // Query refetches keep the previous payload on screen, so `isLoading`
    // alone cannot tell a caller when a background refresh is in flight.
    isRefreshing: isLoading && response !== null,
    error,
    errorCode,
    refetch,
  };
}