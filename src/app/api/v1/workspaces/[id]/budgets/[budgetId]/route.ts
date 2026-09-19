/**
 * GET    /api/v1/workspaces/[id]/budgets/[budgetId] — Get budget
 * PATCH  /api/v1/workspaces/[id]/budgets/[budgetId] — Update budget
 * DELETE /api/v1/workspaces/[id]/budgets/[budgetId] — Delete budget
 */

import { NextRequest } from "next/server";
import { withPipeline } from "@/lib/api/pipeline";
import { success } from "@/lib/api/envelope";
import {
  getBudget,
  updateBudget,
  deleteBudget,
} from "@/features/budgets/services";
import { handleBudgetErrors } from "@/features/budgets/errors";
import { UpdateBudgetSchema } from "@/features/budgets/schemas";

const errorMappings = {
  FORBIDDEN: {
    code: "FORBIDDEN" as const,
    message: "You are not a member of this workspace.",
  },
  BUDGET_NOT_FOUND: {
    code: "NOT_FOUND" as const,
    message: "Budget not found.",
  },
  INVALID_SUBCATEGORY: {
    code: "BAD_REQUEST" as const,
    message: "Invalid or archived subcategory.",
  },
  INVALID_PERIOD: {
    code: "BAD_REQUEST" as const,
    message: "The budget period is not aligned to the selected interval.",
  },
  OVERLAPPING_BUDGET: {
    code: "CONFLICT" as const,
    message: "This subcategory already has a budget covering part of this period.",
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; budgetId: string }> },
) {
  return withPipeline(
    request,
    { requireOnboarding: true },
    handleBudgetErrors(
      errorMappings,
      "Failed to load budget. Please try again.",
      async ({ userId }) => {
        const { id: workspaceId, budgetId } = await params;
        const budget = await getBudget(userId, workspaceId, budgetId);
        return success({ budget });
      },
    ),
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; budgetId: string }> },
) {
  return withPipeline(
    request,
    { schema: UpdateBudgetSchema, requireOnboarding: true },
    handleBudgetErrors(
      errorMappings,
      "Failed to update budget. Please try again.",
      async ({ userId }, data) => {
        const { id: workspaceId, budgetId } = await params;
        const budget = await updateBudget(userId, workspaceId, budgetId, data);
        return success({ budget });
      },
    ),
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; budgetId: string }> },
) {
  return withPipeline(
    request,
    { requireOnboarding: true },
    handleBudgetErrors(
      errorMappings,
      "Failed to delete budget. Please try again.",
      async ({ userId }) => {
        const { id: workspaceId, budgetId } = await params;
        const result = await deleteBudget(userId, workspaceId, budgetId);
        return success(result);
      },
    ),
  );
}
