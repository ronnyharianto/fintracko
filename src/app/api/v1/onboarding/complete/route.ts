/**
 * POST /api/v1/onboarding/complete
 *
 * Completes the onboarding process by creating a Profile and updating
 * the User name. Workspace creation is a separate step handled by the
 * workspace setup flow after onboarding.
 *
 * This endpoint follows the global security pipeline:
 * - Session & Identity Extraction
 * - Onboarding Verification Guard (ensures Profile doesn't already exist)
 * - Rate Limiting & Input Validation
 * - XSS Sanitization
 */

import { NextRequest } from 'next/server';
import { withPipeline } from '@/lib/api/pipeline';
import { success, failure } from '@/lib/api/envelope';
import { CompleteOnboardingSchema } from '@/features/onboarding/schemas';
import { completeOnboarding } from '@/features/onboarding/services';
import { isUniqueConstraintError } from '@/lib/api/service-errors';

export async function POST(request: NextRequest) {
  return withPipeline(
    request,
    { schema: CompleteOnboardingSchema, rejectIfOnboarded: true },
    async ({ userId }, data) => {
      try {
        // Complete onboarding — creates Profile, updates User name
        const result = await completeOnboarding(userId, data);

        return success({
          profile: {
            id: result.profile.id,
            currencyPreference: result.profile.currencyPreference,
          },
        });
      } catch (error) {
        // The pipeline guard catches the common double submission; a request
        // that races past it still hits the unique Profile.userId constraint.
        if (isUniqueConstraintError(error)) {
          return failure(
            'CONFLICT',
            'Onboarding has already been completed for this account.'
          );
        }
        return failure(
          'INTERNAL_SERVER_ERROR',
          'Failed to complete onboarding. Please try again.'
        );
      }
    }
  );
}
