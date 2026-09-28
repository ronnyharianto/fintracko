/**
 * PATCH /api/v1/workspaces/[id]/categories/[categoryId]/subcategories/[subCategoryId]/archive — Archive subcategory
 */

import { NextRequest } from "next/server";
import { withPipeline } from "@/lib/api/pipeline";
import { success } from "@/lib/api/envelope";
import { archiveSubCategory } from "@/features/categories/services";
import { handleCategoryErrors } from "@/features/categories/errors";

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; categoryId: string; subCategoryId: string }>;
  },
) {
  return withPipeline(
    request,
    { requireOnboarding: true },
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
      },
      "Failed to archive subcategory. Please try again.",
      async ({ userId }) => {
        const { id: workspaceId, categoryId, subCategoryId } = await params;
        const result = await archiveSubCategory(
          userId,
          workspaceId,
          categoryId,
          subCategoryId,
        );
        return success(result);
      },
    ),
  );
}
