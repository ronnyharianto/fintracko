/**
 * Category & SubCategory CRUD service layer.
 *
 * All operations verify workspace membership before mutating.
 * Business rules:
 * - Category name unique per workspace + type
 * - SubCategory name unique per category
 * - Editable field: name only
 * - No hard delete — archive/unarchive only
 * - Archiving a category blocks all its subcategories
 */

import { db } from "@/lib/db";
import { findWorkspaceMembership } from "@/lib/auth/membership";
import type { TransactionType } from "../../../generated/prisma/enums";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateSubCategoryInput,
  UpdateSubCategoryInput,
} from "./schemas";
import { CategoryServiceError } from "./errors";

/**
 * Verify the user is a member of the workspace, or throw FORBIDDEN.
 */
async function requireMembership(userId: string, workspaceId: string) {
  const membership = await findWorkspaceMembership(userId, workspaceId);
  if (!membership) {
    throw new CategoryServiceError(
      "FORBIDDEN",
      "You are not a member of this workspace",
    );
  }
  return membership;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

/**
 * Retrieves all categories with nested subcategories for a workspace.
 * Categories are ordered by type (INCOME, EXPENSE, TRANSFER) then name.
 */
export async function getCategories(userId: string, workspaceId: string) {
  await requireMembership(userId, workspaceId);

  return db.category.findMany({
    where: { workspaceId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: {
      subCategories: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          isArchived: true,
          createdAt: true,
        },
      },
    },
  });
}

/**
 * Creates a new category in the workspace.
 * Validates membership and unique name within workspace + type.
 */
export async function createCategory(
  userId: string,
  workspaceId: string,
  data: CreateCategoryInput,
) {
  await requireMembership(userId, workspaceId);

  const existing = await db.category.findUnique({
    where: {
      workspaceId_name_type: {
        workspaceId,
        name: data.name,
        type: data.type as TransactionType,
      },
    },
    select: { id: true },
  });

  if (existing) {
    throw new CategoryServiceError(
      "NAME_TAKEN",
      "A category with this name already exists for this type",
    );
  }

  return db.category.create({
    data: {
      workspaceId,
      name: data.name,
      type: data.type as TransactionType,
    },
    include: {
      subCategories: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          isArchived: true,
          createdAt: true,
        },
      },
    },
  });
}

/**
 * Updates a category's name.
 * Both path identifiers are enforced (§4 — nested-path authorization).
 * Validates membership, unique name if changed.
 */
export async function updateCategory(
  userId: string,
  workspaceId: string,
  categoryId: string,
  data: UpdateCategoryInput,
) {
  const category = await db.category.findFirst({
    where: { id: categoryId, workspaceId },
    select: { id: true, workspaceId: true, name: true, type: true },
  });

  if (!category) {
    throw new CategoryServiceError("CATEGORY_NOT_FOUND", "Category not found");
  }

  await requireMembership(userId, workspaceId);

  if (data.name !== category.name) {
    const existing = await db.category.findUnique({
      where: {
        workspaceId_name_type: {
          workspaceId: category.workspaceId,
          name: data.name,
          type: category.type,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new CategoryServiceError(
        "NAME_TAKEN",
        "A category with this name already exists for this type",
      );
    }
  }

  return db.category.update({
    where: { id: categoryId },
    data: { name: data.name },
    include: {
      subCategories: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          isArchived: true,
          createdAt: true,
        },
      },
    },
  });
}

/**
 * Archives a category. All subcategories become inaccessible.
 * Both path identifiers are enforced (§4 — nested-path authorization).
 */
export async function archiveCategory(
  userId: string,
  workspaceId: string,
  categoryId: string,
) {
  const category = await db.category.findFirst({
    where: { id: categoryId, workspaceId },
    select: { id: true, workspaceId: true },
  });

  if (!category) {
    throw new CategoryServiceError("CATEGORY_NOT_FOUND", "Category not found");
  }

  await requireMembership(userId, workspaceId);

  return db.category.update({
    where: { id: categoryId },
    data: { isArchived: true },
    select: { id: true, isArchived: true },
  });
}

/**
 * Unarchives a category, restoring access to its subcategories.
 * Both path identifiers are enforced (§4 — nested-path authorization).
 */
export async function unarchiveCategory(
  userId: string,
  workspaceId: string,
  categoryId: string,
) {
  const category = await db.category.findFirst({
    where: { id: categoryId, workspaceId },
    select: { id: true, workspaceId: true },
  });

  if (!category) {
    throw new CategoryServiceError("CATEGORY_NOT_FOUND", "Category not found");
  }

  await requireMembership(userId, workspaceId);

  return db.category.update({
    where: { id: categoryId },
    data: { isArchived: false },
    select: { id: true, isArchived: true },
  });
}

// ---------------------------------------------------------------------------
// SubCategories
// ---------------------------------------------------------------------------

/**
 * Creates a new subcategory under a category.
 * Validates membership and unique name within the category.
 */
export async function createSubCategory(
  userId: string,
  categoryId: string,
  data: CreateSubCategoryInput,
) {
  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: { id: true, workspaceId: true },
  });

  if (!category) {
    throw new CategoryServiceError("CATEGORY_NOT_FOUND", "Category not found");
  }

  await requireMembership(userId, category.workspaceId);

  const existing = await db.subCategory.findUnique({
    where: {
      workspaceId_name_categoryId: {
        workspaceId: category.workspaceId,
        name: data.name,
        categoryId,
      },
    },
    select: { id: true },
  });

  if (existing) {
    throw new CategoryServiceError(
      "NAME_TAKEN",
      "A subcategory with this name already exists in this category",
    );
  }

  return db.subCategory.create({
    data: {
      workspaceId: category.workspaceId,
      categoryId,
      name: data.name,
    },
    select: {
      id: true,
      name: true,
      isArchived: true,
      createdAt: true,
    },
  });
}

