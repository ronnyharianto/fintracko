/**
 * PATCH /api/v1/workspaces/[id]/categories/[categoryId]/subcategories/[subCategoryId] — Update subcategory
 */

import { NextRequest } from "next/server";
import { withPipeline } from "@/lib/api/pipeline";
import { success } from "@/lib/api/envelope";
import { updateSubCategory } from "@/features/categories/services";
import { handleCategoryErrors } from "@/features/categories/errors";
import { UpdateSubCategorySchema } from "@/features/categories/schemas";

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ categoryId: string; subCategoryId: string }>;
  },
) {
  return withPipeline(
    request,
    { schema: UpdateSubCategorySchema, requireOnboarding: true },
    handleCategoryErrors(
      {
        FORBIDDEN: {
          code: "FORBIDDEN",
          message: "You are not a member of this workspace.",
        },
        SUBCATEGORY_NOT_FOUND: {
          code: "NOT_FOUND",
          message: "Subcategory not found.",
        },
        NAME_TAKEN: {
          code: "CONFLICT",
          message:
            "A subcategory with this name already exists in this category.",
        },
      },
      "Failed to update subcategory. Please try again.",
      async ({ userId }, data) => {
        const { subCategoryId } = await params;
        const subCategory = await updateSubCategory(
          userId,
          subCategoryId,
          data,
        );
        return success({ subCategory });
      },
    ),
  );
}
