/**
 * GET /api/v1/workspaces/[id]/budgets/alerts - Budget threshold alerts
 *
 * Returns alerts for budgets active today, each measured against its current
 * interval period. Transport adapter only: authenticate, invoke the budget
 * service, and map expected errors.
 */

import { NextRequest } from "next/server";
import { withPipeline } from "@/lib/api/pipeline";
import { success } from "@/lib/api/envelope";
import { getBudgetAlerts } from "@/features/budgets/services";
import { handleBudgetErrors } from "@/features/budgets/errors";

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
      "Failed to load budget alerts. Please try again.",
      async ({ userId }) => {
        const { id: workspaceId } = await params;
        const result = await getBudgetAlerts(userId, workspaceId);
        return success(result);
      },
    ),
  );
}
