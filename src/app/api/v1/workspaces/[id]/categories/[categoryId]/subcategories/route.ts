/**
 * POST /api/v1/workspaces/[id]/categories/[categoryId]/subcategories — Create subcategory
 */

import { NextRequest } from "next/server";
import { withPipeline } from "@/lib/api/pipeline";
import { success } from "@/lib/api/envelope";
import { createSubCategory } from "@/features/categories/services";
import { handleCategoryErrors } from "@/features/categories/errors";
import { CreateSubCategorySchema } from "@/features/categories/schemas";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; categoryId: string }> },
) {
  return withPipeline(
    request,
    { schema: CreateSubCategorySchema, requireOnboarding: true },
    handleCategoryErrors(
      {
        FORBIDDEN: {
          code: "FORBIDDEN",
          message: "You are not a member of this workspace.",
        },
        CATEGORY_NOT_FOUND: {
          code: "NOT_FOUND",
          message: "Category not found.",
        },
        NAME_TAKEN: {
          code: "CONFLICT",
          message:
            "A subcategory with this name already exists in this category.",
        },
        CATEGORY_ARCHIVED: {
          code: "CONFLICT",
          message: "Cannot add a subcategory to an archived category.",
        },
      },
      "Failed to create subcategory. Please try again.",
      async ({ userId }, data) => {
        const { id: workspaceId, categoryId } = await params;
        const subCategory = await createSubCategory(
          userId,
          workspaceId,
          categoryId,
          data,
        );
        return success({ subCategory });
      },
    ),
  );
}
