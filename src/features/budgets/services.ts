/**
 * Budget CRUD service layer.
 *
 * All operations verify workspace membership before reading or mutating.
 * Business rules:
 * - A budget targets a Level 2 subcategory whose parent category is EXPENSE
 * - `interval` is fixed at creation; amount, period, and target are editable
 * - No two budgets for the same subcategory may cover an overlapping day
 * - Utilization is the net EXPENSE total within the inclusive period
 * - Hard delete is allowed; budgets are not referenced by transactions
 */

import { db } from "@/lib/db";
import { findWorkspaceMembership } from "@/lib/auth/membership";
import { toISODate } from "@/lib/date-period";
import {
  BudgetInterval,
  TransactionType,
} from "../../../generated/prisma/enums";
import type { CreateBudgetInput, UpdateBudgetInput } from "./schemas";
import { BudgetServiceError } from "./errors";
import { budgetStatus, computeUtilization, isPeriodAligned } from "./utilization";
import type { BudgetStatus, BudgetView } from "./types";

/** Row shape selected from Prisma for a budget view. */
interface BudgetRow {
  id: string;
  subCategoryId: string;
  amount: unknown;
  interval: BudgetInterval;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
  subCategory: {
    name: string;
    categoryId: string;
    category: { name: string };
  };
}

/** Shared select so every read returns the fields the view needs. */
const budgetSelect = {
  id: true,
  subCategoryId: true,
  amount: true,
  interval: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  updatedAt: true,
  subCategory: {
    select: {
      name: true,
      categoryId: true,
      category: { select: { name: true } },
    },
  },
} as const;

/** Verify the user is a member of the workspace, or throw FORBIDDEN. */
async function requireMembership(userId: string, workspaceId: string) {
  const membership = await findWorkspaceMembership(userId, workspaceId);
  if (!membership) {
    throw new BudgetServiceError(
      "FORBIDDEN",
      "You are not a member of this workspace",
    );
  }
  return membership;
}

/**
 * Validate that a subcategory exists in the workspace, is not archived, and
 * belongs to a non-archived EXPENSE category.
 */
async function requireExpenseSubCategory(
  workspaceId: string,
  subCategoryId: string,
) {
  const subCategory = await db.subCategory.findUnique({
    where: { id: subCategoryId },
    select: {
      id: true,
      workspaceId: true,
      isArchived: true,
      category: { select: { isArchived: true, type: true } },
    },
  });

  if (!subCategory || subCategory.workspaceId !== workspaceId) {
    throw new BudgetServiceError(
      "INVALID_SUBCATEGORY",
      "Subcategory not found",
    );
  }
  if (subCategory.isArchived || subCategory.category.isArchived) {
    throw new BudgetServiceError(
      "INVALID_SUBCATEGORY",
      "Cannot create a budget for an archived subcategory",
    );
  }
  if (subCategory.category.type !== TransactionType.EXPENSE) {
    throw new BudgetServiceError(
      "INVALID_SUBCATEGORY",
      "Budgets can only target expense subcategories",
    );
  }

  return subCategory;
}

