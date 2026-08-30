/**
 * Transaction CRUD service layer.
 *
 * All operations verify workspace membership before mutating.
 * Balance updates are atomic via Prisma $transaction blocks (§4).
 *
 * Business rules:
 * - INCOME → destinationAccountId required, adds to destination balance
 * - EXPENSE → sourceAccountId required, subtracts from source balance
 * - TRANSFER → both required, subtracts from source, adds to destination
 * - Amount can be positive or negative (supports investment tracking)
 * - Archived accounts/subcategories cannot be used for new transactions
 */

import { db } from "@/lib/db";
import { findWorkspaceMembership } from "@/lib/auth/membership";
import { TransactionType } from "../../../generated/prisma/enums";
import type { CreateTransactionInput, UpdateTransactionInput } from "./schemas";
import { TransactionServiceError } from "./errors";

/**
 * Verify the user is a member of the workspace, or throw FORBIDDEN.
 */
async function requireMembership(userId: string, workspaceId: string) {
  const membership = await findWorkspaceMembership(userId, workspaceId);
  if (!membership) {
    throw new TransactionServiceError("FORBIDDEN", "You are not a member of this workspace");
  }
  return membership;
}

/**
 * Calculate the balance effect of a transaction on its accounts.
 * Returns [sourceDelta, destinationDelta].
 */
function balanceEffect(type: TransactionType, amount: number): [number, number] {
  switch (type) {
    case TransactionType.INCOME:
      return [0, amount];
    case TransactionType.EXPENSE:
      return [-amount, 0];
    case TransactionType.TRANSFER:
      return [-amount, amount];
  }
}

/**
 * Retrieves transactions for a workspace with optional filters.
 */
export async function getTransactions(
  userId: string,
  workspaceId: string,
  filters?: {
    type?: TransactionType;
    subCategoryId?: string;
    accountId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  },
) {
  await requireMembership(userId, workspaceId);

  const where: Record<string, unknown> = { workspaceId };

  if (filters?.type) {
    where.type = filters.type;
  }
  if (filters?.subCategoryId) {
    where.subCategoryId = filters.subCategoryId;
  }
  if (filters?.accountId) {
    where.OR = [
      { sourceAccountId: filters.accountId },
      { destinationAccountId: filters.accountId },
    ];
  }
  if (filters?.from || filters?.to) {
    where.date = {};
    if (filters.from) {
      (where.date as Record<string, string>).gte = filters.from;
    }
    if (filters.to) {
      (where.date as Record<string, string>).lte = filters.to;
    }
  }

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 50;
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    db.financialTransaction.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        amount: true,
        date: true,
        subCategoryId: true,
        subCategory: { select: { name: true, category: { select: { name: true } } } },
        sourceAccountId: true,
        sourceAccount: { select: { name: true } },
        destinationAccountId: true,
        destinationAccount: { select: { name: true } },
        description: true,
        payeePayer: true,
        tags: true,
        attachmentUrl: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.financialTransaction.count({ where }),
  ]);

  return {
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount.toString(),
      date: t.date.toISOString().split("T")[0],
      subCategoryId: t.subCategoryId,
      subCategoryName: t.subCategory.name,
      categoryName: t.subCategory.category.name,
      sourceAccountId: t.sourceAccountId,
      sourceAccountName: t.sourceAccount?.name ?? null,
      destinationAccountId: t.destinationAccountId,
      destinationAccountName: t.destinationAccount?.name ?? null,
      description: t.description,
      payeePayer: t.payeePayer,
      tags: t.tags,
      attachmentUrl: t.attachmentUrl,
      createdById: t.createdById,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    total,
  };
}

/**
 * Creates a new transaction and atomically updates account balances.
 */
