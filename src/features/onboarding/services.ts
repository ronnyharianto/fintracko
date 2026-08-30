/**
 * Onboarding service layer.
 *
 * Handles database operations for onboarding — creating the user Profile
 * and updating the User record with the provided name. Workspace creation
 * is a separate step handled by the workspace setup flow.
 */

import { db } from "@/lib/db";
import type { Gender } from "../../../generated/prisma/enums";
import type { CompleteOnboardingInput, UpdateProfileInput } from "./schemas";

/**
 * Creates a Profile and updates the User name in a single atomic transaction.
 *
 * All financial mutations and calculations MUST be
 * wrapped in a Prisma $transaction block to ensure atomicity and consistency.
 *
 * This function:
 * 1. Updates the User record with the provided name
 * 2. Creates the Profile record with currency preference
 * 3. Returns the Profile data
 *
 * Workspace creation is handled separately by the workspace setup flow
 * after onboarding is complete.
 */
export async function completeOnboarding(
  userId: string,
  data: CompleteOnboardingInput,
) {
  return await db.$transaction(async (tx) => {
    // Update User name from onboarding input
    await tx.user.update({
      where: { id: userId },
      data: { name: data.name },
    });

    // Create Profile record with currency preference
    const profile = await tx.profile.create({
      data: {
        userId,
        currencyPreference: data.currencyPreference,
      },
    });

    return {
      profile,
    };
  });
}

/** Retrieves the editable profile fields together with the user's name. */
export async function getProfile(userId: string) {
  return db.profile.findUnique({
    where: { userId },
    select: {
      id: true,
      phoneNumber: true,
      company: true,
      bio: true,
      dateOfBirth: true,
      gender: true,
      currencyPreference: true,
      user: {
        select: { name: true },
      },
    },
  });
}

/** Updates the Profile and User name atomically. */
export async function updateProfile(userId: string, data: UpdateProfileInput) {
  return db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { name: data.name },
    });

    return tx.profile.update({
      where: { userId },
      data: {
        phoneNumber: data.phoneNumber,
        company: data.company,
        bio: data.bio,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender as Gender,
        currencyPreference: data.currencyPreference,
      },
      select: {
        id: true,
        phoneNumber: true,
        company: true,
        bio: true,
        dateOfBirth: true,
        gender: true,
        currencyPreference: true,
        user: {
          select: { name: true },
        },
      },
    });
  });
}
