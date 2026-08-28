/**
 * Shared toast helpers for async actions.
 *
 * Eliminates the repeated try/catch + toast.success/toast.error pattern
 * across client components. Import from '@/lib/toast' in any 'use client'
 * module.
 */
import { toast } from "sonner";

/**
 * Wraps an async action with automatic success/error toast notifications.
 *
 * @param action   - The async function to execute.
 * @param successMsg - Toast message on success.
 * @param errorMsg   - Toast message on failure (overridden by Error.message).
 */
export async function withToast(
  action: () => Promise<void>,
  successMsg: string,
  errorMsg: string,
): Promise<void> {
  try {
    await action();
    toast.success(successMsg);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : errorMsg);
  }
}
