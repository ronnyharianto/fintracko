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

    vi.mocked(withSession).mockImplementation(async (request, callback) => {
      return callback(mockSession as any);
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

    const mockRequest = {} as any;
    const response = await POST(mockRequest);

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
    const { failure } = await import("@/lib/api/envelope");

    const mockSession = { userId: "user-123" };
    const mockErrorResponse = {
      success: false,
      error: { code: "VALIDATION_ERROR" },
    };

    vi.mocked(withSession).mockImplementation(async (request, callback) => {
      return callback(mockSession as any);
    });

    vi.mocked(validateBody).mockResolvedValue({
      success: false,
      response: mockErrorResponse as any,
    });

    const mockRequest = {} as any;
    const response = await POST(mockRequest);

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

    vi.mocked(withSession).mockImplementation(async (request, callback) => {
      return callback(mockSession as any);
    });

    vi.mocked(validateBody).mockResolvedValue({
      success: true,
      data: mockValidatedData,
    });

    vi.mocked(sanitizeObject).mockReturnValue(mockValidatedData);

    vi.mocked(completeOnboarding).mockRejectedValue(
      new Error("Database error"),
    );

    const mockRequest = {} as any;
    const response = await POST(mockRequest);

    expect(failure).toHaveBeenCalledWith(
      "INTERNAL_SERVER_ERROR",
      "Failed to complete onboarding. Please try again.",
    );
  });
});
