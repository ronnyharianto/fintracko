/**
 * GET  /api/v1/workspaces/[id]/accounts/[accountId] — Get account
 * PATCH /api/v1/workspaces/[id]/accounts/[accountId] — Update account
 */

import { NextRequest } from "next/server";
import { withPipeline } from "@/lib/api/pipeline";
import { success } from "@/lib/api/envelope";
import { getAccount, updateAccount } from "@/features/accounts/services";
import { handleAccountErrors } from "@/features/accounts/errors";
import { UpdateAccountSchema } from "@/features/accounts/schemas";

export async function GET(
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
      "Failed to load the account. Please try again.",
      async ({ userId }) => {
        const { id: workspaceId, accountId } = await params;
        const account = await getAccount(userId, workspaceId, accountId);
        return success({ account });
      },
    ),
  );
}

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
        const { id: workspaceId, accountId } = await params;
        const account = await updateAccount(userId, workspaceId, accountId, data);
        return success({ account });
      },
    ),
  );
}
