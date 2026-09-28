/**
 * PATCH /api/v1/workspaces/[id]/accounts/[accountId]/archive — Archive account
 */

import { NextRequest } from "next/server";
import { withPipeline } from "@/lib/api/pipeline";
import { success } from "@/lib/api/envelope";
import { archiveAccount } from "@/features/accounts/services";
import { handleAccountErrors } from "@/features/accounts/errors";

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; accountId: string }>;
  },
) {
  return withPipeline(
    request,
    { requireOnboarding: true },
    handleAccountErrors(
      {
        FORBIDDEN: {
          code: "FORBIDDEN",
          message: "You are not a member of this workspace.",
        },
        ACCOUNT_NOT_FOUND: {
          code: "NOT_FOUND",
          message: "Account not found.",
        },
      },
      "Failed to archive account. Please try again.",
      async ({ userId }) => {
        const { id: workspaceId, accountId } = await params;
        const result = await archiveAccount(userId, workspaceId, accountId);
        return success(result);
      },
    ),
  );
}
