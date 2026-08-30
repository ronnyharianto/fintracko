/**
 * PATCH /api/v1/workspaces/[id]/accounts/[accountId] — Update account
 */

import { NextRequest } from "next/server";
import { withPipeline } from "@/lib/api/pipeline";
import { success } from "@/lib/api/envelope";
import { updateAccount } from "@/features/accounts/services";
import { handleAccountErrors } from "@/features/accounts/errors";
import { UpdateAccountSchema } from "@/features/accounts/schemas";

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
    { schema: UpdateAccountSchema, requireOnboarding: true },
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
        NAME_TAKEN: {
          code: "CONFLICT",
          message: "An account with this name already exists.",
        },
      },
      "Failed to update account. Please try again.",
      async ({ userId }, data) => {
        const { accountId } = await params;
        const account = await updateAccount(userId, accountId, data);
        return success({ account });
      },
    ),
  );
}
