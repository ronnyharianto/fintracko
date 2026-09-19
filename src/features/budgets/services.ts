/**
 * Budget CRUD service layer.
 *
 * A budget is a range of interval-aligned periods, each carrying its own
 * per-period limit. Recurring budgets are simply ranges that span many periods
 * — nothing is materialized per period.
 *
 * Business rules:
 * - A budget targets a Level 2 subcategory whose parent category is EXPENSE
 * - `interval` is fixed at creation; amount and range are editable
 * - Ranges must be period-aligned and must not overlap for the same subcategory
 * - Utilization is measured against the periods the viewed window resolves to
 * - Hard delete is allowed; budgets are not referenced by transactions
 */

import { db } from "@/lib/db";
import { findWorkspaceMembership } from "@/lib/auth/membership";
import {
  BudgetInterval,
  TransactionType,
} from "../../../generated/prisma/enums";
import type { CreateBudgetInput, UpdateBudgetInput } from "./schemas";
import { BudgetServiceError } from "./errors";
import {
  OPEN_ENDED_DATE,
  budgetStatus,
  computeUtilization,
  isPeriodStart,
  isRangeAligned,
  previousDay,
  resolvePeriods,
} from "./utilization";
import type { BudgetStatus, BudgetView } from "./types";

/** Aligned periods a budget covers for a given view. */
type ResolvedPeriods = NonNullable<ReturnType<typeof resolvePeriods>>;

/**
 * Minimal structural view of Prisma's Decimal so the service can do exact
 * decimal math without importing the generated runtime.
 */
interface DecimalLike {
  toString(): string;
  mul(value: number): DecimalLike;
}

