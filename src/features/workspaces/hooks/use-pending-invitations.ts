"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api/client";
import type { PendingInvitation } from "@/features/workspaces/types";

export interface UsePendingInvitationsResult {
  invitations: PendingInvitation[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  acceptInvitation: (invitationId: string) => Promise<void>;
  rejectInvitation: (invitationId: string) => Promise<void>;
}

export function usePendingInvitations(): UsePendingInvitationsResult {
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

    return () => {
      cancelled = true;
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
    },
    [refetch],
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
