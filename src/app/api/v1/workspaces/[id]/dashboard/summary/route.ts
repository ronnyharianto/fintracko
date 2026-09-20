/**
 * GET /api/v1/workspaces/[id]/dashboard/summary
 *
 * Returns all four dashboard sections in one payload so the page renders with a
 * single loading/error state. This is a transport adapter only: it
 * authenticates, invokes the analytics service, and maps expected errors.
 */

import { NextRequest } from "next/server";
import { withPipeline } from "@/lib/api/pipeline";
import { success } from "@/lib/api/envelope";
import { getDashboardSummary } from "@/features/analytics/services";
import { handleAnalyticsErrors } from "@/features/analytics/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withPipeline(
    request,
    { requireOnboarding: true },
    handleAnalyticsErrors(
      {
        FORBIDDEN: {
          code: "FORBIDDEN",
          message: "You are not a member of this workspace.",
        },
      },
      "Failed to load the dashboard. Please try again.",
      async ({ userId }) => {
        const { id: workspaceId } = await params;
        const summary = await getDashboardSummary(userId, workspaceId);
        return success(summary);
      },
    ),
  );
}
