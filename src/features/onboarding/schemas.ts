/**
 * Zod schemas for onboarding form validation.
 *
 * Validate all incoming payloads using strict
 * schema validation (e.g., Zod).
 */

import { z } from 'zod';

/**
 * Supported currencies for the MVP.
 */
export const CurrencyEnum = z.enum(['USD', 'IDR']);

/**
 * Onboarding completion request schema.
 *
 * Validates the payload sent to POST /api/v1/onboarding/complete.
 * Only collects profile essentials — workspace creation is a separate step.
 */
export const CompleteOnboardingSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  currencyPreference: CurrencyEnum,
});

/**
 * Type inference from the schema.
 */
export type CompleteOnboardingInput = z.infer<typeof CompleteOnboardingSchema>;
