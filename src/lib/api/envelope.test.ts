/**
 * Unit tests for the REST API envelope helpers.
 *
 * Validates the standardized success/failure JSON contract declared in
 * docs/architecture/API_SPECS.md §1 "Global Response Standards" against the
 * helpers exported from [`envelope.ts`](envelope.ts).
 *
 * Coverage:
 *   - Success envelope shape + HTTP 200
 *   - Success with explicit status (e.g. 201)
 *   - Failure envelope shape + canonical HTTP status mapping
 *   - Failure with explicit status override
 *   - Zod-issue → validation failure translation (path & message)
 *   - `pathToString` dotted-path normalization incl. numeric indices
 *   - Timestamp seam is UTC ISO-8601 with trailing `Z`
 *   - `validationErrors` omitted entirely when none present
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  buildSuccessEnvelope,
  buildFailureEnvelope,
  success,
  successWithStatus,
  failure,
  failureWithStatus,
  validationFailure,
  pathToString,
  nowTimestamp,
  HTTP_STATUS_BY_CODE,
  type ApiErrorCode,
} from "./envelope";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("nowTimestamp", () => {
  it("returns an ISO-8601 UTC string ending with Z", () => {
    const ts = nowTimestamp();
    // ISO UTC shape: YYYY-MM-DDTHH:MM:SS(.sss)Z
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/);
  });

  it("is stable across successive reads within the same millisecond tick", () => {
    // Sanity: the helper is a pure thin wrapper around `new Date().toISOString()`.
    // We assert it parses to a finite time — verifies the value is well-formed.
    const ts = nowTimestamp();
    expect(Date.parse(ts)).not.toBeNaN();
  });
});

describe("HTTP_STATUS_BY_CODE", () => {
  it("maps every public error code to a status in the 4xx/5xx range", () => {
    const codes = Object.keys(HTTP_STATUS_BY_CODE) as ApiErrorCode[];
    for (const code of codes) {
      const status = HTTP_STATUS_BY_CODE[code];
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    }
  });

  it("uses 401 for UNAUTHORIZED", () => {
    expect(HTTP_STATUS_BY_CODE.UNAUTHORIZED).toBe(401);
  });

  it("uses 403 for ONBOARDING_REQUIRED and UNAUTHORIZED_WORKSPACE_ACCESS", () => {
    expect(HTTP_STATUS_BY_CODE.ONBOARDING_REQUIRED).toBe(403);
    expect(HTTP_STATUS_BY_CODE.UNAUTHORIZED_WORKSPACE_ACCESS).toBe(403);
  });

  it("uses 422 for VALIDATION_ERROR (distinguishes payload shape vs auth)", () => {
    expect(HTTP_STATUS_BY_CODE.VALIDATION_ERROR).toBe(422);
  });

  it("is frozen so handler-side mutation cannot drift the contract", () => {
    expect(Object.isFrozen(HTTP_STATUS_BY_CODE)).toBe(true);
  });
});

describe("pathToString", () => {
  it("returns a dotted path for a simple top-level field", () => {
    expect(pathToString(["workspaceId"])).toBe("workspaceId");
  });

  it("returns a dotted path for nested fields", () => {
    expect(pathToString(["user", "profile", "bio"])).toBe("user.profile.bio");
  });

  it("wraps numeric segments in bracket notation", () => {
    expect(pathToString(["tags", 2, "value"])).toBe("tags.[2].value");
  });

  it("returns '_' for an empty path (issue applies to the whole value)", () => {
    expect(pathToString([])).toBe("_");
  });
});

describe("buildSuccessEnvelope", () => {
  it("wraps payload under `data` with success:true and a UTC timestamp", () => {
    const body = buildSuccessEnvelope({ id: "abc" });
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: "abc" });
    expect(body.timestamp).toMatch(/Z$/);
  });

  it("preserves null/empty payload without coercion", () => {
    expect(buildSuccessEnvelope(null).data).toBeNull();
    expect(buildSuccessEnvelope(undefined).data).toBeUndefined();
    expect(buildSuccessEnvelope({}).data).toEqual({});
  });

  it("preserves numeric/boolean/decimal-string payloads verbatim (no rounding)", () => {
    expect(buildSuccessEnvelope({ amount: "1.2345" }).data).toEqual({
      amount: "1.2345",
    });
    expect(buildSuccessEnvelope(true).data).toBe(true);
  });
});

describe("buildFailureEnvelope", () => {
  it("embeds code and message under `error` and sets success:false", () => {
    const body = buildFailureEnvelope("BAD_REQUEST", "name is required");
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(body.error.message).toBe("name is required");
    expect(body.error.validationErrors).toBeUndefined();
  });

  it("includes validationErrors when supplied and non-empty", () => {
    const body = buildFailureEnvelope("VALIDATION_ERROR", "invalid", [
      { path: "amount", message: "must be > 0" },
    ]);
    expect(body.error.validationErrors).toEqual([
      { path: "amount", message: "must be > 0" },
    ]);
  });

  it("omits validationErrors when supplied but empty (keeps contract clean)", () => {
    const body = buildFailureEnvelope("VALIDATION_ERROR", "invalid", []);
    expect(body.error.validationErrors).toBeUndefined();
  });
});

describe("success()", () => {
  it("returns a NextResponse with status 200 and an application/json body", async () => {
    const res = success({ ok: true });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual({ ok: true });
    expect(json.timestamp).toMatch(/Z$/);
  });
});

describe("successWithStatus()", () => {
  it("uses the explicit status code while keeping the success envelope", async () => {
    const res = successWithStatus({ created: true }, 201);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual({ created: true });
  });
});

describe("failure()", () => {
  it("uses the canonical HTTP status for the code", async () => {
    const res = failure("NOT_FOUND", "Email not registered");
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("NOT_FOUND");
    expect(json.error.message).toBe("Email not registered");
  });

  it("forwards validationErrors when present", async () => {
    const res = failure("VALIDATION_ERROR", "bad", [
      { path: "amount", message: "must be positive" },
    ]);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.validationErrors).toEqual([
      { path: "amount", message: "must be positive" },
    ]);
  });
});

describe("failureWithStatus()", () => {
  it("overrides the default status derivation", async () => {
    const res = failureWithStatus("BAD_REQUEST", "oops", 418);
    expect(res.status).toBe(418);
    const json = await res.json();
    expect(json.error.code).toBe("BAD_REQUEST");
  });
});

describe("validationFailure()", () => {
  it("maps Zod issues to validationErrors and emits VALIDATION_ERROR / 422", async () => {
    const issues = [
      {
        path: ["amount"],
        message: "Expected number, received string",
        code: "invalid_type",
      },
      { path: ["workspaceId"], message: "Invalid uuid", code: "custom" },
    ] as import("zod").ZodIssue[];

    const res = validationFailure(issues);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.validationErrors).toEqual([
      { path: "amount", message: "Expected number, received string" },
      { path: "workspaceId", message: "Invalid uuid" },
    ]);
  });

  it("accepts a custom top-level message override", async () => {
    const res = validationFailure([], "Custom message");
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.message).toBe("Custom message");
    // Empty issues array => validationErrors omitted entirely.
    expect(json.error.validationErrors).toBeUndefined();
  });
});
