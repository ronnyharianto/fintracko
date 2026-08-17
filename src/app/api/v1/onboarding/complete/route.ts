/**
 * POST /api/v1/onboarding/complete
 *
 * Completes the onboarding process by creating a Profile and the first Workspace.
 *
 * This endpoint follows the global security pipeline:
 * - Session & Identity Extraction
 * - Onboarding Verification Guard (ensures Profile doesn't already exist)
 * - Rate Limiting & Input Validation
 * - XSS Sanitization
 *
 * Uses atomic database transaction to create Profile + Workspace.
 */

import { NextRequest } from 'next/server';
import { withPipeline } from '@/lib/api/pipeline';
import { success, failure } from '@/lib/api/envelope';
import { CompleteOnboardingSchema } from '@/features/onboarding/schemas';
import { completeOnboarding } from '@/features/onboarding/services';

export async function POST(request: NextRequest) {
  return withPipeline(
    request,
    { schema: CompleteOnboardingSchema, rejectIfOnboarded: true },
    async ({ userId }, data) => {
      try {
        // Complete onboarding with atomic transaction
        const result = await completeOnboarding(userId, data);

        return success({
          profile: {
            id: result.profile.id,
            bio: result.profile.bio,
            currencyPreference: result.profile.currencyPreference,
          },
          workspace: {
            id: result.workspace.id,
            name: result.workspace.name,
          },
        });
      } catch {
        // Defensive: any failure here (e.g. a unique-constraint race between
        // the guard and the insert) surfaces as a generic 500 — the common
        // double-submission case is already caught by the pipeline guard.
        return failure(
          'INTERNAL_SERVER_ERROR',
          'Failed to complete onboarding. Please try again.'
        );
      }
    }
  );
}
