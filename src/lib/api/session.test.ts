/**
 * Unit tests for the Better Auth session extraction pipeline handler.
 *
 * Validates the "Session & Identity Extraction" step declared in
 * docs/architecture/API_SPECS.md §2 against the helpers exported from
 * [`session.ts`](session.ts).
 *
 * The auth instance is injected (no real Better Auth / Prisma adapter is
 * constructed) so the suite stays pure-unit and exercises every branch:
 *   - happy path: getSession returns a session → withSession calls onSuccess
 *   - missing session → UNAUTHORIZED 401 envelope, onSuccess NOT invoked
 *   - getSession returns `null` → UNAUTHORIZED 401
 *   - getSession returns a session missing `user.id` → UNAUTHORIZED 401
 *   - getSession throws → UNAUTHORIZED 401, error swallowed (no leak)
 *   - onSuccess return value is forwarded verbatim
 */
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  resolveSession,
  withSession,
  type AuthLike,
  type SessionLike,
} from "./session";
import { success } from "./envelope";

/**
 * Constructs a fake `AuthLike` whose `api.getSession` resolves to the
 * provided value or rejects with the provided error.
 */
function fakeAuth(
  behavior:
    | { kind: "resolve"; session: SessionLike | null }
    | { kind: "reject"; error: unknown },
): AuthLike {
  return {
    api: {
      getSession: vi.fn(async () => {
        if (behavior.kind === "resolve") {
          return behavior.session;
        }
        throw behavior.error;
      }),
    },
  };
}

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/test", {
    method: "POST",
    headers: { cookie: "session=fake-session-cookie" },
  });
}

describe("resolveSession", () => {
  it("returns success:true with the session when getSession resolves a session", async () => {
    const authLike = fakeAuth({
      kind: "resolve",
      session: { user: { id: "user-123", emailVerified: true } },
    });
    const result = await resolveSession(makeRequest(), authLike);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.session.user.id).toBe("user-123");
      expect(result.session.user.emailVerified).toBe(true);
    }
  });

  it("returns success:false with UNAUTHORIZED 401 envelope when no session found", async () => {
    const authLike = fakeAuth({ kind: "resolve", session: null });
    const result = await resolveSession(makeRequest(), authLike);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(401);
      const body = await result.response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
      expect(body.error.message).toContain("Authentication required");
    }
  });

  it("returns UNAUTHORIZED when the session is present but `user.id` is missing", async () => {
    const authLike = fakeAuth({
      kind: "resolve",
      session: { user: { id: "" } } as unknown as SessionLike,
    });
    const result = await resolveSession(makeRequest(), authLike);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(401);
    }
  });

  it("swallows a thrown getSession error and surfaces it as UNAUTHORIZED (no leak)", async () => {
    const authLike = fakeAuth({
      kind: "reject",
      // A noisy internal error message — its message body must NOT appear
      // in the response envelope (AGENT_RULES.md §3 sensitive data handling).
      error: new Error("internal: prisma connection refused at db:5432"),
    });
    const result = await resolveSession(makeRequest(), authLike);
    expect(result.success).toBe(false);
    if (!result.success) {
      const body = await result.response.json();
      expect(body.error.code).toBe("UNAUTHORIZED");
      expect(body.error.message).not.toContain("prisma");
      expect(body.error.message).not.toContain("5432");
      expect(body.error.message).not.toContain("internal");
    }
  });
});

describe("withSession", () => {
  it("calls onSuccess with the resolved AuthContext and returns its NextResponse verbatim", async () => {
    const authLike = fakeAuth({
      kind: "resolve",
      session: { user: { id: "user-abc", emailVerified: true } },
    });
    const onSpy = vi.fn(async () => success({ ok: true }));

    const response = await withSession(makeRequest(), onSpy, authLike);

    expect(onSpy).toHaveBeenCalledTimes(1);
    expect(onSpy).toHaveBeenCalledWith({
      userId: "user-abc",
      session: { user: { id: "user-abc", emailVerified: true } },
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ ok: true });
  });

  it("short-circuits before calling onSuccess when the session is missing", async () => {
    const authLike = fakeAuth({ kind: "resolve", session: null });
    const onSpy = vi.fn(async () => success({ ok: true }));

    const response = await withSession(makeRequest(), onSpy, authLike);

    expect(onSpy).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
