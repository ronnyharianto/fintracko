/**
 * Typed domain errors for the workspace service layer (R2).
 *
 * Replaces the previous `throw new Error("FORBIDDEN")` + `err.message ===
 * "FORBIDDEN"` string-matching contract: the error carries a stable,
 * machine-readable `code`, so Route Handlers can map failures to envelope
 * responses without fragile string comparisons or `catch (err: any)`.
 *
 * Only *expected* domain failures are typed here. Unexpected errors
 * (Prisma driver failures, bugs) are NOT instances of
 * {@link WorkspaceServiceError}, so route handlers naturally fall through to
 * their generic `INTERNAL_SERVER_ERROR` fallback.
 */
import type { NextResponse } from 'next/server';
import { failure, type ApiErrorCode, type FailureEnvelope } from '@/lib/api/envelope';

/** Stable machine-readable codes thrown by the workspace services. */
export type WorkspaceServiceErrorCode =
  | 'FORBIDDEN'
  | 'USER_NOT_FOUND'
  | 'ALREADY_MEMBER'
  | 'MEMBER_NOT_FOUND'
  | 'CANNOT_REMOVE_OWNER'
  | 'INVITATION_EXISTS'
  | 'INVITATION_NOT_FOUND'
  | 'INVITATION_EXPIRED';

/**
 * Domain error thrown by `src/features/workspaces/services.ts`. The `code`
 * field is the stable contract — never compare against `message`.
 */
export class WorkspaceServiceError extends Error {
  readonly code: WorkspaceServiceErrorCode;

  constructor(code: WorkspaceServiceErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'WorkspaceServiceError';
    this.code = code;
  }
}

/** Target failure envelope for a given service error code. */
export interface WorkspaceErrorMapping {
  code: ApiErrorCode;
  message: string;
}

/**
 * Map a thrown error to a ready-to-return failure envelope.
 *
 * Returns `null` when `err` is not a {@link WorkspaceServiceError} (or its
 * code has no mapping) — the caller then falls through to its generic 500
 * fallback. Each route supplies only the codes its service call can throw,
 * so the mapping stays explicit and local.
 */
export function workspaceErrorFailure(
  err: unknown,
  messages: Partial<Record<WorkspaceServiceErrorCode, WorkspaceErrorMapping>>
): NextResponse<FailureEnvelope> | null {
  if (!(err instanceof WorkspaceServiceError)) {
    return null;
  }
  const mapped = messages[err.code];
  return mapped ? failure(mapped.code, mapped.message) : null;
}

/**
 * Route-handler wrapper that catches {@link WorkspaceServiceError} instances
 * thrown by the inner handler and maps them to failure envelopes.
 *
 * Eliminates the repeated try/catch + `workspaceErrorFailure` + fallback
 * boilerplate from every workspace route handler. Unexpected errors
 * (non-`WorkspaceServiceError`) fall through to the `fallbackMessage`
 * envelope.
 *
 * @param messages  Per-error-code mapping (same shape as `workspaceErrorFailure`).
 * @param fallbackMessage  Generic message for unexpected errors (500).
 * @param handler   The route handler that may throw workspace domain errors.
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   return withPipeline(request, { ... }, handleWorkspaceErrors(
 *     { FORBIDDEN: { code: 'FORBIDDEN', message: 'No access.' } },
 *     'Failed to …',
 *     async ({ userId }) => { ... }
 *   ));
 * }
 * ```
 */
export function handleWorkspaceErrors<Args extends unknown[]>(
  messages: Partial<Record<WorkspaceServiceErrorCode, WorkspaceErrorMapping>>,
  fallbackMessage: string,
  handler: (...args: Args) => Promise<NextResponse>
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      const mapped = workspaceErrorFailure(err, messages);
      if (mapped) return mapped;
      return failure('INTERNAL_SERVER_ERROR', fallbackMessage);
    }
  };
}
