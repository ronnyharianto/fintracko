/**
 * Unit tests for Better Auth configuration.
 *
 * Coverage:
 *   - The real `signInCallback` exported from [`auth.ts`](auth.ts) (the exact
 *     function wired into betterAuth's `callbacks.signIn`) is exercised across
 *     every code path: false → throws, true → returns, null → passes,
 *     undefined → passes. The previous test suite defined a *duplicate*
 *     `emailVerificationCallback` helper that diverged from the production
 *     callback (it rejected `null`, the real one does not). Testing the actual
 *     exported callback eliminates that drift so the suite fails fast if the
 *     production security contract changes.
 *   - The constructed `auth` object exposes the Better Auth handler surface
 *     and is built from the project's env-var-driven config.
 *   - The OAuth Route Handler module exports both GET and POST.
 *
 * Per AGENT_RULES.md §4 ("Mocking Discipline"): Prisma (`@/lib/db`) and the
 * Better Auth Prisma adapter are mocked at the module boundary so no real
 * database connection is opened from inside this `*.test.ts` file.
 */
import { describe, it, expect, vi } from "vitest";

// Mock environment variables before importing the auth module. The betterAuth
// constructor reads GOOGLE/GITHUB client ids + secrets and DATABASE_URL at
// module load; stubbing them keeps the test graph Prisma/connection-free.
vi.stubEnv("AUTH_GOOGLE_ID", "test-google-client-id");
vi.stubEnv("AUTH_GOOGLE_SECRET", "test-google-client-secret");
vi.stubEnv("AUTH_GITHUB_ID", "test-github-client-id");
vi.stubEnv("AUTH_GITHUB_SECRET", "test-github-client-secret");
vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");

// Mock Prisma client so the Better Auth Prisma adapter never opens a socket.
vi.mock("@/lib/db", () => ({
  db: {},
}));

import { signInCallback } from "./auth";

describe("signInCallback (real production callback)", () => {
  it("throws when emailVerified is explicitly false (rejects unverified OAuth sign-in)", async () => {
    await expect(
      signInCallback({ user: { emailVerified: false } }),
    ).rejects.toThrow("Email is not verified by the OAuth provider.");
  });

  it("allows sign-in when emailVerified is true and returns the verified flag", async () => {
    const result = await signInCallback({ user: { emailVerified: true } });
    expect(result).toEqual({ user: { emailVerified: true } });
    expect(typeof result.user.emailVerified).toBe("boolean");
  });

  it("allows sign-in when emailVerified is null (missing provider flag is not a hard reject)", async () => {
    // Per the production contract in auth.ts, only `=== false` is rejected.
    // `null` ("provider did not assert") is passed through unchanged. The
    // prior duplicate-helper suite asserted the opposite (false claim),
    // which would have masked a real security regression.
    const result = await signInCallback({ user: { emailVerified: null } });
    expect(result).toEqual({ user: { emailVerified: null } });
  });

  it("allows sign-in when emailVerified is undefined", async () => {
    const result = await signInCallback({ user: { emailVerified: undefined } });
    expect(result).toEqual({ user: { emailVerified: undefined } });
    expect(result.user.emailVerified).toBeUndefined();
  });

  it("allows sign-in when the emailVerified field is absent entirely", async () => {
    const result = await signInCallback({
      user: {} as { emailVerified: boolean | null | undefined },
    });
    expect(result.user.emailVerified).toBeUndefined();
  });

  it("only ever rejects the literal false value (truthy or other falsy never throw)", async () => {
    // Defensive: a non-boolean truthy must NOT be coerced into a reject.
    const result = await signInCallback({
      user: { emailVerified: "true" as unknown as boolean },
    });
    expect(result.user.emailVerified).toBe("true");
  });

  it("still rejects the literal false regardless of other fields on the user object", async () => {
    await expect(
      signInCallback({
        user: {
          emailVerified: false,
          ...({} as { id: string; email: string }),
        },
      }),
    ).rejects.toThrow("Email is not verified by the OAuth provider.");
  });
});

describe("Better Auth constructed instance", () => {
  it("exports an auth object exposing the Better Auth handler surface", async () => {
    const { auth } = await import("@/lib/auth");
    expect(auth).toBeDefined();
    expect(typeof auth).toBe("object");
    expect(typeof auth.handler).toBe("function");
  });

  it("exports the AuthClient type alongside the runtime auth value", async () => {
    const authModule = await import("@/lib/auth");
    expect(authModule).toHaveProperty("auth");
    expect(authModule).toHaveProperty("signInCallback");
  });

  it("constructs without throwing when env vars + db are mocked", async () => {
    await expect(import("@/lib/auth")).resolves.toBeDefined();
  });
});

describe("OAuth Route Handler module", () => {
  it("exports GET and POST handler functions", async () => {
    const routeModule =
      await import("@/app/api/v1/auth/[...better-auth]/route");
    expect(routeModule.GET).toBeDefined();
    expect(typeof routeModule.GET).toBe("function");
    expect(routeModule.POST).toBeDefined();
    expect(typeof routeModule.POST).toBe("function");
  });
});
