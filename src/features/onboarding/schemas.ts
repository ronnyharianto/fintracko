/**
 * Zod schemas for onboarding form validation.
 *
 * Validate all incoming payloads using strict
 * schema validation (e.g., Zod).
 */

import { z } from "zod";

/**
 * Supported currencies for the MVP.
 */
export const CurrencyEnum = z.enum(["USD", "IDR"]);

export const GenderEnum = z.enum(["MALE", "FEMALE", "OTHER"]);

/**
 * Onboarding completion request schema.
 *
 * Validates the payload sent to POST /api/v1/onboarding/complete.
 * Only collects profile essentials — workspace creation is a separate step.
 */
export const CompleteOnboardingSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  currencyPreference: CurrencyEnum,
});

/**
 * Type inference from the schema.
 */
export type CompleteOnboardingInput = z.infer<typeof CompleteOnboardingSchema>;

const nullableText = (max: number, message: string) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.string().max(max, message).nullable(),
  );

const nullableDate = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.coerce.date().nullable(),
);

/** Fields a user can update from Account Settings. */
export const UpdateProfileSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  phoneNumber: nullableText(30, "Phone number must be at most 30 characters"),
  company: nullableText(100, "Company must be at most 100 characters"),
  bio: nullableText(1000, "Bio must be at most 1000 characters"),
  dateOfBirth: nullableDate,
  gender: GenderEnum.nullable(),
  currencyPreference: CurrencyEnum,
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
