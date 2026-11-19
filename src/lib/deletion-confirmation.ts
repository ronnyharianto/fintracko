/**
 * Short-lived confirmation tokens for irreversible deletions.
 *
 * `DELETE /api/v1/account` and `DELETE /api/v1/workspaces/[id]` destroy data
 * permanently, so a session cookie alone is not enough: a stray request, a
 * replayed one, or a page riding the cookie must not be able to erase years
 * of financial history. Both routes therefore require a token minted by
 * `POST /api/v1/deletion-tokens` and bound to the authenticated user, the
 * operation, and the exact resource.
 *
 * The token is stateless and self-authenticating:
 *
 *     base64url(JSON payload) "." base64url(HMAC-SHA256(payload))
 *
 * The HMAC key reuses `BETTER_AUTH_SECRET` (already required for session
 * cookies), so no new environment variable is involved. Tokens live for
 * {@link DELETION_TOKEN_TTL_MS} and are only accepted by the route whose
 * scope and resource id they name — an account token cannot delete a
 * workspace, one user's token cannot delete another user's data, and an
 * expired token is rejected.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { requireEnv } from "./env";

/** How long an issued token stays valid. */
export const DELETION_TOKEN_TTL_MS = 5 * 60 * 1000;

/**
 * What a token authorizes. `ACCOUNT` identifies the user themselves;
 * `WORKSPACE` identifies one owned workspace.
 */
export type DeletionTarget =
  | { scope: "ACCOUNT"; userId: string }
  | { scope: "WORKSPACE"; workspaceId: string };

interface DeletionTokenPayload {
  /** Format version, so an outdated payload shape is rejected. */
  v: 1;
  scope: DeletionTarget["scope"];
  /** Resource id: the user id for `ACCOUNT`, the workspace id otherwise. */
  id: string;
  /** Issuing user — the only account the token may delete data for. */
  sub: string;
  /** Expiry, milliseconds since the epoch. */
  exp: number;
}

function sign(payload: string): string {
  return createHmac("sha256", requireEnv("BETTER_AUTH_SECRET"))
    .update(payload)
    .digest("base64url");
}

function resourceIdOf(target: DeletionTarget): string {
  return target.scope === "ACCOUNT" ? target.userId : target.workspaceId;
}

/**
 * Issues a confirmation token for `target` on behalf of `issuerId`.
 * Callers must have authorized the issuer for that target first (own account,
 * or OWNER membership of the workspace).
 */
export function issueDeletionToken(
  target: DeletionTarget,
  issuerId: string,
): { token: string; expiresAt: string } {
  const exp = Date.now() + DELETION_TOKEN_TTL_MS;
  const payload: DeletionTokenPayload = {
    v: 1,
    scope: target.scope,
    id: resourceIdOf(target),
    sub: issuerId,
    exp,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  return {
    token: `${encoded}.${sign(encoded)}`,
    expiresAt: new Date(exp).toISOString(),
  };
}

/**
 * Returns true only when `token` was issued by {@link issueDeletionToken} to
 * `issuerId` for this exact target and has not expired.
 *
 * Never throws: malformed, truncated, mis-signed, and expired tokens all read
 * as `false`, so a caller only has to decide how to report the rejection.
 */
export function hasValidDeletionToken(
  token: string | null | undefined,
  target: DeletionTarget,
  issuerId: string,
): boolean {
  if (!token) {
    return false;
  }

  const [encoded, signature, ...rest] = token.split(".");
  if (!encoded || !signature || rest.length > 0) {
    return false;
  }

  const expected = sign(encoded);
  const provided = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (
    provided.length !== expectedBuffer.length ||
    !timingSafeEqual(provided, expectedBuffer)
  ) {
    return false;
  }

  let payload: DeletionTokenPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as DeletionTokenPayload;
  } catch {
    return false;
  }

  return (
    payload.v === 1 &&
    payload.scope === target.scope &&
    payload.id === resourceIdOf(target) &&
    payload.sub === issuerId &&
    payload.exp > Date.now()
  );
}
