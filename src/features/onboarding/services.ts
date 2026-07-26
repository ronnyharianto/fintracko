/**
 * Onboarding service layer.
 *
 * Handles database operations for onboarding, including the atomic
 * transaction that creates both the Profile and the first Workspace.
 */

import { db } from '@/lib/db';
import type { CompleteOnboardingInput } from './schemas';

/**
 * Creates a Profile and the first Workspace in a single atomic transaction.
 *
 * All financial mutations and calculations MUST be
 * wrapped in a Prisma $transaction block to ensure atomicity and consistency.
 *
 * This function:
 * 1. Creates the Profile record with user-provided data
 * 2. Creates the first Workspace with a default name
 * 3. Creates a WorkspaceMember entry with OWNER role
 * 4. Returns both the Profile and Workspace data
 */
export async function completeOnboarding(
  userId: string,
  data: CompleteOnboardingInput
) {
  return await db.$transaction(async (tx) => {
    // Create Profile record
    const profile = await tx.profile.create({
      data: {
        userId,
        bio: data.bio,
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender,
        currencyPreference: data.currencyPreference,
        languagePreference: data.languagePreference,
      },
    });

    // Create first Workspace with default name
    const workspace = await tx.workspace.create({
      data: {
        name: 'My Workspace',
        ownerId: userId,
      },
    });

    // Create WorkspaceMember entry with OWNER role
    await tx.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: 'OWNER',
      },
    });

    return {
      profile,
      workspace,
    };
  });
}
