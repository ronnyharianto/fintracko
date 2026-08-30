/**
 * GET  /api/v1/workspaces/[id]/accounts — List accounts
 * POST /api/v1/workspaces/[id]/accounts — Create account
 */

import { NextRequest } from "next/server";
import { withPipeline } from "@/lib/api/pipeline";
import { success } from "@/lib/api/envelope";
import { getAccounts, createAccount } from "@/features/accounts/services";
import { handleAccountErrors } from "@/features/accounts/errors";
import { CreateAccountSchema } from "@/features/accounts/schemas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
      },
      "Failed to load accounts. Please try again.",
      async ({ userId }) => {
        const { id: workspaceId } = await params;
        const accounts = await getAccounts(userId, workspaceId);
        return success({ accounts });
      },
    ),
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withPipeline(
    request,
    { schema: CreateAccountSchema, requireOnboarding: true },
    handleAccountErrors(
      {
        FORBIDDEN: {
          code: "FORBIDDEN",
          message: "You are not a member of this workspace.",
        },
        NAME_TAKEN: {
          code: "CONFLICT",
          message: "An account with this name already exists.",
        },
      },
      "Failed to create account. Please try again.",
      async ({ userId }, data) => {
        const { id: workspaceId } = await params;
        const account = await createAccount(userId, workspaceId, data);
        return success({ account });
      },
    ),
  );
}
