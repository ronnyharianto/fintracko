/**
 * GET /api/v1/workspaces
 * POST /api/v1/workspaces
 *
 * Lists workspaces the user is a member of (or owns, with `?owned=true`)
 * and creates a new independent workspace, assigning the creator as owner
 * and populating the default category and subcategory structure from a
 * static template.
 *
 * Follows the global security pipeline (Session extraction,
 * Onboarding Verification Guard, Zod validation, XSS sanitization).
 */

import { NextRequest } from "next/server";
import { withPipeline } from "@/lib/api/pipeline";
import { successWithStatus, failure } from "@/lib/api/envelope";
import { CreateWorkspaceSchema } from "@/features/workspaces/schemas";
import {
  createWorkspace,
  getUserWorkspaces,
  getOwnedWorkspaces,
} from "@/features/workspaces/services";

export async function GET(request: NextRequest) {
  return withPipeline(
    request,
    { requireOnboarding: true },
    async ({ userId }) => {
      try {
        const isOwned = request.nextUrl.searchParams.get("owned") === "true";
        const workspaces = isOwned
          ? await getOwnedWorkspaces(userId)
          : await getUserWorkspaces(userId);
        return successWithStatus({ workspaces }, 200);
      } catch {
        return failure(
          "INTERNAL_SERVER_ERROR",
          "Failed to retrieve workspaces. Please try again.",
        );
      }
    },
  );
}

export async function POST(request: NextRequest) {
  return withPipeline(
    request,
    { schema: CreateWorkspaceSchema, requireOnboarding: true },
    async ({ userId, profile }, data) => {
      try {
        // Create workspace and seed template categories.
        // Workspace currency defaults to the creator's profile
        // currencyPreference unless explicitly provided (PRD §3.2).
        const workspace = await createWorkspace(userId, {
          ...data,
          // profile.currencyPreference was validated as CurrencyEnum during
          // onboarding, so narrowing the persisted string is safe here.
          currency:
            data.currency ??
            (profile?.currencyPreference as "USD" | "IDR"),
        });

        return successWithStatus(
          {
            workspace: {
              id: workspace.id,
              name: workspace.name,
              createdAt: workspace.createdAt,
            },
          },
          201,
        );
      } catch {
        return failure(
          "INTERNAL_SERVER_ERROR",
          "Failed to create workspace. Please try again.",
        );
      }
    },
  );
}