/**
 * Updates a subcategory's name.
 * Every path identifier is enforced: the subcategory must live in the stated
 * workspace AND under the stated parent category (§4 — nested-path authorization).
 */
export async function updateSubCategory(
  userId: string,
  workspaceId: string,
  categoryId: string,
  subCategoryId: string,
  data: UpdateSubCategoryInput,
) {
  const subCategory = await db.subCategory.findFirst({
    where: { id: subCategoryId, workspaceId },
    select: { id: true, workspaceId: true, name: true, categoryId: true },
  });

  if (!subCategory || subCategory.categoryId !== categoryId) {
    throw new CategoryServiceError(
      "SUBCATEGORY_NOT_FOUND",
      "Subcategory not found",
    );
  }

  await requireMembership(userId, workspaceId);

  if (data.name !== subCategory.name) {
    const existing = await db.subCategory.findUnique({
      where: {
        workspaceId_name_categoryId: {
          workspaceId: subCategory.workspaceId,
          name: data.name,
          categoryId: subCategory.categoryId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new CategoryServiceError(
        "NAME_TAKEN",
        "A subcategory with this name already exists in this category",
      );
    }
  }

  return db.subCategory.update({
    where: { id: subCategoryId },
    data: { name: data.name },
    select: {
      id: true,
      name: true,
      isArchived: true,
      createdAt: true,
    },
  });
}

/**
 * Archives a subcategory.
 * Every path identifier is enforced: workspace and parent category (§4).
 */
export async function archiveSubCategory(
  userId: string,
  workspaceId: string,
  categoryId: string,
  subCategoryId: string,
) {
  const subCategory = await db.subCategory.findFirst({
    where: { id: subCategoryId, workspaceId },
    select: { id: true, workspaceId: true, categoryId: true },
  });

  if (!subCategory || subCategory.categoryId !== categoryId) {
    throw new CategoryServiceError(
      "SUBCATEGORY_NOT_FOUND",
      "Subcategory not found",
    );
  }

  await requireMembership(userId, workspaceId);

  return db.subCategory.update({
    where: { id: subCategoryId },
    data: { isArchived: true },
    select: { id: true, isArchived: true },
  });
}

/**
 * Unarchives a subcategory.
 * Every path identifier is enforced: workspace and parent category (§4).
 */
export async function unarchiveSubCategory(
  userId: string,
  workspaceId: string,
  categoryId: string,
  subCategoryId: string,
) {
  const subCategory = await db.subCategory.findFirst({
    where: { id: subCategoryId, workspaceId },
    select: { id: true, workspaceId: true, categoryId: true },
  });

  if (!subCategory || subCategory.categoryId !== categoryId) {
    throw new CategoryServiceError(
      "SUBCATEGORY_NOT_FOUND",
      "Subcategory not found",
    );
  }

  await requireMembership(userId, workspaceId);

  return db.subCategory.update({
    where: { id: subCategoryId },
    data: { isArchived: false },
    select: { id: true, isArchived: true },
  });
}
