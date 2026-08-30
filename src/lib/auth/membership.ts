/**
 * Shared workspace membership verification.
 *
 * Used by feature services (accounts, categories, etc.) to enforce
 * workspace-scoped access control (§4 — every workspace-scoped read or
 * mutation must enforce membership).
 */

import { db } from "@/lib/db";

/**
 * Check if the user is a member of the given workspace.
 * Returns the membership row or null.
 */
export async function findWorkspaceMembership(
  userId: string,
  workspaceId: string,
) {
  return db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
    select: { id: true },
  });
}
