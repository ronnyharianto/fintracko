/**
 * GET  /api/v1/workspaces/[id]/budgets — List budgets with utilization
 * POST /api/v1/workspaces/[id]/budgets — Create budget
 */

import { NextRequest } from "next/server";
import { withPipeline } from "@/lib/api/pipeline";
import { success, failure } from "@/lib/api/envelope";
import { getBudgets, createBudget } from "@/features/budgets/services";
import { handleBudgetErrors } from "@/features/budgets/errors";
import {
  BudgetQuerySchema,
  CreateBudgetSchema,
} from "@/features/budgets/schemas";
import type { BudgetStatus } from "@/features/budgets/types";
import type { BudgetInterval } from "../../../../../../../generated/prisma/enums";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withPipeline(
    request,
    { requireOnboarding: true },
    handleBudgetErrors(
      {
        FORBIDDEN: {
          code: "FORBIDDEN",
          message: "You are not a member of this workspace.",
        },
      },
      "Failed to load budgets. Please try again.",
      async ({ userId }) => {
        const { id: workspaceId } = await params;
        const { searchParams } = new URL(request.url);

        const parsedQuery = BudgetQuerySchema.safeParse(
          Object.fromEntries(searchParams),
        );
        if (!parsedQuery.success) {
          return failure("VALIDATION_ERROR", "Invalid budget filters.");
        }

        const { interval, status, from, to } = parsedQuery.data;

        const result = await getBudgets(userId, workspaceId, {
          from,
          to,
          interval: interval as BudgetInterval | undefined,
          status: status as BudgetStatus | undefined,
        });

        return success(result);
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
    { schema: CreateBudgetSchema, requireOnboarding: true },
    handleBudgetErrors(
      {
        FORBIDDEN: {
          code: "FORBIDDEN",
          message: "You are not a member of this workspace.",
        },
        INVALID_SUBCATEGORY: {
          code: "BAD_REQUEST",
          message: "Invalid or archived subcategory.",
        },
        INVALID_PERIOD: {
          code: "BAD_REQUEST",
          message: "The budget period is not aligned to the selected interval.",
        },
        OVERLAPPING_BUDGET: {
          code: "CONFLICT",
          message:
            "This subcategory already has a budget covering part of this period.",
        },
      },
      "Failed to create budget. Please try again.",
      async ({ userId }, data) => {
        const { id: workspaceId } = await params;
        const budget = await createBudget(userId, workspaceId, data);
        return success({ budget });
      },
    ),
  );
}
