/**
 * Unit tests for onboarding API endpoint.
 *
 * Tests cover:
 *   - Session validation
 *   - Request body validation
 *   - Successful onboarding completion
 *   - Error handling
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

// Mock dependencies
vi.mock("@/lib/api/session", () => ({
  withSession: vi.fn(),
}));

vi.mock("@/lib/api/validate", () => ({
  validateBody: vi.fn(),
}));

vi.mock("@/lib/api/sanitize", () => ({
  sanitizeObject: vi.fn((data) => data),
}));

vi.mock("@/lib/api/envelope", () => ({
  success: vi.fn((data) => ({ success: true, data })),
  failure: vi.fn((code, message) => ({
    success: false,
    error: { code, message },
  })),
}));

vi.mock("@/features/onboarding/schemas", () => ({
  CompleteOnboardingSchema: {
    safeParse: vi.fn(),
  },
}));

vi.mock("@/features/onboarding/services", () => ({
  completeOnboarding: vi.fn(),
}));

describe("POST /api/v1/onboarding/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return success when onboarding completes successfully", async () => {
    const { withSession } = await import("@/lib/api/session");
    const { validateBody } = await import("@/lib/api/validate");
    const { sanitizeObject } = await import("@/lib/api/sanitize");
    const { success } = await import("@/lib/api/envelope");
    const { completeOnboarding } =
      await import("@/features/onboarding/services");

    const mockSession = { userId: "user-123" };
    const mockValidatedData = {
      bio: "Test bio",
      dateOfBirth: "2000-01-01T00:00:00Z",
      gender: "MALE",
      currencyPreference: "USD",
      languagePreference: "en",
    };

    vi.mocked(withSession).mockImplementation(async (_request, callback) => {
      return callback(mockSession as never);
    });

    vi.mocked(validateBody).mockResolvedValue({
      success: true,
      data: mockValidatedData,
    });

    vi.mocked(sanitizeObject).mockReturnValue(mockValidatedData);

    vi.mocked(completeOnboarding).mockResolvedValue({
      profile: {
        id: "profile-123",
        userId: "user-123",
        bio: "Test bio",
        dateOfBirth: new Date("2000-01-01"),
        gender: "MALE",
        currencyPreference: "USD",
        languagePreference: "en",
        phoneNumber: null,
        company: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      workspace: {
        id: "workspace-123",
        name: "My Workspace",
        ownerId: "user-123",
        createdAt: new Date(),
      },
    });

    await POST({} as never);

    expect(withSession).toHaveBeenCalled();
    expect(validateBody).toHaveBeenCalled();
    expect(sanitizeObject).toHaveBeenCalled();
    expect(completeOnboarding).toHaveBeenCalledWith(
      "user-123",
      mockValidatedData,
    );
    expect(success).toHaveBeenCalled();
  });

  it("should return validation error when request body is invalid", async () => {
    const { withSession } = await import("@/lib/api/session");
    const { validateBody } = await import("@/lib/api/validate");

    const mockSession = { userId: "user-123" };
    const mockErrorResponse = {
      success: false,
      error: { code: "VALIDATION_ERROR" },
    };

    vi.mocked(withSession).mockImplementation(async (_request, callback) => {
      return callback(mockSession as never);
    });

    vi.mocked(validateBody).mockResolvedValue({
      success: false,
      response: mockErrorResponse as never,
    });

    const response = await POST({} as never);

    expect(validateBody).toHaveBeenCalled();
    expect(response).toEqual(mockErrorResponse);
  });

  it("should return internal server error when onboarding fails", async () => {
    const { withSession } = await import("@/lib/api/session");
    const { validateBody } = await import("@/lib/api/validate");
    const { sanitizeObject } = await import("@/lib/api/sanitize");
    const { failure } = await import("@/lib/api/envelope");
    const { completeOnboarding } =
      await import("@/features/onboarding/services");

    const mockSession = { userId: "user-123" };
    const mockValidatedData = {
      bio: "Test bio",
      dateOfBirth: "2000-01-01T00:00:00Z",
      gender: "MALE",
      currencyPreference: "USD",
      languagePreference: "en",
    };

    vi.mocked(withSession).mockImplementation(async (_request, callback) => {
      return callback(mockSession as never);
    });

    vi.mocked(validateBody).mockResolvedValue({
      success: true,
      data: mockValidatedData,
    });

    vi.mocked(sanitizeObject).mockReturnValue(mockValidatedData);

    vi.mocked(completeOnboarding).mockRejectedValue(
      new Error("Database error"),
    );

    await POST({} as never);

    expect(failure).toHaveBeenCalledWith(
      "INTERNAL_SERVER_ERROR",
      "Failed to complete onboarding. Please try again.",
    );
  });

  // --- Additional negative / edge / dependency-mock coverage ---
  //
  // These tests close the gaps the audit surfaced:
  //   1. Unauthorized session → withSession short-circuits; business logic
  //      (validateBody / sanitizeObject / completeOnboarding) is NEVER invoked.
  //   2. Validation failure → returns the failure envelope verbatim; the
  //      downstream sanitize + service stages are NEVER invoked.
  //   3. Success path exposes ONLY a whitelist of profile/workspace fields
  //      (never the raw database row, e.g. no `userId`, no `ownerId`,
  //      no `createdAt`) — defensive against response-shape leakage.
  //   4. Sanitization runs on the exact validated payload (XSS contract).
  //   5. Internal errors never echo the underlying exception message
  //      (AGENT_RULES.md §3 sensitive data handling).
});

describe("POST /api/v1/onboarding/complete — short-circuit / dependency contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the withSession failure response verbatim on an unauthorized request and never touches downstream stages", async () => {
    const { withSession } = await import("@/lib/api/session");
    const { validateBody } = await import("@/lib/api/validate");
    const { sanitizeObject } = await import("@/lib/api/sanitize");
    const { completeOnboarding } =
      await import("@/features/onboarding/services");

    const unauthorizedEnvelope = {
      success: false as const,
      error: { code: "UNAUTHORIZED", message: "auth required" },
      timestamp: "2026-07-25T00:00:00.000Z",
    };
    // Simulate withSession rejecting the request before invoking its callback.
    vi.mocked(withSession).mockResolvedValue(unauthorizedEnvelope as never);

    const response = await POST({} as never);

    expect(response).toBe(unauthorizedEnvelope);
    expect(validateBody).not.toHaveBeenCalled();
    expect(sanitizeObject).not.toHaveBeenCalled();
    expect(completeOnboarding).not.toHaveBeenCalled();
  });

  it("does NOT invoke sanitizeObject or completeOnboarding when validation fails", async () => {
    const { withSession } = await import("@/lib/api/session");
    const { validateBody } = await import("@/lib/api/validate");
    const { sanitizeObject } = await import("@/lib/api/sanitize");
    const { completeOnboarding } =
      await import("@/features/onboarding/services");

    vi.mocked(withSession).mockImplementation(async (_req, callback) =>
      callback({ userId: "user-123" } as never),
    );
    const validationEnvelope = {
      success: false as const,
      error: { code: "VALIDATION_ERROR", message: "bad body" },
      timestamp: "2026-07-25T00:00:00.000Z",
    };
    vi.mocked(validateBody).mockResolvedValue({
      success: false,
      response: validationEnvelope as never,
    });

    const response = await POST({} as never);

    expect(response).toBe(validationEnvelope);
    expect(sanitizeObject).not.toHaveBeenCalled();
    expect(completeOnboarding).not.toHaveBeenCalled();
  });

  it("exposes only a whitelisted subset of profile/workspace fields on success (no internal ids/timestamps leak)", async () => {
    const { withSession } = await import("@/lib/api/session");
    const { validateBody } = await import("@/lib/api/validate");
    const { sanitizeObject } = await import("@/lib/api/sanitize");
    const { completeOnboarding } =
      await import("@/features/onboarding/services");
    const { success } = await import("@/lib/api/envelope");

    vi.mocked(withSession).mockImplementation(async (_req, callback) =>
      callback({ userId: "user-123" } as never),
    );
    vi.mocked(validateBody).mockResolvedValue({
      success: true,
      data: {
        bio: "<script>x</script>Bob",
        dateOfBirth: "2000-01-01T00:00:00.000Z",
        gender: "MALE",
        currencyPreference: "USD",
        languagePreference: "en",
      },
    });
    // Sanitize is passthrough here; its behavior is unit-covered elsewhere.
    vi.mocked(sanitizeObject).mockImplementation((data) => data);
    vi.mocked(completeOnboarding).mockResolvedValue({
      // The raw row carries sensitive/internal fields that must NOT be echoed.
      profile: {
        id: "profile-123",
        userId: "user-123", // must NOT leak to the client
        bio: "Bob",
        dateOfBirth: new Date("2000-01-01"),
        gender: "MALE",
        currencyPreference: "USD",
        languagePreference: "en",
        phoneNumber: "+1-555-0100", // must NOT leak
        company: "Acme", // must NOT leak
        createdAt: new Date(), // must NOT leak
        updatedAt: new Date(), // must NOT leak
      },
      workspace: {
        id: "workspace-123",
        name: "My Workspace",
        ownerId: "user-123", // must NOT leak to the client
        createdAt: new Date(), // must NOT leak
      },
    });

    await POST({} as never);

    expect(success).toHaveBeenCalledTimes(1);
    const envelope = vi.mocked(success).mock.calls[0][0] as {
      profile?: Record<string, unknown>;
      workspace?: Record<string, unknown>;
    };
    // Whitelisted profile fields.
    expect(envelope.profile).toEqual({
      id: "profile-123",
      bio: "Bob",
      currencyPreference: "USD",
      languagePreference: "en",
    });
    // Whitelisted workspace fields.
    expect(envelope.workspace).toEqual({
      id: "workspace-123",
      name: "My Workspace",
    });
    // Spot-check the internal fields are absent.
    expect(envelope.profile).not.toHaveProperty("userId");
    expect(envelope.profile).not.toHaveProperty("phoneNumber");
    expect(envelope.profile).not.toHaveProperty("company");
    expect(envelope.profile).not.toHaveProperty("dateOfBirth");
    expect(envelope.workspace).not.toHaveProperty("ownerId");
    expect(envelope.workspace).not.toHaveProperty("createdAt");
  });

  it("forwards the validated payload (NOT the raw request) to sanitizeObject", async () => {
    const { withSession } = await import("@/lib/api/session");
    const { validateBody } = await import("@/lib/api/validate");
    const { sanitizeObject } = await import("@/lib/api/sanitize");
    const { completeOnboarding } =
      await import("@/features/onboarding/services");

    vi.mocked(withSession).mockImplementation(async (_req, callback) =>
      callback({ userId: "user-123" } as never),
    );
    const validatedData = {
      bio: null,
      dateOfBirth: "2000-01-01T00:00:00.000Z",
      gender: "FEMALE",
      currencyPreference: "IDR",
      languagePreference: "id",
    };
    vi.mocked(validateBody).mockResolvedValue({
      success: true,
      data: validatedData,
    });
    vi.mocked(sanitizeObject).mockImplementation((data) => data);
    vi.mocked(completeOnboarding).mockResolvedValue({
      profile: {
        id: "p",
        bio: null,
        currencyPreference: "IDR",
        languagePreference: "id",
      },
      workspace: { id: "w", name: "My Workspace" },
      // Cast through `never`: the mock is intentionally partial — the route
      // handler only reads a whitelist of fields, asserted below.
    } as never);

    await POST({} as never);
    expect(sanitizeObject).toHaveBeenCalledTimes(1);
    expect(sanitizeObject).toHaveBeenCalledWith(validatedData);
    expect(completeOnboarding).toHaveBeenCalledWith("user-123", validatedData);
  });
});
