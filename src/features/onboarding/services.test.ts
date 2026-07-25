/**
 * Unit tests for onboarding services.
 *
 * Tests cover:
 *   - completeOnboarding atomic transaction
 *   - Profile creation
 *   - Workspace creation
 *   - WorkspaceMember creation with OWNER role
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { completeOnboarding } from "./services";
import type { CompleteOnboardingInput } from "./schemas";

// Mock the db module
vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(),
  },
}));

describe("Onboarding Services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("completeOnboarding", () => {
    it("should create Profile, Workspace, and WorkspaceMember in a transaction", async () => {
      const { db } = await import("@/lib/db");

      const mockProfile = {
        id: "profile-123",
        userId: "user-123",
        bio: "Test bio",
        dateOfBirth: new Date("2000-01-01"),
        gender: "MALE",
        currencyPreference: "USD",
        languagePreference: "en",
      };

      const mockWorkspace = {
        id: "workspace-123",
        name: "My Workspace",
        ownerId: "user-123",
      };

      const mockTransaction = vi.fn((callback) => {
        return callback({
          profile: {
            create: vi.fn().mockResolvedValue(mockProfile),
          },
          workspace: {
            create: vi.fn().mockResolvedValue(mockWorkspace),
          },
          workspaceMember: {
            create: vi.fn().mockResolvedValue({ id: "member-123" }),
          },
        });
      });

      vi.mocked(db.$transaction).mockImplementation(mockTransaction);

      const input: CompleteOnboardingInput = {
        bio: "Test bio",
        dateOfBirth: "2000-01-01T00:00:00Z",
        gender: "MALE",
        currencyPreference: "USD",
        languagePreference: "en",
      };

      const result = await completeOnboarding("user-123", input);

      expect(db.$transaction).toHaveBeenCalled();
      expect(result).toEqual({
        profile: mockProfile,
        workspace: mockWorkspace,
      });
    });

    it("should create Profile with correct data", async () => {
      const { db } = await import("@/lib/db");

      const mockProfile = {
        id: "profile-123",
        userId: "user-123",
        bio: null,
        dateOfBirth: new Date("2000-01-01"),
        gender: "FEMALE",
        currencyPreference: "IDR",
        languagePreference: "id",
      };

      const mockWorkspace = {
        id: "workspace-123",
        name: "My Workspace",
        ownerId: "user-123",
      };

      const mockProfileCreate = vi.fn().mockResolvedValue(mockProfile);
      const mockWorkspaceCreate = vi.fn().mockResolvedValue(mockWorkspace);
      const mockWorkspaceMemberCreate = vi
        .fn()
        .mockResolvedValue({ id: "member-123" });

      const mockTransaction = vi.fn((callback) => {
        return callback({
          profile: { create: mockProfileCreate },
          workspace: { create: mockWorkspaceCreate },
          workspaceMember: { create: mockWorkspaceMemberCreate },
        });
      });

      vi.mocked(db.$transaction).mockImplementation(mockTransaction);

      const input: CompleteOnboardingInput = {
        bio: null,
        dateOfBirth: "2000-01-01T00:00:00Z",
        gender: "FEMALE",
        currencyPreference: "IDR",
        languagePreference: "id",
      };

      await completeOnboarding("user-123", input);

      expect(mockProfileCreate).toHaveBeenCalledWith({
        data: {
          userId: "user-123",
          bio: null,
          dateOfBirth: new Date("2000-01-01T00:00:00Z"),
          gender: "FEMALE",
          currencyPreference: "IDR",
          languagePreference: "id",
        },
      });
    });

    it("should create Workspace with default name", async () => {
      const { db } = await import("@/lib/db");

      const mockProfile = {
        id: "profile-123",
        userId: "user-123",
        bio: null,
        dateOfBirth: new Date("2000-01-01"),
        gender: "MALE",
        currencyPreference: "USD",
        languagePreference: "en",
      };

      const mockWorkspace = {
        id: "workspace-123",
        name: "My Workspace",
        ownerId: "user-123",
      };

      const mockProfileCreate = vi.fn().mockResolvedValue(mockProfile);
      const mockWorkspaceCreate = vi.fn().mockResolvedValue(mockWorkspace);
      const mockWorkspaceMemberCreate = vi
        .fn()
        .mockResolvedValue({ id: "member-123" });

      const mockTransaction = vi.fn((callback) => {
        return callback({
          profile: { create: mockProfileCreate },
          workspace: { create: mockWorkspaceCreate },
          workspaceMember: { create: mockWorkspaceMemberCreate },
        });
      });

      vi.mocked(db.$transaction).mockImplementation(mockTransaction);

      const input: CompleteOnboardingInput = {
        bio: null,
        dateOfBirth: "2000-01-01T00:00:00Z",
        gender: "MALE",
        currencyPreference: "USD",
        languagePreference: "en",
      };

      await completeOnboarding("user-123", input);

      expect(mockWorkspaceCreate).toHaveBeenCalledWith({
        data: {
          name: "My Workspace",
          ownerId: "user-123",
        },
      });
    });

    it("should create WorkspaceMember with OWNER role", async () => {
      const { db } = await import("@/lib/db");

      const mockProfile = {
        id: "profile-123",
        userId: "user-123",
        bio: null,
        dateOfBirth: new Date("2000-01-01"),
        gender: "MALE",
        currencyPreference: "USD",
        languagePreference: "en",
      };

      const mockWorkspace = {
        id: "workspace-123",
        name: "My Workspace",
        ownerId: "user-123",
      };

      const mockProfileCreate = vi.fn().mockResolvedValue(mockProfile);
      const mockWorkspaceCreate = vi.fn().mockResolvedValue(mockWorkspace);
      const mockWorkspaceMemberCreate = vi
        .fn()
        .mockResolvedValue({ id: "member-123" });

      const mockTransaction = vi.fn((callback) => {
        return callback({
          profile: { create: mockProfileCreate },
          workspace: { create: mockWorkspaceCreate },
          workspaceMember: { create: mockWorkspaceMemberCreate },
        });
      });

      vi.mocked(db.$transaction).mockImplementation(mockTransaction);

      const input: CompleteOnboardingInput = {
        bio: null,
        dateOfBirth: "2000-01-01T00:00:00Z",
        gender: "MALE",
        currencyPreference: "USD",
        languagePreference: "en",
      };

      await completeOnboarding("user-123", input);

      expect(mockWorkspaceMemberCreate).toHaveBeenCalledWith({
        data: {
          workspaceId: "workspace-123",
          userId: "user-123",
          role: "OWNER",
        },
      });
    });

    it("should propagate transaction errors", async () => {
      const { db } = await import("@/lib/db");

      const mockTransaction = vi.fn(() => {
        throw new Error("Database error");
      });

      vi.mocked(db.$transaction).mockImplementation(mockTransaction);

      const input: CompleteOnboardingInput = {
        bio: null,
        dateOfBirth: "2000-01-01T00:00:00Z",
        gender: "MALE",
        currencyPreference: "USD",
        languagePreference: "en",
      };

      await expect(completeOnboarding("user-123", input)).rejects.toThrow(
        "Database error",
      );
    });

    it("rolls back the whole transaction when WorkspaceMember.create rejects (atomicity contract)", async () => {
      // Per ARCHITECTURE.md §3 the Profile+Workspace+WorkspaceMember creation
      // MUST be atomic: if the final insert fails, the prior two must NOT have
      // been committed. Prisma's `$transaction` callback guarantees this by
      // re-throwing the inner error so nothing persists; we assert the service
      // propagates that throw and the ordering (profile → workspace → member)
      // is preserved.
      const { db } = await import("@/lib/db");

      const mockProfileCreate = vi.fn().mockResolvedValue({
        id: "profile-123",
        userId: "user-123",
      });
      const mockWorkspaceCreate = vi.fn().mockResolvedValue({
        id: "workspace-123",
        name: "My Workspace",
        ownerId: "user-123",
      });
      // Final stage explodes → whole tx rejected.
      const mockWorkspaceMemberCreate = vi
        .fn()
        .mockRejectedValue(new Error("unique constraint violation"));

      const order: string[] = [];
      mockProfileCreate.mockImplementation(async () => {
        order.push("profile");
        return { id: "profile-123", userId: "user-123" };
      });
      mockWorkspaceCreate.mockImplementation(async () => {
        order.push("workspace");
        return {
          id: "workspace-123",
          name: "My Workspace",
          ownerId: "user-123",
        };
      });

      const mockTransaction = vi.fn(
        async (callback: (tx: unknown) => Promise<unknown>) =>
          callback({
            profile: { create: mockProfileCreate },
            workspace: { create: mockWorkspaceCreate },
            workspaceMember: { create: mockWorkspaceMemberCreate },
          }),
      );
      vi.mocked(db.$transaction).mockImplementation(mockTransaction as never);

      const input: CompleteOnboardingInput = {
        bio: null,
        dateOfBirth: "2000-01-01T00:00:00Z",
        gender: "MALE",
        currencyPreference: "USD",
        languagePreference: "en",
      };

      await expect(completeOnboarding("user-123", input)).rejects.toThrow(
        "unique constraint violation",
      );
      // Order is preserved: profile first, workspace second, member last.
      expect(order).toEqual(["profile", "workspace"]);
      expect(mockWorkspaceMemberCreate).toHaveBeenCalledTimes(1);
    });

    it("converts the ISO-8601 dateOfBirth string to a Date instance when persisting the Profile", async () => {
      // The service contract: `data.dateOfBirth` arrives as an ISO string
      // (validated by CompleteOnboardingSchema) and is stored as a Date.
      const { db } = await import("@/lib/db");

      const mockProfileCreate = vi.fn().mockResolvedValue({
        id: "profile-123",
        userId: "user-456",
      });
      const mockTransaction = vi.fn(
        async (callback: (tx: unknown) => Promise<unknown>) =>
          callback({
            profile: { create: mockProfileCreate },
            workspace: {
              create: vi
                .fn()
                .mockResolvedValue({
                  id: "w",
                  name: "My Workspace",
                  ownerId: "user-456",
                }),
            },
            workspaceMember: { create: vi.fn().mockResolvedValue({ id: "m" }) },
          }),
      );
      vi.mocked(db.$transaction).mockImplementation(mockTransaction as never);

      const iso = "1995-06-15T12:00:00.000Z";
      const input: CompleteOnboardingInput = {
        bio: "hello",
        dateOfBirth: iso,
        gender: "OTHER",
        currencyPreference: "EUR",
        languagePreference: "es",
      };

      await completeOnboarding("user-456", input);

      const persisted = mockProfileCreate.mock.calls[0][0] as {
        data: { dateOfBirth: unknown; userId: string; bio: string };
      };
      expect(persisted.data.dateOfBirth).toBeInstanceOf(Date);
      expect((persisted.data.dateOfBirth as Date).toISOString()).toBe(iso);
      // userId is propagated from the caller, not derived from the payload.
      expect(persisted.data.userId).toBe("user-456");
      expect(persisted.data.bio).toBe("hello");
    });
  });
});
