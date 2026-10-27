/**
 * Typed domain errors for the account service layer.
 *
 * Follows the same pattern as workspace errors (§5 — discriminated results).
 * Only *expected* domain failures are typed here. Unexpected errors
 * fall through to the generic `INTERNAL_SERVER_ERROR` fallback.
 */
import {
  handleServiceErrors,
  serviceErrorFailure,
  type ServiceErrorMapping,
} from "@/lib/api/service-errors";
import type { NextResponse } from "next/server";
import type { FailureEnvelope } from "@/lib/api/envelope";

/** Stable machine-readable codes thrown by the account services. */
export type AccountServiceErrorCode =
  | "FORBIDDEN"
  | "ACCOUNT_NOT_FOUND"
  | "NAME_TAKEN";

/**
 * Domain error thrown by `src/features/accounts/services.ts`. The `code`
 * field is the stable contract — never compare against `message`.
 */
export class AccountServiceError extends Error {
  readonly code: AccountServiceErrorCode;

  constructor(code: AccountServiceErrorCode, message?: string) {
    super(message ?? code);
    this.name = "AccountServiceError";
    this.code = code;
  }
}

/** Target failure envelope for a given service error code. */
export type AccountErrorMapping = ServiceErrorMapping;

/**
 * Map a thrown error to a ready-to-return failure envelope.
 *
 * Returns `null` when `err` is not an {@link AccountServiceError} — the
 * caller then falls through to its generic 500 fallback.
 */
export function accountErrorFailure(
  err: unknown,
  messages: Partial<Record<AccountServiceErrorCode, AccountErrorMapping>>,
): NextResponse<FailureEnvelope> | null {
  return serviceErrorFailure(
    err,
    (error): error is AccountServiceError =>
      error instanceof AccountServiceError,
    messages,
  );
}

/**
 * Route-handler wrapper that catches {@link AccountServiceError} instances
 * and maps them to failure envelopes. Unexpected errors fall through to
 * the `fallbackMessage` envelope.
 */
export function handleAccountErrors<Args extends unknown[]>(
  messages: Partial<Record<AccountServiceErrorCode, AccountErrorMapping>>,
  fallbackMessage: string,
  handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return handleServiceErrors(
    (error): error is AccountServiceError =>
      error instanceof AccountServiceError,
    messages,
    fallbackMessage,
    handler,
  );
}
