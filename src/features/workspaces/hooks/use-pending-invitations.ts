"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api/client";
import type { PendingInvitation } from "@/features/workspaces/types";

export interface UsePendingInvitationsOptions {
  /** Called after an invitation is accepted, so the caller can refresh related data. */
  onAccepted?: () => void;
}

export interface UsePendingInvitationsResult {
  invitations: PendingInvitation[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  acceptInvitation: (invitationId: string) => Promise<void>;
  rejectInvitation: (invitationId: string) => Promise<void>;
}

export function usePendingInvitations(
  options?: UsePendingInvitationsOptions,
): UsePendingInvitationsResult {
  const onAccepted = options?.onAccepted;
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    const { invitations: list } = await apiFetch<{
      invitations: PendingInvitation[];
    }>("/api/v1/invitations");
    return list || [];
  }, []);

  const load = useCallback(async () => {
    try {
      const list = await fetchInvitations();
      setInvitations(list);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while fetching invitations.",
      );
    }
  }, [fetchInvitations]);

  useEffect(() => {
    let cancelled = false;

    void fetchInvitations()
      .then((list) => {
        if (!cancelled) {
          setInvitations(list);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "An error occurred while fetching invitations.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    const pollInterval = Number(
      process.env.NEXT_PUBLIC_INVITATION_POLL_INTERVAL_MS,
    ) || 30000;
    const interval = setInterval(() => {
      void fetchInvitations()
        .then((list) => {
          if (!cancelled) {
            setInvitations(list);
            setError(null);
          }
        })
        .catch(() => {
          // Silently ignore poll errors to avoid noisy UI
        });
    }, pollInterval);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchInvitations]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await load();
    setIsLoading(false);
  }, [load]);

  const handleAccept = useCallback(
    async (invitationId: string) => {
      await apiFetch(`/api/v1/invitations/${invitationId}/accept`, {
        method: "POST",
      });
      await refetch();
      onAccepted?.();
    },
    [refetch, onAccepted],
  );

  const handleReject = useCallback(
    async (invitationId: string) => {
      await apiFetch(`/api/v1/invitations/${invitationId}/reject`, {
        method: "POST",
      });
      await refetch();
    },
    [refetch],
  );

  return {
    invitations,
    isLoading,
    error,
    refetch,
    acceptInvitation: handleAccept,
    rejectInvitation: handleReject,
  };
}
