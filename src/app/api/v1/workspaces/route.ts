/**
 * POST /api/v1/workspaces
 *
 * Creates a new independent workspace, assigns the creator as owner,
 * and populates the default category and subcategory structure from a static template.
 *
 * Follows the global security pipeline (Session extraction,
 * Onboarding Verification Guard, Zod validation, XSS sanitization).
 */

import { NextRequest } from "next/server";
import { withSession } from "@/lib/api/session";
import { validateBody } from "@/lib/api/validate";
import { sanitizeObject } from "@/lib/api/sanitize";
import { successWithStatus, failure } from "@/lib/api/envelope";
import { CreateWorkspaceSchema } from "@/features/workspaces/schemas";
import {
  createWorkspace,
  getUserWorkspaces,
  getOwnedWorkspaces,
} from "@/features/workspaces/services";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  return withSession(request, async ({ userId }) => {
    const profile = await db.profile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      return failure(
        "ONBOARDING_REQUIRED",
        "Profile not found. Please complete onboarding first.",
      );
    }

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
  });
}

export async function POST(request: NextRequest) {
  return withSession(request, async ({ userId }) => {
    // 1. Onboarding Verification Guard (API_SPECS.md §2)
    const profile = await db.profile.findUnique({
      where: { userId },
      select: { id: true, currencyPreference: true },
    });
    if (!profile) {
      return failure(
        "ONBOARDING_REQUIRED",
        "Profile not found. Please complete onboarding first.",
      );
    }

    // 2. Validate request body
    const validationResult = await validateBody(request, CreateWorkspaceSchema);
    if (!validationResult.success) {
      return validationResult.response;
    }

    // 3. Sanitize input to prevent XSS
    const sanitizedData = sanitizeObject(validationResult.data);

    try {
      // 4. Create workspace and seed template categories.
      //    Workspace currency defaults to the creator's profile
      //    currencyPreference unless explicitly provided (PRD §3.2).
      const workspace = await createWorkspace(userId, {
        ...sanitizedData,
        // profile.currencyPreference was validated as CurrencyEnum during
        // onboarding, so narrowing the persisted string is safe here.
        currency:
          sanitizedData.currency ??
          (profile.currencyPreference as "USD" | "IDR"),
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
  });
}