/** Row shape selected from Prisma for a budget view. */
interface BudgetRow {
  id: string;
  subCategoryId: string;
  amount: DecimalLike;
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

/**
 * Serialize a date-only column. Prisma hands back `@db.Date` values at UTC
 * midnight, so the ISO date must be read in UTC — local getters would shift the
 * day in negative-offset timezones.
 */
function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

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

/** Net EXPENSE total for a subcategory within an inclusive date range. */
async function computeSpent(
  workspaceId: string,
  subCategoryId: string,
  from: string,
  to: string,
): Promise<string> {
  const aggregate = await db.financialTransaction.aggregate({
    where: {
      workspaceId,
      type: TransactionType.EXPENSE,
      subCategoryId,
      date: { gte: new Date(from), lte: new Date(to) },
    },
    _sum: { amount: true },
  });

  return aggregate._sum.amount ? aggregate._sum.amount.toString() : "0";
}

/** The periods a row covers, resolved against its own range. */
function ownRange(row: {
  interval: BudgetInterval;
  startDate: Date;
  endDate: Date;
}): ResolvedPeriods {
  const start = isoDate(row.startDate);
  const end = isoDate(row.endDate);

  return (
    resolvePeriods(row.interval, start, end, start, end) ?? {
      count: 1,
      rangeStart: start,
      rangeEnd: end,
    }
  );
}

/** Project a Prisma budget row into the client view for a resolved window. */
function toView(
  row: BudgetRow,
  resolved: ResolvedPeriods,
  spent: string,
): BudgetView {
  const startDate = isoDate(row.startDate);
  const endDate = isoDate(row.endDate);
  const amount = row.amount.toString();
  const limit = row.amount.mul(resolved.count).toString();

  return {
    id: row.id,
    subCategoryId: row.subCategoryId,
    subCategoryName: row.subCategory.name,
    categoryId: row.subCategory.categoryId,
    categoryName: row.subCategory.category.name,
    amount,
    periods: resolved.count,
    limit,
    interval: row.interval,
    startDate,
    endDate,
    periodStart: resolved.rangeStart,
    periodEnd: resolved.rangeEnd,
    spent,
    utilization: computeUtilization(spent, limit),
    status: budgetStatus(startDate, endDate),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Resolve a row against a window and load its spend, or null when out of view. */
async function buildView(
  workspaceId: string,
  row: BudgetRow,
  windowFrom: string,
  windowTo: string,
): Promise<BudgetView | null> {
  const resolved = resolvePeriods(
    row.interval,
    isoDate(row.startDate),
    isoDate(row.endDate),
    windowFrom,
    windowTo,
  );

  if (!resolved) return null;

  const spent = await computeSpent(
    workspaceId,
    row.subCategoryId,
    resolved.rangeStart,
    resolved.rangeEnd,
  );

  return toView(row, resolved, spent);
}

/**
 * Retrieves the budgets reaching into a viewed window, with a limit and spend
 * resolved against that window's periods.
 */
export async function getBudgets(
  userId: string,
  workspaceId: string,
  filters?: {
    from?: string;
    to?: string;
    interval?: BudgetInterval;
    status?: BudgetStatus;
  },
) {
  await requireMembership(userId, workspaceId);

  const today = isoDate(new Date());
  const windowFrom = filters?.from ?? today;
  const windowTo = filters?.to ?? today;

  const budgets = await db.budget.findMany({
    where: {
      workspaceId,
      ...(filters?.interval ? { interval: filters.interval } : {}),
      startDate: { lte: new Date(windowTo) },
      endDate: { gte: new Date(windowFrom) },
    },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    select: budgetSelect,
  });

  const views = await Promise.all(
    budgets.map((budget) => buildView(workspaceId, budget, windowFrom, windowTo)),
  );

  const resolved = views.filter((view): view is BudgetView => view !== null);
  const filtered = filters?.status
    ? resolved.filter((view) => view.status === filters.status)
    : resolved;

  const totalInWorkspace = await db.budget.count({ where: { workspaceId } });

  return { budgets: filtered, total: filtered.length, totalInWorkspace };
}

/** Retrieves one budget scoped by both workspace and budget id. */
export async function getBudget(
  userId: string,
  workspaceId: string,
  budgetId: string,
  window?: { from?: string; to?: string },
) {
  await requireMembership(userId, workspaceId);

  const budget = await db.budget.findFirst({
    where: { id: budgetId, workspaceId },
    select: budgetSelect,
  });

  if (!budget) {
    throw new BudgetServiceError("BUDGET_NOT_FOUND", "Budget not found");
  }

  const today = isoDate(new Date());
  const view = await buildView(
    workspaceId,
    budget,
    window?.from ?? today,
    window?.to ?? today,
  );

  if (view) return view;

  // The budget exists but does not reach into the requested window: still
  // report it, measured against its own range.
  const own = ownRange(budget);
  const spent = await computeSpent(
    workspaceId,
    budget.subCategoryId,
    own.rangeStart,
    own.rangeEnd,
  );

  return toView(budget, own, spent);
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

  const startDate = data.startDate;
  const endDate = data.endDate ?? OPEN_ENDED_DATE;

  if (!isRangeAligned(data.interval as BudgetInterval, startDate, endDate)) {
    throw new BudgetServiceError(
      "INVALID_PERIOD",
      "The budget range is not aligned to the selected interval",
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  const created = await db.$transaction(async (tx) => {
    const overlap = await tx.budget.count({
      where: {
        workspaceId,
        subCategoryId: data.subCategoryId,
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });

    if (overlap > 0) {
      throw new BudgetServiceError(
        "OVERLAPPING_BUDGET",
        "This subcategory already has a budget covering part of this range",
      );
    }

    return tx.budget.create({
      data: {
        workspaceId,
        subCategoryId: data.subCategoryId,
        amount: data.amount,
        interval: data.interval as BudgetInterval,
        startDate: start,
        endDate: end,
      },
      select: budgetSelect,
    });
  });

  const today = isoDate(new Date());
  const view = await buildView(workspaceId, created, today, today);

  if (view) return view;

  const own = ownRange(created);
  const spent = await computeSpent(
    workspaceId,
    created.subCategoryId,
    own.rangeStart,
    own.rangeEnd,
  );

  return toView(created, own, spent);
}

/**
 * Updates a budget's amount, range, or target subcategory. `interval` is
 * immutable and is never read from the payload.
 *
 * When `splitFrom` is supplied the earlier periods are preserved: the current
 * range is ended the day before `splitFrom` and a new range starts there with
 * the new values. Both writes happen in one transaction.
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
      amount: true,
      interval: true,
      startDate: true,
      endDate: true,
    },
  });

  if (!existing) {
    throw new BudgetServiceError("BUDGET_NOT_FOUND", "Budget not found");
  }

  const subCategoryId = data.subCategoryId ?? existing.subCategoryId;
  const startDate = data.startDate ?? isoDate(existing.startDate);
  const endDate = data.endDate ?? isoDate(existing.endDate);

  await requireExpenseSubCategory(workspaceId, subCategoryId);

  if (!isRangeAligned(existing.interval, startDate, endDate)) {
    throw new BudgetServiceError(
      "INVALID_PERIOD",
      "The budget range is not aligned to the selected interval",
    );
  }

  const splitFrom = data.splitFrom ?? null;
  if (splitFrom) {
    if (
      !isPeriodStart(existing.interval, splitFrom) ||
      splitFrom <= isoDate(existing.startDate) ||
      splitFrom > endDate
    ) {
      throw new BudgetServiceError(
        "INVALID_PERIOD",
        "A split must start on a period boundary inside the budget range",
      );
    }
  }

  const updated = await db.$transaction(async (tx) => {
    if (splitFrom) {
      const overlap = await tx.budget.count({
        where: {
          workspaceId,
          subCategoryId,
          id: { not: budgetId },
          startDate: { lte: new Date(endDate) },
          endDate: { gte: new Date(splitFrom) },
        },
      });

      if (overlap > 0) {
        throw new BudgetServiceError(
          "OVERLAPPING_BUDGET",
          "This subcategory already has a budget covering part of this range",
        );
      }

      await tx.budget.update({
        where: { id: budgetId },
        data: { endDate: new Date(previousDay(splitFrom)) },
      });

      return tx.budget.create({
        data: {
          workspaceId,
          subCategoryId,
          amount: data.amount ?? existing.amount.toString(),
          interval: existing.interval,
          startDate: new Date(splitFrom),
          endDate: new Date(endDate),
        },
        select: budgetSelect,
      });
    }

    const overlap = await tx.budget.count({
      where: {
        workspaceId,
        subCategoryId,
        id: { not: budgetId },
        startDate: { lte: new Date(endDate) },
        endDate: { gte: new Date(startDate) },
      },
    });

    if (overlap > 0) {
      throw new BudgetServiceError(
        "OVERLAPPING_BUDGET",
        "This subcategory already has a budget covering part of this range",
      );
    }

    return tx.budget.update({
      where: { id: budgetId },
      data: {
        subCategoryId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        ...(data.amount !== undefined ? { amount: data.amount } : {}),
      },
      select: budgetSelect,
    });
  });

  const today = isoDate(new Date());
  const view = await buildView(workspaceId, updated, today, today);

  if (view) return view;

  const own = ownRange(updated);
  const spent = await computeSpent(
    workspaceId,
    updated.subCategoryId,
    own.rangeStart,
    own.rangeEnd,
  );

  return toView(updated, own, spent);
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
