"use client";

import { useCallback, useState } from "react";
import { ApiClientError } from "@/lib/api/client";

interface AsyncFormActionResult {
  isPending: boolean;
  error: string | null;
  clearError: () => void;
  run: (action: () => Promise<void>, fallbackMessage: string) => Promise<string | null>;
}

export function useAsyncFormAction(): AsyncFormActionResult {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);
  const run = useCallback(
    async (
      action: () => Promise<void>,
      fallbackMessage: string,
    ): Promise<string | null> => {
      setIsPending(true);
      setError(null);

      try {
        await action();
        return null;
      } catch (caught) {
        const message =
          caught instanceof ApiClientError ? caught.message : fallbackMessage;
        setError(message);
        return message;
      } finally {
        setIsPending(false);
      }
    },
    [],
  );

  return { isPending, error, clearError, run };
}
