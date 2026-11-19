/**
 * Zod-based input validation pipeline handler.
 *
 * Implements the "Rate Limiting & Input Validation" step of the global
 * security pipeline.
 *
 *   "Every incoming request must be parsed and strictly validated at
 *    runtime against explicit Zod schemas."
 *
 * (Data Validation & Input Sanitization):
 *   "Validate all incoming payloads (Server Actions, Route Handlers, or
 *    form submissions) using strict schema validation (e.g., Zod)."
 *
 *   This module ONLY parses and schema-validates the raw request body
 *   (JSON), returning a typed, validated payload to the caller or a
 *   canonical `VALIDATION_ERROR` (HTTP 422) failure envelope. The
 *   XSS-sanitization step runs as the *next* pipeline stage
 *   ([`sanitize.ts`](sanitize.ts)) so that any string fields the schema
 *   accepted are stripped *after* the schema attests they exist and are
 *   strings — never on the untrusted raw body, which could legitimately
 *   contain non-string leaves the schema rejects.
 *
 * Design notes:
 *   - The handler is generic over `TSchema extends ZodType` so the caller
 *     gets back the inferred validated type with no manual cast.
 *   - Non-JSON bodies produce a `BAD_REQUEST` (HTTP 400) envelope rather
 *     than letting the underlying `request.json()` Promise reject with a
 *     SyntaxError that would leak a 500 to the client.
 *   - An absent body (e.g. POST requests with no payload) parses to `null`
 *     and is handed to the schema — the schema is solely responsible for
 *     rejecting that case (e.g. via `.refine` or `.nonNull`).
 *   - The body is read through a hard byte cap ({@link MAX_JSON_BODY_BYTES})
 *     so an oversized document is rejected with `PAYLOAD_TOO_LARGE` (HTTP
 *     413) instead of being buffered whole. `Content-Length` is only used for
 *     early rejection; the cap is re-enforced while streaming because the
 *     header can be absent or lie.
 */
import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import { failure, validationFailure, type FailureEnvelope } from './envelope';
import {
  readBoundedBody,
  RequestBodyTooLargeError,
} from './read-bounded-form-data';

/**
 * Hard cap on JSON request bodies, shared by every route that validates a
 * body through {@link validateBody}. The largest legitimate payload today (a
 * transaction with a 500-character description, 10 tags and a URL) is well
 * under 1 KiB, so 64 KiB leaves ample headroom while bounding memory use.
 */
export const MAX_JSON_BODY_BYTES = 64 * 1024;

/** Failure reason returned when a body exceeds {@link MAX_JSON_BODY_BYTES}. */
const JSON_BODY_TOO_LARGE_REASON = 'Request body exceeds the 64 KB limit.';

/**
 * Result of {@link validateBody}. A discriminated union so callers MUST
 * handle both branches — the validated payload is unreachable until the
 * type system has confirmed `success === true`.
 */
export type ValidateBodyResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse<FailureEnvelope> };

/**
 * Result of {@link readJsonBody}. `tooLarge` distinguishes a body that
 * exceeded the byte cap from one that was merely unreadable or malformed.
 */
export type JsonBodyReadResult =
  | { ok: true; data: unknown }
  | { ok: false; tooLarge: boolean; reason: string };

/**
 * Read the JSON body of a request under a byte cap, swallowed to a symmetric
 * failure result whenever the body is unreadable, oversized, or not valid
 * JSON. Returns `null` for empty/absent bodies so the upstream Zod schema can
 * decide whether that is acceptable (it usually isn't for mutating routes).
 *
 * `tooLarge` is reported separately so {@link validateBody} can answer with
 * `PAYLOAD_TOO_LARGE` (HTTP 413) instead of a generic bad-request failure.
 *
 * Extracted from the main validator so the error-handling branches stay
 * readable and the syntactic-vs-semantic failure split stays testable in
 * isolation.
 */
export async function readJsonBody(
  request: NextRequest,
  maxBytes: number = MAX_JSON_BODY_BYTES
): Promise<JsonBodyReadResult> {
  // An absent body is not a size failure: the schema decides whether it is
  // acceptable, matching the previous empty-string path.
  if (!request.body) {
    return { ok: true, data: null };
  }

  let rawBytes: Uint8Array<ArrayBuffer>;
  try {
    rawBytes = await readBoundedBody(request, maxBytes);
  } catch (err) {
    if (err instanceof RequestBodyTooLargeError) {
      return { ok: false, tooLarge: true, reason: JSON_BODY_TOO_LARGE_REASON };
    }
    return {
      ok: false,
      tooLarge: false,
      reason: 'Request body could not be read.',
    };
  }

  const rawText = new TextDecoder().decode(rawBytes);
  if (rawText.length === 0) {
    return { ok: true, data: null };
  }
  try {
    return { ok: true, data: JSON.parse(rawText) };
  } catch {
    return {
      ok: false,
      tooLarge: false,
      reason: 'Request body is not valid JSON.',
    };
  }
}

/**
 * Parse and validate the JSON body of `request` against `schema`.
 *
 * Returns:
 *   - `{ success: true, data }` on a happy path, with `data` narrowed to
 *     the schema's inferred type.
 *   - `{ success: false, response }` on a non-JSON body (`BAD_REQUEST`,
 *     HTTP 400) or a schema-validation failure (`VALIDATION_ERROR`,
 *     HTTP 422, with per-field `validationErrors`).
 *
 * The response body is a ready-to-return `NextResponse` — the caller
 * (typically the [pipeline orchestrator](pipeline.ts)) short-circuits the
 * chain by returning it directly.
 */
export async function validateBody<S extends ZodType>(
  request: NextRequest,
  schema: S
): Promise<ValidateBodyResult<S['_output']>> {
  const read = await readJsonBody(request);
  if (!read.ok) {
    return {
      success: false,
      response: failure(
        read.tooLarge ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST',
        read.reason
      ),
    };
  }
  try {
    const parsed = schema.parse(read.data);
    return { success: true, data: parsed };
  } catch (err) {
    if (err instanceof ZodError) {
      return {
        success: false,
        response: validationFailure(err.issues),
      };
    }
    // Defensive: catch any non-Zod exception thrown by `.parse`
    // (a custom refine that throws or `.superRefine` misuse). Surface as
    // a generic 400 without echoing the error upstream.
    return {
      success: false,
      response: failure('BAD_REQUEST', 'Request payload is malformed.'),
    };
  }
}
