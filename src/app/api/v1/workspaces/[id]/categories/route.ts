/**
 * GET  /api/v1/workspaces/[id]/categories — List categories
 * POST /api/v1/workspaces/[id]/categories — Create category
 */

import { NextRequest } from "next/server";
import { withPipeline } from "@/lib/api/pipeline";
import { success } from "@/lib/api/envelope";
import {
  getCategories,
  createCategory,
} from "@/features/categories/services";
import { handleCategoryErrors } from "@/features/categories/errors";
import { CreateCategorySchema } from "@/features/categories/schemas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
      },
      "Failed to load categories. Please try again.",
      async ({ userId }) => {
        const { id: workspaceId } = await params;
        const categories = await getCategories(userId, workspaceId);
        return success({ categories });
      },
    ),
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withPipeline(
    request,
    { schema: CreateCategorySchema, requireOnboarding: true },
    handleCategoryErrors(
      {
        FORBIDDEN: {
          code: "FORBIDDEN",
          message: "You are not a member of this workspace.",
        },
        NAME_TAKEN: {
          code: "CONFLICT",
          message: "A category with this name already exists for this type.",
        },
      },
      "Failed to create category. Please try again.",
      async ({ userId }, data) => {
        const { id: workspaceId } = await params;
        const category = await createCategory(userId, workspaceId, data);
        return success({ category });
      },
    ),
  );
}
