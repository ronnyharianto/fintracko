/**
 * PATCH /api/v1/workspaces/[id]/categories/[categoryId]/unarchive — Unarchive category
 */

import { NextRequest } from "next/server";
import { withPipeline } from "@/lib/api/pipeline";
import { success } from "@/lib/api/envelope";
import { unarchiveCategory } from "@/features/categories/services";
import { handleCategoryErrors } from "@/features/categories/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; categoryId: string }> },
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
        CATEGORY_NOT_FOUND: {
          code: "NOT_FOUND",
          message: "Category not found.",
        },
      },
      "Failed to unarchive category. Please try again.",
      async ({ userId }) => {
        const { id: workspaceId, categoryId } = await params;
        const result = await unarchiveCategory(userId, workspaceId, categoryId);
        return success(result);
      },
    ),
  );
}
