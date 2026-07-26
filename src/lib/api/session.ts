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
 *   - No session / invalid session / unexpected Better Auth failure all map
 *     to the `UNAUTHORIZED` (HTTP 401) failure envelope
 *     ("Use standard HTTP status codes; never let unhandled exceptions
 *     leak to the client").
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
 * injection seam for unit tests: a fake Better Auth object implementing
 * only `api.getSession` is sufficient to exercise every code path.
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
 * `getSession` below) preserves an injection seam the test suite exercises
 * via [`session.test.ts`](session.test.ts). This seam is the *only* reason
 * `AuthLike` is structural rather than `typeof auth`.
 *
 * Throws are explicitly caught so a transient Better Auth failure (e.g. a
 * dropped database connection during session lookup) degrades to a clean
 * `UNAUTHORIZED` envelope rather than leaking a 500 stack trace.
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
  } catch {
    // Never leak Better Auth internals — a misconfigured session store or a
    // dropped DB connection during token verification must surface as a
    // plain 401, not a 500 with implementer-readable detail.
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
 * Lazily resolves the production Better Auth singleton from [`../auth`](../auth).
 *
 * Imported lazily (inside the function body) for two reasons:
 *   1. Keeping the module-load graph small — importing the auth singleton
 *      eagerly would force the Prisma adapter and `DATABASE_URL` to be
 *      resolved at import time of every module that touches the pipeline,
 *      which is hostile to unit tests that mock `authInstance` instead.
 *   2. Avoiding a circular import hazard: `../auth` imports `../db`, and
 *      importing it at module top-of-file here would pin a finish-order
 *      that's brittle under Vitest module isolation.
 */
export async function getProductionAuth(): Promise<AuthLike> {
  const { auth } = await import('../auth');
  return auth as unknown as AuthLike;
}

/**
 * Convenience wrapper that resolves the session using the production Better
 * Auth singleton (unless an explicit `authInstance` is injected — typically
 * only by the unit tests or a future E2E harness) and either hands the
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
