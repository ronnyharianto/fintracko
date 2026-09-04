/**
 * GET  /api/v1/workspaces/[id]/transactions — List transactions
 * POST /api/v1/workspaces/[id]/transactions — Create transaction
 */

import { NextRequest } from "next/server";
import { withPipeline } from "@/lib/api/pipeline";
import { success, failure } from "@/lib/api/envelope";
import { getTransactions, createTransaction } from "@/features/transactions/services";
import { handleTransactionErrors } from "@/features/transactions/errors";
import { CreateTransactionSchema, TransactionQuerySchema } from "@/features/transactions/schemas";
import type { TransactionType } from "../../../../../../../generated/prisma/enums";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withPipeline(
    request,
    { requireOnboarding: true },
    handleTransactionErrors(
      {
        FORBIDDEN: {
          code: "FORBIDDEN",
          message: "You are not a member of this workspace.",
        },
      },
      "Failed to load transactions. Please try again.",
      async ({ userId }) => {
        const { id: workspaceId } = await params;
        const { searchParams } = new URL(request.url);

        const parsedQuery = TransactionQuerySchema.safeParse(Object.fromEntries(searchParams));
        if (!parsedQuery.success) {
          return failure("VALIDATION_ERROR", "Invalid transaction filters.");
        }
        const { type, subCategoryId, accountId, from, to, page, limit } = parsedQuery.data;

        const result = await getTransactions(userId, workspaceId, {
          type: type as TransactionType | undefined,
          subCategoryId,
          accountId,
          from,
          to,
          page,
          limit,
        });

        return success(result);
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
    { schema: CreateTransactionSchema, requireOnboarding: true },
    handleTransactionErrors(
      {
        FORBIDDEN: {
          code: "FORBIDDEN",
          message: "You are not a member of this workspace.",
        },
        INVALID_ACCOUNT: {
          code: "BAD_REQUEST",
          message: "Invalid or archived account.",
        },
        INVALID_CATEGORY: {
          code: "BAD_REQUEST",
          message: "Invalid or archived subcategory.",
        },
        SOURCE_DESTINATION_SAME: {
          code: "BAD_REQUEST",
          message: "Source and destination accounts must be different.",
        },
      },
      "Failed to create transaction. Please try again.",
      async ({ userId }, data) => {
        const { id: workspaceId } = await params;
        const result = await createTransaction(userId, workspaceId, data);
        return success({ transaction: result });
      },
    ),
  );
}
