/**
 * DELETE /api/v1/account
 *
 * Permanently deletes the authenticated user's account.
 * Owned workspaces are fully destroyed; collaborator workspaces retain data.
 * This is irreversible — there is no recovery path or soft-delete window.
 *
 * Requires an `x-deletion-confirmation` header carrying the token returned by
 * `POST /api/v1/deletion-tokens` with `{ "scope": "ACCOUNT" }`. The token is
 * bound to this user, this scope, and expires after five minutes, so a stray
 * request or a page riding the session cookie cannot delete the account.
 */

import { NextRequest } from "next/server";
import { withPipeline } from "@/lib/api/pipeline";
import { success, failure } from "@/lib/api/envelope";
import { hasValidDeletionToken } from "@/lib/deletion-confirmation";
import { deleteAccount } from "@/features/account/services";

export async function DELETE(request: NextRequest) {
  const confirmation = request.headers.get("x-deletion-confirmation");

  return withPipeline(
    request,
    { requireOnboarding: true },
    async ({ userId }) => {
      if (
        !hasValidDeletionToken(
          confirmation,
          { scope: "ACCOUNT", userId },
          userId,
        )
      ) {
        return failure(
          "FORBIDDEN",
          "Deletion confirmation is missing or expired. Please confirm the deletion again.",
        );
      }

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
