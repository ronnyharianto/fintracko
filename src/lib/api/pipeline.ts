/**
 * Composable request pipeline orchestrator.
 *
 * Wires the three Task 2.3 pipeline stages:
 *   1. Session & identity extraction → [`session.ts`](session.ts)
 *   2. Zod schema validation         → [`validate.ts`](validate.ts)
 *   3. XSS sanitization              → [`sanitize.ts`](sanitize.ts)
 * into a single helper a Route Handler can call to fully honor the global
 * security pipeline declared in docs/architecture/API_SPECS.md §2.
 *
 * The orchestrator returns a discriminated result union so the consuming
 * Route Handler either short-circuits by returning the failure envelope or
 * proceeds with a fully-typed, sanitized `validated` payload and the
 * resolved `AuthContext` in hand — there is no way to forget a guard step
 * (the type system collapses the union only after every stage has passed).
 *
 * Phase 3+ guards (Onboarding Verification, Workspace Anti-IDOR) are
 * deliberately NOT composed in here — they will be wired by Route Handlers
 * as needed once Task 3.1 and Task 3.4 land. This keeps the orchestrator a
 * faithful implementation of Task 2.3's stated scope (envelope +
 * session + validation + sanitization) and avoids premature coupling.
 *
 * Failure modes:
 *   - Any stage failure returns a ready `NextResponse` carrying the
 *     canonical envelope. The handler MUST return it untouched (or,
 *     rethrow-style, return before invoking business logic), per
 *     AGENT_RULES.md §4 ("Never let unhandled exceptions leak to the
 *     client").
 */
import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import type { ZodType } from "zod";
import {
  resolveSession,
  getProductionAuth,
  type AuthContext,
  type AuthLike,
} from "./session";
import { validateBody } from "./validate";
import { sanitizeObject } from "./sanitize";

/**
 * Context handed to a Route Handler callback after the full pipeline has
 * succeeded. `ctx.userId` and `ctx.session` come verbatim from
 * {@link AuthContext}; `validated` is the Zod-shaped and sanitized payload
 * the handler can persist/aggregate on.
 */
export interface PipelineContext<T> {
  auth: AuthContext;
  validated: T;
  request: NextRequest;
}

/**
 * Discriminated result of {@link runPipeline}. The consuming handler MUST
 * branch on `ok` and short-circuit on `false` by returning `response`.
 */
export type PipelineResult<T> =
  | { ok: true; ctx: PipelineContext<T> }
  | { ok: false; response: NextResponse };

/**
 * Optional pipeline knobs so a Route Handler can reuse the orchestrator for
 * endpoints that legitimately need a configuration override (e.g. an
 * endpoint with no body at all can pass `skipSanitization` to skip the
 * XSS walk over the empty payload).
 */
export interface PipelineOptions {
  /**
   * Auth instance to use for session extraction. Defaults lazily to the
   * production Better Auth singleton (see [`session.ts`](session.ts)).
   * Injected primarily by the co-located test suite.
   */
  authInstance?: AuthLike;
  /**
   * When true, the sanitization stage is skipped entirely. Useful for
   * endpoints whose schema declares NO string-typed leaves (e.g. a body
   * composed entirely of UUIDs and decimal strings) — skipping saves a
   * traversal. Defaults to false so the safest default applies.
   */
  skipSanitization?: boolean;
}

/**
 * Run the three-stage Task 2.3 pipeline against `request` and return a
 * discriminated result:
 *   - `ok: true` → the handler callback may now execute business logic
 *     using `ctx.auth` and `ctx.validated`.
 *   - `ok: false` → the handler MUST `return response` verbatim.
 *
 * The pipeline is deliberately NOT flattened: keeping the stages as
 * discrete helpers (each with its own unit suite) means the orchestrator
 * only needs to test wiring + short-circuit semantics here, not re-test
 * the per-stage behavior.
 */
export async function runPipeline<S extends ZodType>(
  request: NextRequest,
  schema: S,
  options?: PipelineOptions,
): Promise<PipelineResult<S["_output"]>> {
  // Stage 1 — session & identity extraction.
  const sessionResult = await resolveSession(
    request,
    options?.authInstance ?? (await getProductionAuth()),
  );
  if (!sessionResult.success) {
    return { ok: false, response: sessionResult.response };
  }

  // Stage 2 — Zod schema validation (also handles non-JSON / empty body).
  const validateResult = await validateBody(request, schema);
  if (!validateResult.success) {
    return { ok: false, response: validateResult.response };
  }

  // Stage 3 — XSS sanitization of the validated payload.
  const validated: S["_output"] = options?.skipSanitization
    ? validateResult.data
    : sanitizeObject(validateResult.data);

  return {
    ok: true,
    ctx: {
      auth: {
        userId: sessionResult.session.user.id,
        session: sessionResult.session,
      },
      validated,
      request,
    },
  };
}

/**
 * Convenience wrapper that runs the pipeline and, on success, hands the
 * `PipelineContext` to a Route Handler callback. The callback's returned
 * `NextResponse` is forwarded verbatim. On failure, the pipeline's
 * envelope response is returned directly without invoking the callback.
 *
 * This is the idiomatic surface most Route Handlers should use:
 * ```ts
 * export async function POST(request: NextRequest) {
 *   return withPipeline(request, CreateWorkspaceSchema, async ({ auth, validated }) => {
 *     const workspace = await services.createWorkspace(auth.userId, validated);
 *     return success(workspace);
 *   });
 * }
 * ```
 */
export async function withPipeline<S extends ZodType>(
  request: NextRequest,
  schema: S,
  handler: (ctx: PipelineContext<S["_output"]>) => Promise<NextResponse>,
  options?: PipelineOptions,
): Promise<NextResponse> {
  const result = await runPipeline(request, schema, options);
  if (!result.ok) {
    return result.response;
  }
  return handler(result.ctx);
}
