/**
 * Unit tests for the composable pipeline orchestrator.
 *
 * Validates the wiring of the three Task 2.3 pipeline stages
 * (session → validate → sanitize) declared in [`pipeline.ts`](pipeline.ts).
 *
 * Per-stage behavior is unit-covered by the co-located suites for
 * [`session.ts`](session.ts), [`validate.ts`](validate.ts), and
 * [`sanitize.ts`](sanitize.ts). THIS suite only asserts orchestrator-level
 * semantics:
 *   - happy path: all stages pass → handler invoked with typed ctx
 *   - session failure → short-circuits with UNAUTHORIZED 401, handler NOT called
 *   - validation failure → short-circuits with VALIDATION_ERROR 422, NOT called
 *   - sanitization runs on the validated payload before handing to handler
 *   - skipSanitization:true bypasses the XSS walk
 *   - the authInstance injection seam is honored (no production auth loaded)
 */
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";
import { runPipeline, withPipeline } from "./pipeline";
import { success } from "./envelope";
import type { AuthLike, SessionLike } from "./session";

function authLike(session: SessionLike | null): AuthLike {
  return {
    api: {
      getSession: vi.fn(async () => session),
    },
  };
}

function jsonRequest(body: unknown): NextRequest {
  if (body === undefined) {
    return new NextRequest("http://localhost:3000/api/v1/test", {
      method: "POST",
    });
  }
  return new NextRequest("http://localhost:3000/api/v1/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const schema = z.object({
  name: z.string().min(1),
  bio: z.string().max(500).nullable().optional(),
});

const AUTH_USER_ID = "user-pipeline-001";

describe("runPipeline — happy path", () => {
  it("runs all three stages and returns ok:true with a typed PipelineContext", async () => {
    const request = jsonRequest({
      name: "<script>alert(1)</script>Bob",
      bio: '<img src=x onerror="alert(2)">hi',
    });
    const result = await runPipeline(request, schema, {
      authInstance: authLike({ user: { id: AUTH_USER_ID } }),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ctx.auth.userId).toBe(AUTH_USER_ID);
      // Sanitization stripped the script iframe / onerror vector but kept text.
      expect(result.ctx.validated.name).toBe("Bob");
      expect(result.ctx.validated.bio).toContain("hi");
      expect(result.ctx.validated.bio).not.toContain("onerror");
    }
  });
});

describe("runPipeline — session failure short-circuits", () => {
  it("returns ok:false with UNAUTHORIZED 401 envelope when no session resolves", async () => {
    const result = await runPipeline(jsonRequest({ name: "x" }), schema, {
      authInstance: authLike(null),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      const body = await result.response.json();
      expect(body.error.code).toBe("UNAUTHORIZED");
    }
  });
});

describe("runPipeline — validation failure short-circuits (after session passes)", () => {
  it("returns ok:false with VALIDATION_ERROR 422 for a body missing required fields", async () => {
    const result = await runPipeline(
      jsonRequest({ bio: "only an optional field" }),
      schema,
      { authInstance: authLike({ user: { id: AUTH_USER_ID } }) },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(422);
      const body = await result.response.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
      // name missing -> validation error attached
      const paths = body.error.validationErrors.map(
        (e: { path: string }) => e.path,
      );
      expect(paths).toContain("name");
    }
  });

  it("returns ok:false with BAD_REQUEST 400 for non-JSON bodies", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/test", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "not-json",
    });
    const result = await runPipeline(req, schema, {
      authInstance: authLike({ user: { id: AUTH_USER_ID } }),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error.code).toBe("BAD_REQUEST");
    }
  });
});

describe("runPipeline — sanitization control", () => {
  it("applies sanitization when options.skipSanitization is omitted (default safe)", async () => {
    const request = jsonRequest({
      name: "<script>evil</script>safe",
    });
    const result = await runPipeline(request, schema, {
      authInstance: authLike({ user: { id: AUTH_USER_ID } }),
    });
    if (result.ok) {
      expect(result.ctx.validated.name).toBe("safe");
      expect(result.ctx.validated.name).not.toContain("script");
    }
  });

  it("preserves raw payload verbatim when skipSanitization:true is requested", async () => {
    const request = jsonRequest({
      name: "<script>is-there</script>kept",
    });
    const result = await runPipeline(request, schema, {
      authInstance: authLike({ user: { id: AUTH_USER_ID } }),
      skipSanitization: true,
    });
    if (result.ok) {
      // skipSanitization means the XSS vector survives — the handler opted in.
      expect(result.ctx.validated.name).toContain("script");
      // Non-string leaves still untouched by the walk.
      expect(result.ctx.validated.bio).toBeUndefined();
    }
  });
});

describe("withPipeline — handler invocation contract", () => {
  it("invokes the handler with the typed ctx and forwards its NextResponse verbatim on success", async () => {
    const handler = vi.fn(async () => success({ workspaceId: "created-id" }));

    const response = await withPipeline(
      jsonRequest({ name: "Workspace", bio: null }),
      schema,
      handler,
      { authInstance: authLike({ user: { id: AUTH_USER_ID } }) },
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: { userId: AUTH_USER_ID, session: { user: { id: AUTH_USER_ID } } },
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual({ workspaceId: "created-id" });
  });

  it("does NOT invoke the handler when the session stage fails", async () => {
    const handler = vi.fn(async () => success({}));

    const response = await withPipeline(
      jsonRequest({ name: "x" }),
      schema,
      handler,
      { authInstance: authLike(null) },
    );

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
  });

  it("does NOT invoke the handler when the validation stage fails", async () => {
    const handler = vi.fn(async () => success({}));

    const response = await withPipeline(
      jsonRequest({}), // empty object fails schema (name required)
      schema,
      handler,
      { authInstance: authLike({ user: { id: AUTH_USER_ID } }) },
    );

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(422);
  });
});
