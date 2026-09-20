/**
 * Typed domain errors for the analytics service layer (§5).
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

/** Stable machine-readable codes thrown by the analytics services. */
export type AnalyticsServiceErrorCode = "FORBIDDEN";

/**
 * Domain error thrown by `src/features/analytics/services.ts`. The `code` field
 * is the stable contract — never compare against `message`.
 */
export class AnalyticsServiceError extends Error {
  readonly code: AnalyticsServiceErrorCode;

  constructor(code: AnalyticsServiceErrorCode, message?: string) {
    super(message ?? code);
    this.name = "AnalyticsServiceError";
    this.code = code;
  }
}

/** Target failure envelope for a given service error code. */
export interface AnalyticsErrorMapping {
  code: ApiErrorCode;
  message: string;
}

/**
 * Map a thrown error to a ready-to-return failure envelope.
 * Returns `null` when `err` is not an {@link AnalyticsServiceError}.
 */
export function analyticsErrorFailure(
  err: unknown,
  messages: Partial<Record<AnalyticsServiceErrorCode, AnalyticsErrorMapping>>,
): NextResponse<FailureEnvelope> | null {
  if (!(err instanceof AnalyticsServiceError)) {
    return null;
  }
  const mapped = messages[err.code];
  return mapped ? failure(mapped.code, mapped.message) : null;
}

/**
 * Route-handler wrapper that catches {@link AnalyticsServiceError} instances
 * and maps them to failure envelopes. Unexpected errors fall through to the
 * `fallbackMessage` envelope.
 */
export function handleAnalyticsErrors<Args extends unknown[]>(
  messages: Partial<Record<AnalyticsServiceErrorCode, AnalyticsErrorMapping>>,
  fallbackMessage: string,
  handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      const mapped = analyticsErrorFailure(err, messages);
      if (mapped) return mapped;
      return failure("INTERNAL_SERVER_ERROR", fallbackMessage);
    }
  };
}
