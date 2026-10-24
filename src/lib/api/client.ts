/**
 * Client-side typed fetch helper for the Fintracko REST API.
 *
 * Every Route Handler returns a standardised envelope:
 *
 *   { "success": true,  "data": T }          — on 2xx
 *   { "success": false, "error": { code, message, validationErrors? } }  — on non-2xx
 *
 * This module provides `apiFetch<T>`, a thin wrapper around the native
 * `fetch` that:
 *   1. Sends the request with JSON Content-Type by default.
 *   2. Reads the response body as JSON.
 *   3. On non-2xx responses, throws an `ApiClientError` carrying the
 *      envelope error code + message so callers can present a meaningful
 *      toast instead of hand-unwrapping `res.json()` in every dialog.
 *
 * Usage:
 *   import { apiFetch, ApiClientError } from '@/lib/api/client';
 *
 *   try {
 *     const data = await apiFetch<{ id: string }>(`/api/v1/workspaces`, {
 *       method: 'POST',
 *       body: { name: 'My Workspace' },
 *     });
 *   } catch (err) {
 *     if (err instanceof ApiClientError) {
 *       toast.error(err.message);   // "A workspace with this name already exists."
 *     }
 *   }
 */

import type { ApiErrorCode } from "./envelope";

const API_ERROR_CODES: ReadonlySet<string> = new Set([
  "BAD_REQUEST",
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "ONBOARDING_REQUIRED",
  "UNAUTHORIZED_WORKSPACE_ACCESS",
  "SERVICE_UNAVAILABLE",
  "INTERNAL_SERVER_ERROR",
]);

function isApiErrorCode(value: string): value is ApiErrorCode {
  return API_ERROR_CODES.has(value);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Typed error thrown by {@link apiFetch} when the API returns a failure envelope. */
export class ApiClientError extends Error {
  /** Machine-readable code matching the server-side {@link ApiErrorCode}. */
  readonly code: ApiErrorCode;

  /** Optional per-field validation errors from a VALIDATION_ERROR response. */
  readonly validationErrors?: ReadonlyArray<{ path: string; message: string }>;

  constructor(
    code: ApiErrorCode,
    message: string,
    validationErrors?: ReadonlyArray<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.validationErrors = validationErrors;
  }
}

// ---------------------------------------------------------------------------
// Session-expiry signal
// ---------------------------------------------------------------------------

/**
 * Browser event the app shell listens on to navigate away once the API
 * reports the session is gone. Named here so producer and consumer agree.
 */
export const SESSION_EXPIRED_EVENT = "fintracko:session-expired";

/** Collapses a burst of parallel 401s into a single navigation. */
const SESSION_EXPIRED_COOLDOWN_MS = 2_000;

let lastSessionExpiredSignalAt = 0;

/**
 * Signals that the session is no longer active.
 *
 * `apiFetch` is a plain library function without router access, and
 * `window.location.assign()` is disallowed for internal navigation, so the
 * signal is a browser event: the SessionProvider listens for it and runs
 * `router.replace('/')`. Client-side navigation between private pages
 * reuses the mounted `(workspace)` layout, so the server-side auth guard
 * does not re-run and this 401 is the first sign of an expired session —
 * surfacing it as a retryable error state would be dishonest, since Retry
 * fails identically. The root route is session-aware: signed-out visitors
 * get the marketing page, live sessions are sent back into the app.
 */
function signalSessionExpired(): void {
  if (typeof window === "undefined") {
    return;
  }

  const now = Date.now();
  if (now - lastSessionExpiredSignalAt < SESSION_EXPIRED_COOLDOWN_MS) {
    return;
  }
  lastSessionExpiredSignalAt = now;

  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

// ---------------------------------------------------------------------------
// apiFetch
// ---------------------------------------------------------------------------

/**
 * Typed wrapper around `fetch` that speaks the Fintracko envelope contract.
 *
 * The `body` parameter accepts a plain object (or `null` for GET/DELETE);
 * it is automatically serialised to JSON.  Pass `null` or omit `body` for
 * requests without a payload.
 *
 * Returns the unwrapped `data` payload on success (HTTP 2xx with
 * `success: true`).
 *
 * Throws `ApiClientError` when:
 *   - The response is non-2xx and carries a failure envelope.
 *   - The response is 2xx but the envelope `success` flag is `false`
 *     (defensive: should not happen if the server is consistent).
 *   - The response body is not valid JSON (network corruption, etc.).
 */
export async function apiFetch<T>(
  path: string,
  init: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): Promise<T> {
  const { method = "GET", body, headers: extraHeaders } = init;

  const headers: Record<string, string> = {
    ...extraHeaders,
  };

  // Only set Content-Type when we have a body to send.
  if (body !== undefined && body !== null) {
    headers["Content-Type"] = "application/json";
  }

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers,
      body:
        body !== undefined && body !== null ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Network-level failure (DNS, offline, CORS, etc.)
    throw new ApiClientError(
      "SERVICE_UNAVAILABLE",
      "Network error. Please check your connection and try again.",
    );
  }

  let json: Record<string, unknown>;
  try {
    json = await res.json();
  } catch {
    throw new ApiClientError(
      "INTERNAL_SERVER_ERROR",
      "The server returned an invalid response. Please try again.",
    );
  }

  // Success path
  if (res.ok && json.success === true) {
    return (json as { data: T }).data;
  }

  // Failure path — unwrap the envelope error block
  const errorBlock = json.error as
    | { code?: string; message?: string; validationErrors?: unknown }
    | undefined;

  const rawCode = errorBlock?.code ?? "";
  const code = isApiErrorCode(rawCode) ? rawCode : "INTERNAL_SERVER_ERROR";
  const message =
    errorBlock?.message ?? "An unexpected error occurred. Please try again.";
  const validationErrors = Array.isArray(errorBlock?.validationErrors)
    ? (errorBlock.validationErrors as Array<{ path: string; message: string }>)
    : undefined;

  // UNAUTHORIZED means the session cookie no longer resolves to a live
  // session (expired, or signed out in another tab). Every private page
  // depends on it, so signal the app shell to leave for the homepage
  // instead of surfacing an error state the user can only retry into the
  // same failure.
  if (code === "UNAUTHORIZED") {
    signalSessionExpired();
  }

  throw new ApiClientError(code, message, validationErrors);
}
