/**
 * Unit tests for the Zod input-validation pipeline handler.
 *
 * Validates the "Rate Limiting & Input Validation" step declared in
 * docs/architecture/API_SPECS.md §2 against the helpers exported from
 * [`validate.ts`](validate.ts).
 *
 * Coverage:
 *   - happy path: a conforming body is returned narrowed to the schema type
 *   - schema failure: VALIDATION_ERROR 422 with per-field validationErrors
 *   - non-JSON body: BAD_REQUEST 400 (no upstream SyntaxError leak)
 *   - empty body parsed to `null` and handed to the schema
 *   - schema that throws inside `.parse` (non-ZodError) degrades to 400
 *   - decimal strings, arrays, optional/nullable fields survive verbatim
 */
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";
import { validateBody, readJsonBody } from "./validate";

/**
 * Builds a POST NextRequest carrying `body` as a JSON-serialized string.
 * Passing `null` produces a request with an empty body — useful for
 * asserting that an absent payload is parsed as `null` and deferred to the
 * schema.
 */
function jsonRequest(body: unknown): NextRequest {
  if (body === undefined) {
    return new NextRequest("http://localhost:3000/api/v1/test", {
      method: "POST",
    });
  }
  return new NextRequest("http://localhost:3000/api/v1/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** A representative schema that exercises primitives + nested + arrays. */
const testSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(50),
  amount: z.string().refine((v) => !isNaN(Number(v)), {
    message: "Must be a valid numeric decimal string",
  }),
  tags: z.array(z.string()).optional(),
  description: z.string().nullable().optional(),
});

describe("readJsonBody", () => {
  it("parses a well-formed JSON body", async () => {
    const req = jsonRequest({ a: 1 });
    const result = await readJsonBody(req);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ a: 1 });
    }
  });

  it("parses an empty body to null", async () => {
    const req = jsonRequest(undefined);
    const result = await readJsonBody(req);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeNull();
    }
  });

  it("returns ok:false with a reason for a non-JSON body", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/test", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "not-json-at-all",
    });
    const result = await readJsonBody(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("JSON");
    }
  });
});

describe("validateBody", () => {
  it("returns success:true with the narrowed payload on a conforming body", async () => {
    const body = {
      workspaceId: "11111111-1111-4111-8111-111111111111",
      name: "Wallet",
      amount: "1.2345",
      tags: ["x", "y"],
      description: null,
    };
    const result = await validateBody(jsonRequest(body), testSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.workspaceId).toBe(
        "11111111-1111-4111-8111-111111111111",
      );
      expect(result.data.amount).toBe("1.2345");
      expect(result.data.tags).toEqual(["x", "y"]);
      expect(result.data.description).toBeNull();
    }
  });

  it("returns VALIDATION_ERROR 422 with field-level details on schema failure", async () => {
    const body = {
      workspaceId: "not-a-uuid",
      name: "",
      amount: "abc",
    };
    const result = await validateBody(jsonRequest(body), testSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(422);
      const json = await result.response.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("VALIDATION_ERROR");
      // at least three fields rejected: workspaceId, name, amount
      expect(json.error.validationErrors.length).toBeGreaterThanOrEqual(3);
      const paths = json.error.validationErrors.map(
        (e: { path: string }) => e.path,
      );
      expect(paths).toContain("workspaceId");
      expect(paths).toContain("name");
      expect(paths).toContain("amount");
    }
  });

  it("returns BAD_REQUEST 400 when the body is not parseable JSON", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/test", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "<<not-json>>",
    });
    const result = await validateBody(req, testSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      const json = await result.response.json();
      expect(json.error.code).toBe("BAD_REQUEST");
      expect(json.error.message).toContain("JSON");
    }
  });

  it("defers an empty body to the schema (typically a validation failure)", async () => {
    const req = jsonRequest(undefined);
    const result = await validateBody(req, testSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Zod's `.object()` rejects `null` as a `BAD_INPUT` -> surfaces as 422.
      expect(result.response.status).toBe(422);
      const json = await result.response.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("surfaces a schema that throws inside `.parse` as BAD_REQUEST 400 (no 500 leak)", async () => {
    // A schema whose `.refine` synchronously throws — we want the validator
    // to degrade this to a 400 rather than letting it bubble as unhandled.
    const throwingSchema = z.object({ value: z.string() }).refine(() => {
      throw new Error("intentional refiner blast");
    }, "never reached");
    const result = await validateBody(
      jsonRequest({ value: "x" }),
      throwingSchema,
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      const json = await result.response.json();
      expect(json.error.code).toBe("BAD_REQUEST");
      expect(json.error.message).not.toContain("refiner blast");
    }
  });

  it("preserves decimal-string precision verbatim (no floating-point coercion)", async () => {
    const schema = z.object({
      amount: z.string().refine((v) => Number(v) > 0),
    });
    const result = await validateBody(
      jsonRequest({ amount: "0.123456789" }),
      schema,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      // Returned as the original string; no rounding was applied.
      expect(result.data.amount).toBe("0.123456789");
    }
  });
});
