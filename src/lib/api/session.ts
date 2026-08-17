/**
 * Session & identity extraction pipeline handler.
 *
 * Implements the "Session & Identity Extraction" step of the global security
 * pipeline.
 *
 *   "Validate the HTTP session cookie or `Bearer` authorization headers
 *    strictly using Better Auth. Retrieve the validated `userId`."
 *
 *   This module ONLY resolves the authenticated session and exposes the
 *   validated `userId`. Downstream Phase 3+ guards (Onboarding Verification
 *   and Workspace Multi-Tenancy / Anti-IDOR) intentionally live in later
 *   tasks — see Task 3.1 and Task 3.4 in the roadmap. Keeping those guards
 *   out of this file lets each Route Handler compose only the pipeline steps
 *   that apply to its contract.
 *
 * Error handling:
 *   - No session / invalid session map to the `UNAUTHORIZED` (HTTP 401)
 *     failure envelope ("Use standard HTTP status codes; never let
 *     unhandled exceptions leak to the client").
 *   - Unexpected Better Auth failures are split (B8): errors that look like
 *     transient infrastructure problems (dropped DB connection, network
 *     timeout) surface as `SERVICE_UNAVAILABLE` (HTTP 503) so monitoring and
 *     clients can tell an outage apart from a genuine auth failure; everything
 *     else degrades to the same clean 401.
 *   - The raw error from Better Auth is NEVER serialized to the response
 *     body (sensitive details such as session-token fragments or internal
 *     stack frames must not leak) — a generic message is emitted instead.
 */
import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { failure, type FailureEnvelope } from './envelope';

/**
 * The minimal shape of the Better Auth instance we depend on. Using a
 * structural type (instead of `typeof auth` directly) gives us a stable
 * injection seam, so callers can supply a minimal Better Auth-shaped object
 * instead of the full singleton.
 */
export interface AuthLike {
  api: {
    getSession: (input: { headers: Headers }) => Promise<SessionLike | null>;
  };
}

/**
 * Minimal session shape we read off Better Auth's resolved session. We trim
 * it to the two fields the pipeline needs (`user.id` and `user.emailVerified`)
 * so the contract stays narrow and survives upstream Better Auth renames of
 * incidental fields.
 */
export interface SessionLike {
  user: {
    id: string;
    emailVerified?: boolean | null;
    // Other fields exist on the real session but are ignored here.
  };
}

/**
 * Result of {@link getSession}. A discriminated union so callers MUST
 * handle both branches — a handler cannot accidentally forget the
 * not-authenticated case (the type system refuses access to `session`
 * until `success === true`).
 */
export type GetSessionResult =
  | { success: true; session: SessionLike }
  | { success: false; response: NextResponse<FailureEnvelope> };

/**
 * Resolved authentication context handed to a Route Handler callback by the
 * pipeline orchestrator ([`pipeline.ts`](pipeline.ts)). Carries the validated
 * `userId` plus the raw session so downstream guards (added in Phase 3+)
 * can re-use the already-resolved record instead of querying again.
 */
export interface AuthContext {
  userId: string;
  session: SessionLike;
}

/**
 * The session extractor used by the pipeline.
 *
 * Defaults to the real Better Auth instance imported from [`../auth`](../auth)
 * — keeping this as a parameter (with the production default filled by
 * `getSession` below) preserves an injection seam for callers that need a
 * custom or faked auth instance. This seam is the *only* reason `AuthLike`
 * is structural rather than `typeof auth`.
 *
 * Throws are explicitly caught so a transient Better Auth failure (e.g. a
 * dropped database connection during session lookup) degrades to a clean
 * envelope rather than leaking a 500 stack trace — see {@link
 * isTransientSessionFailure} for the 503-vs-401 split.
 */
export async function resolveSession(
  request: NextRequest,
  authInstance: AuthLike
): Promise<GetSessionResult> {
  try {
    const session = await authInstance.api.getSession({
      headers: request.headers,
    });
    if (!session || !session.user?.id) {
      return {
        success: false,
        response: failure(
          'UNAUTHORIZED',
          'Authentication required to access this resource.'
        ),
      };
    }
    return { success: true, session };
  } catch (err) {
    // Never leak Better Auth internals — the raw error (session-token
    // fragments, driver details, stack frames) never reaches the client.
    // Distinguish a transient infrastructure failure (503) from a genuine
    // authentication failure (401) so monitoring can tell an outage apart
    // from a user who simply isn't signed in (B8).
    if (isTransientSessionFailure(err)) {
      return {
        success: false,
        response: failure(
          'SERVICE_UNAVAILABLE',
          'Authentication service is temporarily unavailable. Please try again.'
        ),
      };
    }
    return {
      success: false,
      response: failure(
        'UNAUTHORIZED',
        'Authentication required to access this resource.'
      ),
    };
  }
}

/**
 * Heuristic for recognizing transient infrastructure failures thrown by
 * Better Auth / its Prisma driver (dropped connection, network timeouts,
 * connection-pool exhaustion) so they can be reported as 503 instead of
 * being masked as 401 (B8).
 *
 * Matches on recognizable transport/driver error signatures only — anything
 * unrecognized falls through to `UNAUTHORIZED`, keeping the fail-safe
 * behavior (an unauthenticated-looking response) intact.
 */
function isTransientSessionFailure(err: unknown): boolean {
  if (!(err instanceof Error)) {
    return false;
  }
  return /ECONNREFUSED|ECONNRESET|ETIMEDOUT|socket hang up|P1001|P1002|connection (is|was) (closed|terminated)|database .* (unavailable|down)/i.test(
    err.message
  );
}

/**
 * Lazily resolves the production Better Auth singleton from [`../auth`](../auth).
 *
 * Imported lazily (inside the function body) for two reasons:
 *   1. Keeping the module-load graph small — importing the auth singleton
 *      eagerly would force the Prisma adapter and `DATABASE_URL` to be
 *      resolved at import time of every module that touches the pipeline.
 *   2. Avoiding a circular import hazard: `../auth` imports `../db`, and
 *      importing it at module top-of-file here would pin a finish-order
 *      that's brittle under Next.js hot module reloading.
 */
export async function getProductionAuth(): Promise<AuthLike> {
  const { auth } = await import('../auth');
  return auth as unknown as AuthLike;
}

/**
 * Convenience wrapper that resolves the session using the production Better
 * Auth singleton (unless an explicit `authInstance` is injected — e.g. by a
 * future E2E harness) and either hands the
 * authenticated context to `onSuccess` or short-circuits with the envelope
 * failure response.
 *
 * Route Handlers that only need the session (no Zod schema, no
 * sanitization) can use this effectively; the full pipeline orchestrator at
 * [`pipeline.ts`](pipeline.ts) wraps the three steps together for handlers
 * that need all of them.
 *
 * Returns:
 *   - On success: the `NextResponse` returned by `onSuccess`, giving the
 *     handler full control over the final envelope shape and status code.
 *   - On failure: the `UNAUTHORIZED` failure envelope, ready to be returned.
 */
export async function withSession(
  request: NextRequest,
  onSuccess: (ctx: AuthContext) => Promise<NextResponse>,
  authInstance?: AuthLike
): Promise<NextResponse> {
  const resolvedAuth = authInstance ?? (await getProductionAuth());
  const result = await resolveSession(request, resolvedAuth);
  if (!result.success) {
    return result.response;
  }
  const ctx: AuthContext = {
    userId: result.session.user.id,
    session: result.session,
  };
  return onSuccess(ctx);
}
