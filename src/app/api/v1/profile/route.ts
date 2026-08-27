/**
 * GET /api/v1/profile
 * PATCH /api/v1/profile
 *
 * Reads and updates the authenticated user's profile.
 */

import { NextRequest } from "next/server";
import { withPipeline } from "@/lib/api/pipeline";
import { success, failure } from "@/lib/api/envelope";
import { getProfile, updateProfile } from "@/features/onboarding/services";
import { UpdateProfileSchema } from "@/features/onboarding/schemas";

export async function GET(request: NextRequest) {
  return withPipeline(
    request,
    { requireOnboarding: true },
    async ({ userId }) => {
      try {
        const profile = await getProfile(userId);
        if (!profile) {
          return failure("NOT_FOUND", "Profile not found.");
        }
        return success({ profile });
      } catch {
        return failure("INTERNAL_SERVER_ERROR", "Failed to retrieve profile.");
      }
    },
  );
}

export async function PATCH(request: NextRequest) {
  return withPipeline(
    request,
    { schema: UpdateProfileSchema, requireOnboarding: true },
    async ({ userId }, data) => {
      try {
        const profile = await updateProfile(userId, data);
        return success({ profile });
      } catch {
        return failure("INTERNAL_SERVER_ERROR", "Failed to update profile.");
      }
    },
  );
}
