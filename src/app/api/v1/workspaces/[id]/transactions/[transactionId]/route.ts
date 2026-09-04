/**
 * GET    /api/v1/workspaces/[id]/transactions/[transactionId] — Get transaction
 * PATCH  /api/v1/workspaces/[id]/transactions/[transactionId] — Update transaction
 * DELETE /api/v1/workspaces/[id]/transactions/[transactionId] — Delete transaction
 */

import { NextRequest } from "next/server";
import { withPipeline } from "@/lib/api/pipeline";
import { success } from "@/lib/api/envelope";
import { getTransaction, updateTransaction, deleteTransaction } from "@/features/transactions/services";
import { handleTransactionErrors } from "@/features/transactions/errors";
import { UpdateTransactionSchema } from "@/features/transactions/schemas";

const errorMappings = {
  FORBIDDEN: {
    code: "FORBIDDEN" as const,
    message: "You are not a member of this workspace.",
  },
  TRANSACTION_NOT_FOUND: {
    code: "NOT_FOUND" as const,
    message: "Transaction not found.",
  },
  INVALID_ACCOUNT: {
    code: "BAD_REQUEST" as const,
    message: "Invalid or archived account.",
  },
  INVALID_CATEGORY: {
    code: "BAD_REQUEST" as const,
    message: "Invalid or archived subcategory.",
  },
  SOURCE_DESTINATION_SAME: {
    code: "BAD_REQUEST" as const,
    message: "Source and destination accounts must be different.",
  },
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; transactionId: string }> },
) {
  return withPipeline(
    _request,
    { requireOnboarding: true },
    handleTransactionErrors(
      errorMappings,
      "Failed to load transaction. Please try again.",
      async ({ userId }) => {
        const { id: workspaceId, transactionId } = await params;
        const transaction = await getTransaction(userId, workspaceId, transactionId);

        if (!transaction) {
          return success({ transaction: null });
        }

        return success({
          transaction: {
            id: transaction.id,
            type: transaction.type,
            amount: transaction.amount.toString(),
            date: transaction.date.toISOString().split("T")[0],
            subCategoryId: transaction.subCategoryId,
            subCategoryName: transaction.subCategory.name,
            categoryName: transaction.subCategory.category.name,
            sourceAccountId: transaction.sourceAccountId,
            sourceAccountName: transaction.sourceAccount?.name ?? null,
            destinationAccountId: transaction.destinationAccountId,
            destinationAccountName: transaction.destinationAccount?.name ?? null,
            description: transaction.description,
            payeePayer: transaction.payeePayer,
            tags: transaction.tags,
            attachmentUrl: transaction.attachmentUrl,
            createdById: transaction.createdById,
            createdAt: transaction.createdAt.toISOString(),
            updatedAt: transaction.updatedAt.toISOString(),
          },
        });
      },
    ),
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; transactionId: string }> },
) {
  return withPipeline(
    request,
    { schema: UpdateTransactionSchema, requireOnboarding: true },
    handleTransactionErrors(
      errorMappings,
      "Failed to update transaction. Please try again.",
      async ({ userId }, data) => {
        const { id: workspaceId, transactionId } = await params;
        const result = await updateTransaction(userId, workspaceId, transactionId, data);
        return success({ transaction: result });
      },
    ),
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; transactionId: string }> },
) {
  return withPipeline(
    request,
    { requireOnboarding: true },
    handleTransactionErrors(
      errorMappings,
      "Failed to delete transaction. Please try again.",
      async ({ userId }) => {
        const { id: workspaceId, transactionId } = await params;
        const result = await deleteTransaction(userId, workspaceId, transactionId);
        return success(result);
      },
    ),
  );
}
