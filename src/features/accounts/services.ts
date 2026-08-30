/**
 * Account CRUD service layer.
 *
 * All operations verify workspace membership before mutating.
 * Business rules:
 * - Account name unique per workspace
 * - Account type fixed at creation
 * - No hard delete — archive/unarchive only
 * - Final balance = initialBalance + netTransactionSum
 */

import { db } from "@/lib/db";
import type { AccountType } from "../../../generated/prisma/enums";
import type { CreateAccountInput, UpdateAccountInput } from "./schemas";
import { AccountServiceError } from "./errors";

/**
 * Verify the user is a member of the given workspace.
 * Returns the membership if found, otherwise throws FORBIDDEN.
 */
async function requireMembership(userId: string, workspaceId: string) {
  const membership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
    select: { id: true },
  });

  if (!membership) {
    throw new AccountServiceError("FORBIDDEN", "You are not a member of this workspace");
  }

  return membership;
}

/**
 * Retrieves all accounts for a workspace, ordered by creation date.
 */
export async function getAccounts(userId: string, workspaceId: string) {
  await requireMembership(userId, workspaceId);

  return db.financialAccount.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      initialBalance: true,
      netTransactionSum: true,
      isArchived: true,
      createdAt: true,
    },
  });
}

/**
 * Creates a new account in the workspace.
 * Validates membership and unique name within the workspace.
 */
export async function createAccount(
  userId: string,
  workspaceId: string,
  data: CreateAccountInput,
) {
  await requireMembership(userId, workspaceId);

  const existing = await db.financialAccount.findUnique({
    where: {
      workspaceId_name: { workspaceId, name: data.name },
    },
    select: { id: true },
  });

  if (existing) {
    throw new AccountServiceError("NAME_TAKEN", "An account with this name already exists");
  }

  return db.financialAccount.create({
    data: {
      workspaceId,
      name: data.name,
      type: data.type as AccountType,
      initialBalance: data.initialBalance,
    },
    select: {
      id: true,
      name: true,
      type: true,
      initialBalance: true,
      netTransactionSum: true,
      isArchived: true,
      createdAt: true,
    },
  });
}

/**
 * Updates an account's name and/or initial balance.
 * Validates membership, unique name if changed, and that account exists.
 */
export async function updateAccount(
  userId: string,
  accountId: string,
  data: UpdateAccountInput,
) {
  const account = await db.financialAccount.findUnique({
    where: { id: accountId },
    select: { id: true, workspaceId: true, name: true },
  });

  if (!account) {
    throw new AccountServiceError("ACCOUNT_NOT_FOUND", "Account not found");
  }

  await requireMembership(userId, account.workspaceId);

  if (data.name !== account.name) {
    const existing = await db.financialAccount.findUnique({
      where: {
        workspaceId_name: { workspaceId: account.workspaceId, name: data.name },
      },
      select: { id: true },
    });

    if (existing) {
      throw new AccountServiceError("NAME_TAKEN", "An account with this name already exists");
    }
  }

  return db.financialAccount.update({
    where: { id: accountId },
    data: {
      name: data.name,
      initialBalance: data.initialBalance,
    },
    select: {
      id: true,
      name: true,
      type: true,
      initialBalance: true,
      netTransactionSum: true,
      isArchived: true,
      createdAt: true,
    },
  });
}

/**
 * Archives an account (hides from active list and transaction dropdowns).
 */
export async function archiveAccount(userId: string, accountId: string) {
  const account = await db.financialAccount.findUnique({
    where: { id: accountId },
    select: { id: true, workspaceId: true },
  });

  if (!account) {
    throw new AccountServiceError("ACCOUNT_NOT_FOUND", "Account not found");
  }

  await requireMembership(userId, account.workspaceId);

  return db.financialAccount.update({
    where: { id: accountId },
    data: { isArchived: true },
    select: { id: true, isArchived: true },
  });
}

/**
 * Unarchives an account (restores to active list).
 */
export async function unarchiveAccount(userId: string, accountId: string) {
  const account = await db.financialAccount.findUnique({
    where: { id: accountId },
    select: { id: true, workspaceId: true },
  });

  if (!account) {
    throw new AccountServiceError("ACCOUNT_NOT_FOUND", "Account not found");
  }

  await requireMembership(userId, account.workspaceId);

  return db.financialAccount.update({
    where: { id: accountId },
    data: { isArchived: false },
    select: { id: true, isArchived: true },
  });
}
