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
  | 'CANNOT_REMOVE_OWNER';

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
