/**
 * Request pipeline orchestrator.
 *
 * Composes the shared per-request steps that every authenticated Route
 * Handler under `src/app/api/v1/**` needs, so handlers declare *what* they
 * require instead of re-wiring the same sequence by hand:
 *
 *   1. Session & Identity Extraction       — `withSession` (401 on failure)
 *   2. Onboarding Verification Guard       — opt-in per route:
 *        `requireOnboarding` → 403 ONBOARDING_REQUIRED when no Profile exists
 *        `rejectIfOnboarded` → 409 CONFLICT when a Profile already exists
 *   3. Input Validation (Zod v4)           — `validateBody` (400 / 422 on failure)
 *   4. XSS Sanitization                    — `sanitizeObject` on the validated body
 *
 * Steps 3–4 only run when `options.schema` is provided — body-less routes
 * (GET / DELETE) omit it. The onboarding guard also resolves the Profile row
 * once and exposes it on the context, so routes that need profile fields
 * (e.g. `currencyPreference` as the workspace-currency default) do not pay a
 * second query.
 *
 * The validated + sanitized body is handed to the handler as its *second
 * argument* (`data`), typed as `S['_output']` whenever a schema is supplied —
 * schema-ful handlers receive it without any `!` assertion.
 *
 * Error handling stays symmetric with the rest of the pipeline: session,
 * guard, validation, and sanitization failures short-circuit with a
 * ready-to-return failure envelope. Domain errors thrown by the handler's
 * service calls remain the handler's responsibility — each handler keeps its
 * own try/catch so it can map service failures to the correct envelope.
 */
import type { NextRequest, NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import { db } from '@/lib/db';
import { failure } from './envelope';
import { sanitizeObject } from './sanitize';
import { withSession, type AuthContext } from './session';
import { validateBody } from './validate';

/**
 * Profile row resolved by the onboarding guard. `currencyPreference` is
 * included so handlers that default the workspace currency to the creator's
 * preference (POST /workspaces) can reuse the already-fetched row.
 */
export interface OnboardingProfile {
  id: string;
  currencyPreference: string | null;
}

/**
 * Per-route pipeline configuration.
 */
export interface PipelineOptions<S extends ZodType = ZodType> {
  /**
   * Zod schema the request body is validated and sanitized against.
   * Omit for routes with no body (GET / DELETE).
   */
  schema?: S;
  /**
   * Require the user to have completed onboarding — a `Profile` row must
   * exist, otherwise the request short-circuits with `ONBOARDING_REQUIRED`
   * (HTTP 403). The resolved row is exposed to the handler as `ctx.profile`.
   */
  requireOnboarding?: boolean;
  /**
   * Inverse of `requireOnboarding`: reject the request with `CONFLICT`
   * (HTTP 409) when a `Profile` row already exists. Used by the onboarding
   * completion route so a double submission can never hit the unique
   * constraint on `Profile.userId`.
   *
   * `requireOnboarding` and `rejectIfOnboarded` are mutually exclusive —
   * setting both is a configuration error.
   */
  rejectIfOnboarded?: boolean;
}

/**
 * Context handed to the handler after the pipeline steps complete.
 * Extends {@link AuthContext} (validated `userId`) with the resolved
 * profile row when the onboarding guard ran.
 */
export interface PipelineContext extends AuthContext {
  /**
   * Profile row resolved by the onboarding guard. `null` when
   * `rejectIfOnboarded` let the request through (no profile existed);
   * `undefined` when no onboarding guard ran.
   */
  profile?: OnboardingProfile | null;
}

const ONBOARDING_REQUIRED_MESSAGE =
  'Profile not found. Please complete onboarding first.';

/**
 * Run the shared request pipeline and hand the resolved context and
 * validated body to `handler`.
 *
 * Returns:
 *   - On success: whatever `NextResponse` `handler` returns, giving the
 *     handler full control over the final envelope shape and status code.
 *   - On failure at any pipeline step: the ready-to-return failure envelope
 *     (401 / 403 / 409 / 400 / 422 depending on the step).
 */
export async function withPipeline<S extends ZodType>(
  request: NextRequest,
  options: PipelineOptions<S> & { schema: S },
  handler: (ctx: PipelineContext, data: S['_output']) => Promise<NextResponse>
): Promise<NextResponse>;
export async function withPipeline(
  request: NextRequest,
  options: PipelineOptions<never> & { schema?: undefined },
  handler: (ctx: PipelineContext, data: undefined) => Promise<NextResponse>
): Promise<NextResponse>;
export async function withPipeline<S extends ZodType = ZodType>(
  request: NextRequest,
  options: PipelineOptions<S>,
  handler: (
    ctx: PipelineContext,
    data: S['_output'] | undefined
  ) => Promise<NextResponse>
): Promise<NextResponse> {
  return withSession(request, async (authCtx) => {
    const { schema, requireOnboarding = false, rejectIfOnboarded = false } =
      options;

    // Step 2 — Onboarding Verification Guard (optional, per route)
    let profile: OnboardingProfile | null | undefined;
    if (requireOnboarding || rejectIfOnboarded) {
      profile = await db.profile.findUnique({
        where: { userId: authCtx.userId },
        select: { id: true, currencyPreference: true },
      });

      if (requireOnboarding && !profile) {
        return failure('ONBOARDING_REQUIRED', ONBOARDING_REQUIRED_MESSAGE);
      }
      if (rejectIfOnboarded && profile) {
        return failure(
          'CONFLICT',
          'Onboarding has already been completed for this account.'
        );
      }
    }

    // Steps 3–4 — Validation + sanitization (optional, body-less routes omit)
    let data: S['_output'] | undefined;
    if (schema) {
      const validationResult = await validateBody(request, schema);
      if (!validationResult.success) {
        return validationResult.response;
      }
      data = sanitizeObject(validationResult.data);
    }

    return handler({ ...authCtx, profile }, data);
  });
}
