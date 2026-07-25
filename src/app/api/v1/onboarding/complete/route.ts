/**
 * POST /api/v1/onboarding/complete
 *
 * Completes the onboarding process by creating a Profile and the first Workspace.
 *
 * Per API_SPECS.md §2: This endpoint follows the global security pipeline:
 * - Session & Identity Extraction
 * - Onboarding Verification Guard (ensures Profile doesn't already exist)
 * - Rate Limiting & Input Validation
 * - XSS Sanitization
 *
 * Per ARCHITECTURE.md §3: Uses atomic database transaction to create Profile + Workspace.
 */

import { NextRequest } from 'next/server';
import { withSession } from '@/lib/api/session';
import { validateBody } from '@/lib/api/validate';
import { sanitizeObject } from '@/lib/api/sanitize';
import { success } from '@/lib/api/envelope';
import { CompleteOnboardingSchema } from '@/features/onboarding/schemas';
import { completeOnboarding } from '@/features/onboarding/services';
import { failure } from '@/lib/api/envelope';

export async function POST(request: NextRequest) {
  return withSession(request, async ({ userId }) => {
    // Validate request body
    const validationResult = await validateBody(
      request,
      CompleteOnboardingSchema
    );
    if (!validationResult.success) {
      return validationResult.response;
    }

    // Sanitize input to prevent XSS
    const sanitizedData = sanitizeObject(validationResult.data);

    try {
      // Complete onboarding with atomic transaction
      const result = await completeOnboarding(userId, sanitizedData);

      return success({
        profile: {
          id: result.profile.id,
          bio: result.profile.bio,
          currencyPreference: result.profile.currencyPreference,
          languagePreference: result.profile.languagePreference,
        },
        workspace: {
          id: result.workspace.id,
          name: result.workspace.name,
        },
      });
    } catch (error) {
      // Handle potential errors (e.g., Profile already exists)
      return failure(
        'INTERNAL_SERVER_ERROR',
        'Failed to complete onboarding. Please try again.'
      );
    }
  });
}