export async function createTransaction(
  userId: string,
  workspaceId: string,
  data: CreateTransactionInput,
) {
  await requireMembership(userId, workspaceId);

  // Validate subcategory exists, is not archived, and belongs to workspace
  const subCategory = await db.subCategory.findUnique({
    where: { id: data.subCategoryId },
    select: { id: true, workspaceId: true, isArchived: true },
  });

  if (!subCategory || subCategory.workspaceId !== workspaceId) {
    throw new TransactionServiceError("INVALID_CATEGORY", "Subcategory not found");
  }
  if (subCategory.isArchived) {
    throw new TransactionServiceError("INVALID_CATEGORY", "Cannot use an archived subcategory");
  }

  // Validate source account if provided
  if (data.sourceAccountId) {
    const sourceAccount = await db.financialAccount.findUnique({
      where: { id: data.sourceAccountId },
      select: { id: true, workspaceId: true, isArchived: true },
    });
    if (!sourceAccount || sourceAccount.workspaceId !== workspaceId) {
      throw new TransactionServiceError("INVALID_ACCOUNT", "Source account not found");
    }
    if (sourceAccount.isArchived) {
      throw new TransactionServiceError("INVALID_ACCOUNT", "Cannot use an archived source account");
    }
  }

  // Validate destination account if provided
  if (data.destinationAccountId) {
    const destAccount = await db.financialAccount.findUnique({
      where: { id: data.destinationAccountId },
      select: { id: true, workspaceId: true, isArchived: true },
    });
    if (!destAccount || destAccount.workspaceId !== workspaceId) {
      throw new TransactionServiceError("INVALID_ACCOUNT", "Destination account not found");
    }
    if (destAccount.isArchived) {
      throw new TransactionServiceError("INVALID_ACCOUNT", "Cannot use an archived destination account");
    }
  }

  // Validate source != destination
  if (data.sourceAccountId && data.destinationAccountId && data.sourceAccountId === data.destinationAccountId) {
    throw new TransactionServiceError("SOURCE_DESTINATION_SAME", "Source and destination accounts must be different");
  }

  const [sourceDelta, destDelta] = balanceEffect(data.type as TransactionType, data.amount);

  // Atomic: create transaction + update balances
  return db.$transaction(async (tx) => {
    const transaction = await tx.financialTransaction.create({
      data: {
        workspaceId,
        type: data.type as TransactionType,
        amount: data.amount,
        date: new Date(data.date),
        subCategoryId: data.subCategoryId,
        sourceAccountId: data.sourceAccountId ?? null,
        destinationAccountId: data.destinationAccountId ?? null,
        description: data.description ?? null,
        payeePayer: data.payeePayer ?? null,
        tags: data.tags ?? [],
        attachmentUrl: data.attachmentUrl ?? null,
        createdById: userId,
      },
      select: { id: true },
    });

    // Update source account balance
    if (data.sourceAccountId && sourceDelta !== 0) {
      await tx.financialAccount.update({
        where: { id: data.sourceAccountId },
        data: { netTransactionSum: { increment: sourceDelta } },
      });
    }

    // Update destination account balance
    if (data.destinationAccountId && destDelta !== 0) {
      await tx.financialAccount.update({
        where: { id: data.destinationAccountId },
        data: { netTransactionSum: { increment: destDelta } },
      });
    }

    return transaction;
  });
}

/**
 * Updates a transaction and atomically recalculates account balances.
 * Reverses the old balance effect, then applies the new one.
 */
