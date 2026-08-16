/**
 * Zod schemas for onboarding form validation.
 *
 * Validate all incoming payloads using strict
 * schema validation (e.g., Zod).
 */

import { z } from 'zod';

/**
 * Gender enum matching the Prisma schema.
 */
export const GenderEnum = z.enum(['MALE', 'FEMALE', 'OTHER']);

/**
 * Supported currencies for the MVP.
 */
export const CurrencyEnum = z.enum(['USD', 'IDR']);

/**
 * Onboarding completion request schema.
 *
 * Validates the payload sent to POST /api/v1/onboarding/complete.
 */
export const CompleteOnboardingSchema = z.object({
  bio: z.string().max(500).nullable().optional(),
  dateOfBirth: z.iso.datetime(),
  gender: GenderEnum,
  currencyPreference: CurrencyEnum,
});

/**
 * Type inference from the schema.
 */
export type CompleteOnboardingInput = z.infer<typeof CompleteOnboardingSchema>;
