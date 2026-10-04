/**
 * Typed domain errors for the category service layer (§5).
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

/** Stable machine-readable codes thrown by the category services. */
export type CategoryServiceErrorCode =
  | "FORBIDDEN"
  | "CATEGORY_NOT_FOUND"
  | "SUBCATEGORY_NOT_FOUND"
  | "NAME_TAKEN"
  | "CATEGORY_ARCHIVED";

/**
 * Domain error thrown by `src/features/categories/services.ts`. The `code`
 * field is the stable contract — never compare against `message`.
 */
export class CategoryServiceError extends Error {
  readonly code: CategoryServiceErrorCode;

  constructor(code: CategoryServiceErrorCode, message?: string) {
    super(message ?? code);
    this.name = "CategoryServiceError";
    this.code = code;
  }
}

/** Target failure envelope for a given service error code. */
export interface CategoryErrorMapping {
  code: ApiErrorCode;
  message: string;
}

/**
 * Map a thrown error to a ready-to-return failure envelope.
 * Returns `null` when `err` is not a {@link CategoryServiceError}.
 */
export function categoryErrorFailure(
  err: unknown,
  messages: Partial<Record<CategoryServiceErrorCode, CategoryErrorMapping>>,
): NextResponse<FailureEnvelope> | null {
  if (!(err instanceof CategoryServiceError)) {
    return null;
  }
  const mapped = messages[err.code];
  return mapped ? failure(mapped.code, mapped.message) : null;
}

/**
 * Route-handler wrapper that catches {@link CategoryServiceError} instances
 * and maps them to failure envelopes. Unexpected errors fall through to
 * the `fallbackMessage` envelope.
 */
export function handleCategoryErrors<Args extends unknown[]>(
  messages: Partial<Record<CategoryServiceErrorCode, CategoryErrorMapping>>,
  fallbackMessage: string,
  handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      const mapped = categoryErrorFailure(err, messages);
      if (mapped) return mapped;
      return failure("INTERNAL_SERVER_ERROR", fallbackMessage);
    }
  };
}
