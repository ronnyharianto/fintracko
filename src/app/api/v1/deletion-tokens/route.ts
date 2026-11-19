/**
 * POST /api/v1/deletion-tokens
 *
 * Issues a short-lived confirmation token for an irreversible deletion.
 * The destructive DELETE routes refuse to run without one, so the client
 * must mint a token immediately before confirming.
 *
 * Body:
 *   { "scope": "ACCOUNT" }                                  -> own account
 *   { "scope": "WORKSPACE", "workspaceId": "<uuid>" }       -> owned workspace
 *
 * Workspace tokens are only issued to the workspace OWNER, mirroring the
 * authorization of `DELETE /api/v1/workspaces/[id]`. Tokens expire after five
 * minutes and are bound to the caller and the named resource; see
 * `src/lib/deletion-confirmation.ts`.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { withPipeline } from "@/lib/api/pipeline";
import { failure, success } from "@/lib/api/envelope";
import { issueDeletionToken } from "@/lib/deletion-confirmation";
import { findWorkspaceOwner } from "@/features/workspaces/services/helpers";

const DeletionTokenRequestSchema = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("ACCOUNT") }),
  z.object({ scope: z.literal("WORKSPACE"), workspaceId: z.uuid() }),
]);

export async function POST(request: NextRequest) {
  return withPipeline(
    request,
    { schema: DeletionTokenRequestSchema, requireOnboarding: true },
    async ({ userId }, data) => {
      if (data.scope === "WORKSPACE") {
        const isOwner = await findWorkspaceOwner(userId, data.workspaceId);
        if (!isOwner) {
          return failure(
            "FORBIDDEN",
            "You do not have permission to delete this workspace.",
          );
        }
        return success(
          issueDeletionToken(
            { scope: "WORKSPACE", workspaceId: data.workspaceId },
            userId,
          ),
        );
      }

      return success(issueDeletionToken({ scope: "ACCOUNT", userId }, userId));
    },
  );
}
