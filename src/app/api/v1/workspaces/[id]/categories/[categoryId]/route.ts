/**
 * PATCH /api/v1/workspaces/[id]/categories/[categoryId] — Update category
 */

import { NextRequest } from "next/server";
import { withPipeline } from "@/lib/api/pipeline";
import { success } from "@/lib/api/envelope";
import { updateCategory } from "@/features/categories/services";
import { handleCategoryErrors } from "@/features/categories/errors";
import { UpdateCategorySchema } from "@/features/categories/schemas";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; categoryId: string }> },
) {
  return withPipeline(
    request,
    { schema: UpdateCategorySchema, requireOnboarding: true },
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
          message: "A category with this name already exists for this type.",
        },
      },
      "Failed to update category. Please try again.",
      async ({ userId }, data) => {
        const { id: workspaceId, categoryId } = await params;
        const category = await updateCategory(userId, workspaceId, categoryId, data);
        return success({ category });
      },
    ),
  );
}
