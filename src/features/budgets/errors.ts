/**
 * Typed domain errors for the budget service layer (§5).
 *
 * Only *expected* domain failures are typed here. Unexpected errors fall
 * through to the generic `INTERNAL_SERVER_ERROR` fallback.
 */

import type { NextResponse } from "next/server";
import {
  failure,
  type ApiErrorCode,
  type FailureEnvelope,
} from "@/lib/api/envelope";

/** Stable machine-readable codes thrown by the budget services. */
export type BudgetServiceErrorCode =
  | "FORBIDDEN"
  | "BUDGET_NOT_FOUND"
  | "INVALID_SUBCATEGORY"
  | "OVERLAPPING_BUDGET"
  | "INVALID_PERIOD";

/**
 * Domain error thrown by `src/features/budgets/services.ts`. The `code` field
 * is the stable contract — never compare against `message`.
 */
export class BudgetServiceError extends Error {
  readonly code: BudgetServiceErrorCode;

  constructor(code: BudgetServiceErrorCode, message?: string) {
    super(message ?? code);
    this.name = "BudgetServiceError";
    this.code = code;
  }
}

/** Target failure envelope for a given service error code. */
export interface BudgetErrorMapping {
  code: ApiErrorCode;
  message: string;
}

/**
 * Map a thrown error to a ready-to-return failure envelope.
 * Returns `null` when `err` is not a {@link BudgetServiceError}.
 */
export function budgetErrorFailure(
  err: unknown,
  messages: Partial<Record<BudgetServiceErrorCode, BudgetErrorMapping>>,
): NextResponse<FailureEnvelope> | null {
  if (!(err instanceof BudgetServiceError)) {
    return null;
  }
  const mapped = messages[err.code];
  return mapped ? failure(mapped.code, mapped.message) : null;
}

/**
 * Route-handler wrapper that catches {@link BudgetServiceError} instances and
 * maps them to failure envelopes. Unexpected errors fall through to the
 * `fallbackMessage` envelope.
 */
export function handleBudgetErrors<Args extends unknown[]>(
  messages: Partial<Record<BudgetServiceErrorCode, BudgetErrorMapping>>,
  fallbackMessage: string,
  handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      const mapped = budgetErrorFailure(err, messages);
      if (mapped) return mapped;
      return failure("INTERNAL_SERVER_ERROR", fallbackMessage);
    }
  };
}
