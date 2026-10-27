/**
 * Typed domain errors for the budget service layer (§5).
 *
 * Only *expected* domain failures are typed here. Unexpected errors fall
 * through to the generic `INTERNAL_SERVER_ERROR` fallback.
 */

import type { NextResponse } from "next/server";
import type { FailureEnvelope } from "@/lib/api/envelope";
import {
  handleServiceErrors,
  serviceErrorFailure,
  type ServiceErrorMapping,
} from "@/lib/api/service-errors";

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
export type BudgetErrorMapping = ServiceErrorMapping;

/**
 * Map a thrown error to a ready-to-return failure envelope.
 * Returns `null` when `err` is not a {@link BudgetServiceError}.
 */
export function budgetErrorFailure(
  err: unknown,
  messages: Partial<Record<BudgetServiceErrorCode, BudgetErrorMapping>>,
): NextResponse<FailureEnvelope> | null {
  return serviceErrorFailure(
    err,
    (error): error is BudgetServiceError =>
      error instanceof BudgetServiceError,
    messages,
  );
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
  return handleServiceErrors(
    (error): error is BudgetServiceError =>
      error instanceof BudgetServiceError,
    messages,
    fallbackMessage,
    handler,
  );
}