export async function updateTransaction(
  userId: string,
  transactionId: string,
  data: UpdateTransactionInput,
) {
  const existing = await db.financialTransaction.findUnique({
    where: { id: transactionId },
    select: {
      id: true,
      workspaceId: true,
      type: true,
      amount: true,
      sourceAccountId: true,
      destinationAccountId: true,
    },
  });

  if (!existing) {
    throw new TransactionServiceError("TRANSACTION_NOT_FOUND", "Transaction not found");
  }

  await requireMembership(userId, existing.workspaceId);

  // Merge: use new values or fall back to existing
  const newType = existing.type; // type is not editable
  const newAmount = data.amount ?? existing.amount;
  const newSourceId = data.sourceAccountId !== undefined ? data.sourceAccountId : existing.sourceAccountId;
  const newDestId = data.destinationAccountId !== undefined ? data.destinationAccountId : existing.destinationAccountId;

  // Validate new accounts if changed
  if (data.sourceAccountId !== undefined && data.sourceAccountId) {
    const sourceAccount = await db.financialAccount.findUnique({
      where: { id: data.sourceAccountId },
      select: { id: true, workspaceId: true, isArchived: true },
    });
    if (!sourceAccount || sourceAccount.workspaceId !== existing.workspaceId) {
      throw new TransactionServiceError("INVALID_ACCOUNT", "Source account not found");
    }
    if (sourceAccount.isArchived) {
      throw new TransactionServiceError("INVALID_ACCOUNT", "Cannot use an archived source account");
    }
  }

  if (data.destinationAccountId !== undefined && data.destinationAccountId) {
    const destAccount = await db.financialAccount.findUnique({
      where: { id: data.destinationAccountId },
      select: { id: true, workspaceId: true, isArchived: true },
    });
    if (!destAccount || destAccount.workspaceId !== existing.workspaceId) {
      throw new TransactionServiceError("INVALID_ACCOUNT", "Destination account not found");
    }
    if (destAccount.isArchived) {
      throw new TransactionServiceError("INVALID_ACCOUNT", "Cannot use an archived destination account");
    }
  }

  if (data.subCategoryId) {
    const subCategory = await db.subCategory.findUnique({
      where: { id: data.subCategoryId },
      select: { id: true, workspaceId: true, isArchived: true },
    });
    if (!subCategory || subCategory.workspaceId !== existing.workspaceId) {
      throw new TransactionServiceError("INVALID_CATEGORY", "Subcategory not found");
    }
    if (subCategory.isArchived) {
      throw new TransactionServiceError("INVALID_CATEGORY", "Cannot use an archived subcategory");
    }
  }

  // Validate source != destination
  if (newSourceId && newDestId && newSourceId === newDestId) {
    throw new TransactionServiceError("SOURCE_DESTINATION_SAME", "Source and destination accounts must be different");
  }

  const [oldSourceDelta, oldDestDelta] = balanceEffect(existing.type, Number(existing.amount));
  const [newSourceDelta, newDestDelta] = balanceEffect(newType, Number(newAmount));

  return db.$transaction(async (tx) => {
    // Reverse old balance effect
    if (existing.sourceAccountId && oldSourceDelta !== 0) {
      await tx.financialAccount.update({
        where: { id: existing.sourceAccountId },
        data: { netTransactionSum: { increment: -oldSourceDelta } },
      });
    }
    if (existing.destinationAccountId && oldDestDelta !== 0) {
      await tx.financialAccount.update({
        where: { id: existing.destinationAccountId },
        data: { netTransactionSum: { increment: -oldDestDelta } },
      });
    }

    // Update the transaction
    await tx.financialTransaction.update({
      where: { id: transactionId },
      data: {
        amount: newAmount,
        date: data.date ? new Date(data.date) : undefined,
        subCategoryId: data.subCategoryId,
        sourceAccountId: newSourceId ?? null,
        destinationAccountId: newDestId ?? null,
        description: data.description,
        payeePayer: data.payeePayer,
        tags: data.tags,
        attachmentUrl: data.attachmentUrl,
        updatedById: userId,
      },
    });

    // Apply new balance effect
    if (newSourceId && newSourceDelta !== 0) {
      await tx.financialAccount.update({
        where: { id: newSourceId },
        data: { netTransactionSum: { increment: newSourceDelta } },
      });
    }
    if (newDestId && newDestDelta !== 0) {
      await tx.financialAccount.update({
        where: { id: newDestId },
        data: { netTransactionSum: { increment: newDestDelta } },
      });
    }

    return { id: transactionId };
  });
}

/**
 * Deletes a transaction and atomically reverses its balance effect.
 */
export async function deleteTransaction(userId: string, transactionId: string) {
  const existing = await db.financialTransaction.findUnique({
    where: { id: transactionId },
    select: {
      id: true,
      workspaceId: true,
      type: true,
      amount: true,
      sourceAccountId: true,
      destinationAccountId: true,
    },
  });

  if (!existing) {
    throw new TransactionServiceError("TRANSACTION_NOT_FOUND", "Transaction not found");
  }

  await requireMembership(userId, existing.workspaceId);

  const [sourceDelta, destDelta] = balanceEffect(existing.type, Number(existing.amount));

  return db.$transaction(async (tx) => {
    // Reverse balance effect
    if (existing.sourceAccountId && sourceDelta !== 0) {
      await tx.financialAccount.update({
        where: { id: existing.sourceAccountId },
        data: { netTransactionSum: { increment: -sourceDelta } },
      });
    }
    if (existing.destinationAccountId && destDelta !== 0) {
      await tx.financialAccount.update({
        where: { id: existing.destinationAccountId },
        data: { netTransactionSum: { increment: -destDelta } },
      });
    }

    // Delete the transaction
    await tx.financialTransaction.delete({ where: { id: transactionId } });

    return { deleted: true };
  });
}
