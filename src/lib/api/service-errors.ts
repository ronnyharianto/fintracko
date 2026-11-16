import type { NextResponse } from "next/server";
import {
  failure,
  type ApiErrorCode,
  type FailureEnvelope,
} from "@/lib/api/envelope";

export interface ServiceErrorMapping {
  code: ApiErrorCode;
  message: string;
}

export function serviceErrorFailure<
  Code extends string,
  ErrorType extends { code: Code },
>(
  error: unknown,
  isServiceError: (error: unknown) => error is ErrorType,
  messages: Partial<Record<Code, ServiceErrorMapping>>,
): NextResponse<FailureEnvelope> | null {
  if (!isServiceError(error)) {
    return null;
  }

  const mapped = messages[error.code];
  return mapped ? failure(mapped.code, mapped.message) : null;
}

/**
 * True when Prisma rejected a write because a unique constraint already held
 * the value. Detected by duck typing so this module stays free of a runtime
 * dependency on the generated client.
 */
export function isUniqueConstraintError(
  error: unknown,
): error is { code: "P2002"; meta?: unknown } {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/**
 * Columns covered by the violated unique constraint, or an empty list when the
 * runtime shape is unknown.
 *
 * Prisma's classic engine reports them as `meta.target`; the Prisma 7 driver
 * adapter reports the Postgres constraint as `meta.constraint.fields`. Both are
 * accepted so the mapping never depends on engine internals.
 */
export function uniqueConstraintFields(error: unknown): readonly string[] {
  if (!isUniqueConstraintError(error)) return [];

  const meta = error.meta;
  if (typeof meta !== "object" || meta === null) return [];

  const { target, constraint } = meta as {
    target?: unknown;
    constraint?: unknown;
  };

  if (Array.isArray(target)) {
    return target.filter((field): field is string => typeof field === "string");
  }
  if (typeof target === "string") {
    return [target];
  }

  if (typeof constraint === "object" && constraint !== null) {
    const fields = (constraint as { fields?: unknown }).fields;
    if (Array.isArray(fields)) {
      return fields.filter((field): field is string => typeof field === "string");
    }
  }

  return [];
}

/**
 * Translate a unique-constraint race into the caller's domain error, so the
 * request that loses the race returns the same conflict as the pre-check.
 *
 * Only P2002 is translated: unexpected failures are rethrown untouched and
 * still reach the route's 500 fallback.
 */
export function throwIfUniqueConstraint(
  error: unknown,
  onConflict: (fields: readonly string[]) => Error,
): void {
  if (isUniqueConstraintError(error)) {
    throw onConflict(uniqueConstraintFields(error));
  }
}

export function handleServiceErrors<
  Code extends string,
  ErrorType extends { code: Code },
  Args extends unknown[],
>(
  isServiceError: (error: unknown) => error is ErrorType,
  messages: Partial<Record<Code, ServiceErrorMapping>>,
  fallbackMessage: string,
  handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      const mapped = serviceErrorFailure(error, isServiceError, messages);
      return mapped ?? failure("INTERNAL_SERVER_ERROR", fallbackMessage);
    }
  };
}
