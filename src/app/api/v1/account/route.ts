/**
 * DELETE /api/v1/account
 *
 * Permanently deletes the authenticated user's account.
 * Owned workspaces are fully destroyed; collaborator workspaces retain data.
 */

import { NextRequest } from "next/server";
import { withPipeline } from "@/lib/api/pipeline";
import { success, failure } from "@/lib/api/envelope";
import { deleteAccount } from "@/features/account/services";

export async function DELETE(request: NextRequest) {
  return withPipeline(
    request,
    { requireOnboarding: true },
    async ({ userId }) => {
      try {
        await deleteAccount(userId);
        return success({ deleted: true });
      } catch {
        return failure(
          "INTERNAL_SERVER_ERROR",
          "Failed to delete account. Please try again.",
        );
      }
    },
  );
}
