/**
 * Typed domain errors for the transaction service layer (§5).
 *
 * Only *expected* domain failures are typed here. Unexpected errors
 * fall through to the generic `INTERNAL_SERVER_ERROR` fallback.
 */

import type { NextResponse } from "next/server";
import {
  failure,
  type ApiErrorCode,
  type FailureEnvelope,
} from "@/lib/api/envelope";

/** Stable machine-readable codes thrown by the transaction services. */
export type TransactionServiceErrorCode =
  | "FORBIDDEN"
  | "TRANSACTION_NOT_FOUND"
  | "INVALID_ACCOUNT"
  | "INVALID_CATEGORY"
  | "SOURCE_DESTINATION_SAME";

/**
 * Domain error thrown by `src/features/transactions/services.ts`. The `code`
 * field is the stable contract — never compare against `message`.
 */
export class TransactionServiceError extends Error {
  readonly code: TransactionServiceErrorCode;

  constructor(code: TransactionServiceErrorCode, message?: string) {
    super(message ?? code);
    this.name = "TransactionServiceError";
    this.code = code;
  }
}

/** Target failure envelope for a given service error code. */
export interface TransactionErrorMapping {
  code: ApiErrorCode;
  message: string;
}

/**
 * Map a thrown error to a ready-to-return failure envelope.
 * Returns `null` when `err` is not a {@link TransactionServiceError}.
 */
export function transactionErrorFailure(
  err: unknown,
  messages: Partial<Record<TransactionServiceErrorCode, TransactionErrorMapping>>,
): NextResponse<FailureEnvelope> | null {
  if (!(err instanceof TransactionServiceError)) {
    return null;
  }
  const mapped = messages[err.code];
  return mapped ? failure(mapped.code, mapped.message) : null;
}

/**
 * Route-handler wrapper that catches {@link TransactionServiceError} instances
 * and maps them to failure envelopes. Unexpected errors fall through to
 * the `fallbackMessage` envelope.
 */
export function handleTransactionErrors<Args extends unknown[]>(
  messages: Partial<Record<TransactionServiceErrorCode, TransactionErrorMapping>>,
  fallbackMessage: string,
  handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      const mapped = transactionErrorFailure(err, messages);
      if (mapped) return mapped;
      return failure("INTERNAL_SERVER_ERROR", fallbackMessage);
    }
  };
}
