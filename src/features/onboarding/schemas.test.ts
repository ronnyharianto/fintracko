/**
 * Unit tests for onboarding schemas.
 *
 * Tests cover:
 *   - CompleteOnboardingSchema validation
 *   - Required fields validation
 *   - Enum validation for gender, currency, language
 *   - Optional fields handling
 */

import { describe, it, expect } from "vitest";
import {
  CompleteOnboardingSchema,
  GenderEnum,
  CurrencyEnum,
  LanguageEnum,
} from "./schemas";

describe("Onboarding Schemas", () => {
  describe("GenderEnum", () => {
    it("should accept valid gender values", () => {
      expect(GenderEnum.safeParse("MALE").success).toBe(true);
      expect(GenderEnum.safeParse("FEMALE").success).toBe(true);
      expect(GenderEnum.safeParse("OTHER").success).toBe(true);
    });

    it("should reject invalid gender values", () => {
      expect(GenderEnum.safeParse("INVALID").success).toBe(false);
      expect(GenderEnum.safeParse("male").success).toBe(false);
      expect(GenderEnum.safeParse("").success).toBe(false);
    });
  });

  describe("CurrencyEnum", () => {
    it("should accept valid currency values", () => {
      expect(CurrencyEnum.safeParse("USD").success).toBe(true);
      expect(CurrencyEnum.safeParse("IDR").success).toBe(true);
      expect(CurrencyEnum.safeParse("EUR").success).toBe(true);
      expect(CurrencyEnum.safeParse("GBP").success).toBe(true);
      expect(CurrencyEnum.safeParse("JPY").success).toBe(true);
      expect(CurrencyEnum.safeParse("SGD").success).toBe(true);
    });

    it("should reject invalid currency values", () => {
      expect(CurrencyEnum.safeParse("INVALID").success).toBe(false);
      expect(CurrencyEnum.safeParse("usd").success).toBe(false);
    });
  });

  describe("LanguageEnum", () => {
    it("should accept valid language values", () => {
      expect(LanguageEnum.safeParse("en").success).toBe(true);
      expect(LanguageEnum.safeParse("id").success).toBe(true);
      expect(LanguageEnum.safeParse("es").success).toBe(true);
    });

    it("should reject invalid language values", () => {
      expect(LanguageEnum.safeParse("INVALID").success).toBe(false);
      expect(LanguageEnum.safeParse("EN").success).toBe(false);
    });
  });

  describe("CompleteOnboardingSchema", () => {
    it("should accept valid complete onboarding data", () => {
      const validData = {
        bio: "Test bio",
        dateOfBirth: "2000-01-01T00:00:00Z",
        gender: "MALE" as const,
        currencyPreference: "USD" as const,
        languagePreference: "en" as const,
      };

      const result = CompleteOnboardingSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should accept data without bio (optional field)", () => {
      const validData = {
        dateOfBirth: "2000-01-01T00:00:00Z",
        gender: "FEMALE" as const,
        currencyPreference: "IDR" as const,
        languagePreference: "id" as const,
      };

      const result = CompleteOnboardingSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bio).toBeUndefined();
      }
    });

    it("should accept null bio", () => {
      const validData = {
        bio: null,
        dateOfBirth: "2000-01-01T00:00:00Z",
        gender: "OTHER" as const,
        currencyPreference: "EUR" as const,
        languagePreference: "es" as const,
      };

      const result = CompleteOnboardingSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject missing required fields", () => {
      const invalidData = {
        bio: "Test bio",
      };

      const result = CompleteOnboardingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject invalid date format", () => {
      const invalidData = {
        bio: "Test bio",
        dateOfBirth: "2000-01-01", // Not ISO datetime
        gender: "MALE" as const,
        currencyPreference: "USD" as const,
        languagePreference: "en" as const,
      };

      const result = CompleteOnboardingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject bio longer than 500 characters", () => {
      const invalidData = {
        bio: "a".repeat(501),
        dateOfBirth: "2000-01-01T00:00:00Z",
        gender: "MALE" as const,
        currencyPreference: "USD" as const,
        languagePreference: "en" as const,
      };

      const result = CompleteOnboardingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject invalid gender enum", () => {
      const invalidData = {
        bio: "Test bio",
        dateOfBirth: "2000-01-01T00:00:00Z",
        gender: "INVALID" as const,
        currencyPreference: "USD" as const,
        languagePreference: "en" as const,
      };

      const result = CompleteOnboardingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject invalid currency enum", () => {
      const invalidData = {
        bio: "Test bio",
        dateOfBirth: "2000-01-01T00:00:00Z",
        gender: "MALE" as const,
        currencyPreference: "INVALID" as const,
        languagePreference: "en" as const,
      };

      const result = CompleteOnboardingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject invalid language enum", () => {
      const invalidData = {
        bio: "Test bio",
        dateOfBirth: "2000-01-01T00:00:00Z",
        gender: "MALE" as const,
        currencyPreference: "USD" as const,
        languagePreference: "INVALID" as const,
      };

      const result = CompleteOnboardingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should REJECT a non-UTC datetime that carries a timezone offset (zod .datetime() requires trailing Z)", () => {
      const invalidData = {
        dateOfBirth: "2000-01-01T00:00:00+07:00",
        gender: "MALE" as const,
        currencyPreference: "USD" as const,
        languagePreference: "en" as const,
      };
      expect(CompleteOnboardingSchema.safeParse(invalidData).success).toBe(
        false,
      );
    });

    it("should ACCEPT a bio at exactly the 500-character boundary", () => {
      const validData = {
        bio: "a".repeat(500),
        dateOfBirth: "2000-01-01T00:00:00Z",
        gender: "MALE" as const,
        currencyPreference: "USD" as const,
        languagePreference: "en" as const,
      };
      expect(CompleteOnboardingSchema.safeParse(validData).success).toBe(true);
    });

    it("should ACCEPT an empty-string bio (optional+nullable; emptiness is not a rejection)", () => {
      const validData = {
        bio: "",
        dateOfBirth: "2000-01-01T00:00:00Z",
        gender: "FEMALE" as const,
        currencyPreference: "IDR" as const,
        languagePreference: "id" as const,
      };
      expect(CompleteOnboardingSchema.safeParse(validData).success).toBe(true);
    });

    it("should reject `null` at the top level (the whole payload must be an object)", () => {
      expect(CompleteOnboardingSchema.safeParse(null).success).toBe(false);
    });

    it("should reject `undefined` at the top level", () => {
      expect(CompleteOnboardingSchema.safeParse(undefined).success).toBe(false);
    });

    it("should reject an array payload (object schema, not array)", () => {
      expect(CompleteOnboardingSchema.safeParse(["MALE", "USD"]).success).toBe(
        false,
      );
    });

    it("should reject unknown extra keys stripping OR depending on zod default — confirm required fields still validated", () => {
      // Zod v4 object is non-strict by default (extra keys stripped), so a
      // payload with extra keys that ALSO has all required valid fields should
      // parse successfully. This pins that contract so a future `.strict()`
      // flip surfaces here as a deliberate change.
      const data = {
        bio: null,
        dateOfBirth: "2000-01-01T00:00:00Z",
        gender: "OTHER" as const,
        currencyPreference: "EUR" as const,
        languagePreference: "es" as const,
        surprise: "extra-field",
      };
      const result = CompleteOnboardingSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("surprise");
      }
    });
  });

  describe("Type inference sanity (CompleteOnboardingInput)", () => {
    it("compile-time inferred shape matches the runtime schema output", () => {
      // A static-type assertion: assigning a fully-valid object to the
      // inferred type MUST typecheck. The runtime round-trip is the
      // meaningful part — if the inferred type drifts from the schema this
      // line errors at compile time.
      const value: import("./schemas").CompleteOnboardingInput = {
        bio: "ok",
        dateOfBirth: "2000-01-01T00:00:00Z",
        gender: "MALE",
        currencyPreference: "USD",
        languagePreference: "en",
      };
      const result = CompleteOnboardingSchema.safeParse(value);
      expect(result.success).toBe(true);
    });
  });
});