/** Net EXPENSE total for a subcategory within an inclusive period. */
async function computeSpent(
  workspaceId: string,
  subCategoryId: string,
  startDate: Date,
  endDate: Date,
): Promise<string> {
  const aggregate = await db.financialTransaction.aggregate({
    where: {
      workspaceId,
      type: TransactionType.EXPENSE,
      subCategoryId,
      date: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
  });

  return aggregate._sum.amount ? aggregate._sum.amount.toString() : "0";
}

/** Project a Prisma budget row plus its spent total into a client view. */
function toView(row: BudgetRow, spent: string): BudgetView {
  const startDate = toISODate(row.startDate);
  const endDate = toISODate(row.endDate);
  const amount = String(row.amount);

  return {
    id: row.id,
    subCategoryId: row.subCategoryId,
    subCategoryName: row.subCategory.name,
    categoryId: row.subCategory.categoryId,
    categoryName: row.subCategory.category.name,
    amount,
    interval: row.interval,
    startDate,
    endDate,
    spent,
    utilization: computeUtilization(spent, amount),
    status: budgetStatus(startDate, endDate),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Retrieves budgets for a workspace with computed utilization.
 * Optional filters: `interval` and derived `status`.
 */
export async function getBudgets(
  userId: string,
  workspaceId: string,
  filters?: { interval?: BudgetInterval; status?: BudgetStatus },
) {
  await requireMembership(userId, workspaceId);

  const budgets = await db.budget.findMany({
    where: {
      workspaceId,
      ...(filters?.interval ? { interval: filters.interval } : {}),
    },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    select: budgetSelect,
  });

  const views = await Promise.all(
    budgets.map(async (budget) => {
      const spent = await computeSpent(
        workspaceId,
        budget.subCategoryId,
        budget.startDate,
        budget.endDate,
      );
      return toView(budget, spent);
    }),
  );

  const filtered = filters?.status
    ? views.filter((view) => view.status === filters.status)
    : views;

  return { budgets: filtered, total: filtered.length };
}

/** Retrieves one budget scoped by both workspace and budget id. */
export async function getBudget(
  userId: string,
  workspaceId: string,
  budgetId: string,
) {
  await requireMembership(userId, workspaceId);

  const budget = await db.budget.findFirst({
    where: { id: budgetId, workspaceId },
    select: budgetSelect,
  });

  if (!budget) {
    throw new BudgetServiceError("BUDGET_NOT_FOUND", "Budget not found");
  }

  const spent = await computeSpent(
    workspaceId,
    budget.subCategoryId,
    budget.startDate,
    budget.endDate,
  );

  return toView(budget, spent);
}

/**
 * Creates a budget. The overlap guard and the insert run in one transaction so
 * the check cannot observe a partially applied competing write.
 */
export async function createBudget(
  userId: string,
  workspaceId: string,
  data: CreateBudgetInput,
) {
  await requireMembership(userId, workspaceId);
  await requireExpenseSubCategory(workspaceId, data.subCategoryId);

  if (
    !isPeriodAligned(
      data.interval as BudgetInterval,
      data.startDate,
      data.endDate,
    )
  ) {
    throw new BudgetServiceError(
      "INVALID_PERIOD",
      "The budget period is not aligned to the selected interval",
    );
  }

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  const created = await db.$transaction(async (tx) => {
    const overlap = await tx.budget.count({
      where: {
        workspaceId,
        subCategoryId: data.subCategoryId,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    if (overlap > 0) {
      throw new BudgetServiceError(
        "OVERLAPPING_BUDGET",
        "This subcategory already has a budget covering part of this period",
      );
    }

    return tx.budget.create({
      data: {
        workspaceId,
        subCategoryId: data.subCategoryId,
        amount: data.amount,
        interval: data.interval as BudgetInterval,
        startDate,
        endDate,
      },
      select: budgetSelect,
    });
  });

  const spent = await computeSpent(
    workspaceId,
    created.subCategoryId,
    created.startDate,
    created.endDate,
  );

  return toView(created, spent);
}

/**
 * Updates a budget's amount, period, or target subcategory.
 * `interval` is immutable and is never read from the payload.
 */
export async function updateBudget(
  userId: string,
  workspaceId: string,
  budgetId: string,
  data: UpdateBudgetInput,
) {
  await requireMembership(userId, workspaceId);

  const existing = await db.budget.findFirst({
    where: { id: budgetId, workspaceId },
    select: {
      id: true,
      subCategoryId: true,
      interval: true,
      startDate: true,
      endDate: true,
    },
  });

  if (!existing) {
    throw new BudgetServiceError("BUDGET_NOT_FOUND", "Budget not found");
  }

  const subCategoryId = data.subCategoryId ?? existing.subCategoryId;
  const startDate = data.startDate ?? toISODate(existing.startDate);
  const endDate = data.endDate ?? toISODate(existing.endDate);

  await requireExpenseSubCategory(workspaceId, subCategoryId);

  if (!isPeriodAligned(existing.interval, startDate, endDate)) {
    throw new BudgetServiceError(
      "INVALID_PERIOD",
      "The budget period is not aligned to the selected interval",
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  const updated = await db.$transaction(async (tx) => {
    const overlap = await tx.budget.count({
      where: {
        workspaceId,
        subCategoryId,
        id: { not: budgetId },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });

    if (overlap > 0) {
      throw new BudgetServiceError(
        "OVERLAPPING_BUDGET",
        "This subcategory already has a budget covering part of this period",
      );
    }

    return tx.budget.update({
      where: { id: budgetId },
      data: {
        subCategoryId,
        startDate: start,
        endDate: end,
        ...(data.amount !== undefined ? { amount: data.amount } : {}),
      },
      select: budgetSelect,
    });
  });

  const spent = await computeSpent(
    workspaceId,
    updated.subCategoryId,
    updated.startDate,
    updated.endDate,
  );

  return toView(updated, spent);
}

/** Deletes a budget scoped by both workspace and budget id. */
export async function deleteBudget(
  userId: string,
  workspaceId: string,
  budgetId: string,
) {
  await requireMembership(userId, workspaceId);

  const existing = await db.budget.findFirst({
    where: { id: budgetId, workspaceId },
    select: { id: true },
  });

  if (!existing) {
    throw new BudgetServiceError("BUDGET_NOT_FOUND", "Budget not found");
  }

  await db.budget.delete({ where: { id: budgetId } });

  return { deleted: true };
}
