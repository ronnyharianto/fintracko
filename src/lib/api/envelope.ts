/**
 * Standardized REST API response envelopes.
 *
 * Per docs/architecture/API_SPECS.md §1 "Global Response Standards", every
 * Route Handler under `src/app/api/...` MUST return a unified JSON envelope so
 * consumer code (the Next.js client and the future MVP 2 mobile app) can rely
 * on a single de-serialization contract.
 *
 * Success envelope:
 *   {
 *     "success": true,
 *     "data": {...},
 *     "timestamp": "2026-07-11T11:56:55Z"
 *   }
 *
 * Failure envelope:
 *   {
 *     "success": false,
 *     "error": {
 *       "code": "BAD_REQUEST",
 *       "message": "Detailed action-specific error message.",
 *       "validationErrors": []
 *     },
 *     "timestamp": "2026-07-11T11:56:55Z"
 *   }
 *
 * All helpers here:
 *   - Emit a UTC ISO-8601 timestamp (trailing `Z`) so the contract is
 *     locale-independent per ARCHITECTURE.md §4 i18n (the client formats dates).
 *   - Return a `NextResponse` with the canonical `application/json` content
 *     type, never leaking unhandled exceptions to the client
 *     (AGENT_RULES.md §4 "Error Handling").
 */
import { NextResponse } from "next/server";
import type { ZodIssue } from "zod";

/**
 * Canonical error codes used across the Fintracko REST API.
 *
 * Kept as a string-literal union (rather than a runtime enum) so the value
 * is statically inlined into the JSON contract without a runtime lookup. New
 * codes may be appended as later phases widen the contract; never rename or
 * reorder existing entries to preserve consumer compatibility.
 */
export type ApiErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "ONBOARDING_REQUIRED"
  | "UNAUTHORIZED_WORKSPACE_ACCESS"
  | "INTERNAL_SERVER_ERROR";

/** Shape of the `error` block inside a failure envelope. */
export interface ApiErrorBody {
  /** Stable machine-readable code, see {@link ApiErrorCode}. */
  code: ApiErrorCode;
  /** Human-readable explanation; safe to surface verbatim to the client. */
  message: string;
  /**
   * Optional list of field-level validation problems. Populated when the
   * failure originates from a Zod schema rejection so the client can map
   * each issue back to its offending input field. Omitted entirely when
   * not applicable (kept absent, never `null`, to keep the contract clean).
   */
  validationErrors?: ReadonlyArray<FieldValidationError>;
}

/**
 * Single field-level validation failure derived from a Zod `ZodIssue`.
 * Trimmed down to the three properties the client actually needs — the
 * full Zod issue object carries internal metadata that would leak
 * implementation details into the wire contract.
 */
export interface FieldValidationError {
  /** Dotted path to the offending field, e.g. `"workspaceId"`, `"amount"`. */
  path: string;
  /** Human-readable explanation of why the value was rejected. */
  message: string;
}

/**
 * Failure envelope payload (without the outer `success` / `timestamp`
 * wrapper). Exposed for unit-level assertions on the constructed body.
 */
export interface FailureEnvelope {
  success: false;
  error: ApiErrorBody;
  timestamp: string;
}

/** Success envelope payload. */
export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  timestamp: string;
}

/** Discriminated union covering both envelope variants for type narrowing. */
export type ApiEnvelope<T = unknown> = SuccessEnvelope<T> | FailureEnvelope;

/**
 * Map of {@link ApiErrorCode} to the canonical HTTP status code that
 * accompanies it. Centralizing this mapping guarantees that every Route
 * Handler emitting a given error code also emits the matching status — a
 * common source of subtle bugs when the mapping is duplicated across
 * handlers. Aligned with AGENT_RULES.md §4 ("standard HTTP status codes").
 */
export const HTTP_STATUS_BY_CODE: Readonly<Record<ApiErrorCode, number>> =
  Object.freeze({
    BAD_REQUEST: 400,
    VALIDATION_ERROR: 422,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    ONBOARDING_REQUIRED: 403,
    UNAUTHORIZED_WORKSPACE_ACCESS: 403,
    INTERNAL_SERVER_ERROR: 500,
  });

