/**
 * GET /api/v1/workspaces/[id]/analytics/summary
 *
 * Returns the analytics breakdown (level-1 categories with their
 * subcategories) and the monthly trend for one transaction type and window.
 * Transport adapter only: authenticate, validate the query, invoke the
 * analytics service, map expected errors.
 */

import { NextRequest } from "next/server";
import { withPipeline } from "@/lib/api/pipeline";
import { success, failure } from "@/lib/api/envelope";
import { getDateRange } from "@/lib/date-period";
import { getAnalyticsSummary } from "@/features/analytics/services";
import { handleAnalyticsErrors } from "@/features/analytics/errors";
import { AnalyticsQuerySchema } from "@/features/analytics/schemas";
import type { TransactionType } from "@/features/transactions/types";

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
      "Failed to load analytics. Please try again.",
      async ({ userId }) => {
        const { id: workspaceId } = await params;
        const { searchParams } = new URL(request.url);

        const parsedQuery = AnalyticsQuerySchema.safeParse(
          Object.fromEntries(searchParams),
        );
        if (!parsedQuery.success) {
          return failure("VALIDATION_ERROR", "Invalid analytics filters.");
        }

        // The window defaults to the current calendar month.
        const month = getDateRange("month", new Date());

        const summary = await getAnalyticsSummary(userId, workspaceId, {
          type: parsedQuery.data.type as TransactionType,
          from: parsedQuery.data.from ?? month.from,
          to: parsedQuery.data.to ?? month.to,
        });

        return success(summary);
      },
    ),
  );
}
