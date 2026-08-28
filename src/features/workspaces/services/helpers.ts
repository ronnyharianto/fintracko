/**
 * Shared helpers for the workspace service layer.
 */

import { db } from "@/lib/db";

/**
 * Returns the OWNER membership row for `userId` in `workspaceId`, or `null`
 * when the user is not an owner.
 *
 * Every mutating workspace operation must compound-filter on
 * `WorkspaceMember` by both `workspaceId` and `userId` (AGENT_RULES §3,
 * Anti-IDOR / Multi-Tenancy). Extracted so the lookup lives in exactly one
 * place; each caller decides how to handle the `null` result — typically by
 * throwing `WorkspaceServiceError("FORBIDDEN")` — so the error handling
 * stays visible at the call site (H1).
 */
export async function findWorkspaceOwner(userId: string, workspaceId: string) {
  return db.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId,
      role: "OWNER",
    },
    select: { id: true },
  });
}