/**
 * Returns the current instant as a UTC ISO-8601 string with a trailing `Z`.
 *
 * Extracted as a seam so unit tests can assert on the produced timestamp
 * format without depending on wall-clock time — the seam is exercised by
 * the co-located tests via spy injection.
 */
export function nowTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Converts a Zod issue's `path` array into the dotted-string form expected
 * by {@link FieldValidationError.path}. An empty path (issue at the root)
 * collapses to `"_"` to give the client a stable anchor key — Zod uses an
 * empty array for "issue applies to the whole value".
 */
export function pathToString(path: ZodIssue["path"]): string {
  if (path.length === 0) {
    return "_";
  }
  return path
    .map((segment) =>
      typeof segment === "number" ? `[${segment}]` : String(segment),
    )
    .join(".");
}

/**
 * Build the success envelope object (no HTTP wrapping). Useful when a
 * handler needs the raw body, e.g. to merge into a larger response. Most
 * callers should prefer {@link success} which returns a ready `NextResponse`.
 */
export function buildSuccessEnvelope<T>(data: T): SuccessEnvelope<T> {
  return {
    success: true,
    data,
    timestamp: nowTimestamp(),
  };
}

/**
 * Build the failure envelope object (no HTTP wrapping). Useful for
 * unit-level assertions on the constructed body shape.
 */
export function buildFailureEnvelope(
  code: ApiErrorCode,
  message: string,
  validationErrors?: ReadonlyArray<FieldValidationError>,
): FailureEnvelope {
  const error: ApiErrorBody = { code, message };
  if (validationErrors && validationErrors.length > 0) {
    error.validationErrors = validationErrors;
  }
  return {
    success: false,
    error,
    timestamp: nowTimestamp(),
  };
}

/**
 * Returns a `NextResponse` carrying the success envelope with HTTP 200.
 *
 * `200 OK` is the canonical success status for the envelope contract —
 * resource-creation handlers that semantically return `201 Created` should
 * call {@link successWithStatus} instead and pass `201`.
 */
export function success<T>(data: T): NextResponse<SuccessEnvelope<T>> {
  return NextResponse.json(buildSuccessEnvelope(data), { status: 200 });
}

/**
 * Returns a `NextResponse` carrying the success envelope with an explicit
 * HTTP status code (e.g. `201` for created resources, `204` for no-content
 * bodies that still need an envelope wrapper).
 */
export function successWithStatus<T>(
  data: T,
  status: number,
): NextResponse<SuccessEnvelope<T>> {
  return NextResponse.json(buildSuccessEnvelope(data), { status });
}

/**
 * Returns a `NextResponse` carrying the failure envelope, with the HTTP
 * status derived from the canonical {@link HTTP_STATUS_BY_CODE} map.
 */
export function failure(
  code: ApiErrorCode,
  message: string,
  validationErrors?: ReadonlyArray<FieldValidationError>,
): NextResponse<FailureEnvelope> {
  const status = HTTP_STATUS_BY_CODE[code];
  return NextResponse.json(
    buildFailureEnvelope(code, message, validationErrors),
    { status },
  );
}

/**
 * Returns a `NextResponse` carrying the failure envelope with an explicit
 * HTTP status, overriding the default mapping. Reserved for rare cases where
 * a single error code legitimately maps to multiple statuses depending on
 * context; the default {@link failure} helper should be preferred.
 */
export function failureWithStatus(
  code: ApiErrorCode,
  message: string,
  status: number,
  validationErrors?: ReadonlyArray<FieldValidationError>,
): NextResponse<FailureEnvelope> {
  return NextResponse.json(
    buildFailureEnvelope(code, message, validationErrors),
    { status },
  );
}

/**
 * Convenience helper that maps an array of Zod issues into the wire-format
 * {@link FieldValidationError} list, then emits a `VALIDATION_ERROR` failure
 * envelope (HTTP 422). Centralizes the Zod-to-envelope translation so every
 * validating handler emits an identical failure shape.
 */
export function validationFailure(
  issues: ReadonlyArray<ZodIssue>,
  message = "One or more input fields are invalid.",
): NextResponse<FailureEnvelope> {
  const validationErrors: FieldValidationError[] = issues.map((issue) => ({
    path: pathToString(issue.path),
    message: issue.message,
  }));
  return failure("VALIDATION_ERROR", message, validationErrors);
}
