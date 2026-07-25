/**
 * Unit tests for the XSS sanitization helpers.
 *
 * Validates that [`sanitize.ts`](sanitize.ts) strictly neutralizes every
 * Cross-Site Scripting vector enumerated in docs/architecture/API_SPECS.md
 * §2 and docs/core/AGENT_RULES.md §3 before payloads reach Prisma queries.
 *
 * Coverage:
 *   - `sanitizeString`: script/iframe/on* stripping, plain-text survival,
 *     null/undefined passthrough, empty-string identity, no silent coercion
 *   - `sanitizeStringArray`: array mapping + non-array passthrough
 *   - `sanitizeObject`: nested object/array walk, Date/RegExp/Map/Set
 *     immunity, circular-reference refusal
 */
import { describe, it, expect } from "vitest";
import {
  sanitizeString,
  sanitizeStringArray,
  sanitizeObject,
} from "./sanitize";

describe("sanitizeString", () => {
  it("strips a <script> tag completely and keeps no executable payload", () => {
    const payload = '<script>alert("xss")</script>hello';
    const result = sanitizeString(payload);
    expect(result).not.toContain("<script>");
    expect(result).toContain("hello");
    expect(result?.toLowerCase()).not.toContain("alert");
  });

  it("strips on* event-handler attributes but preserves the visible text", () => {
    const payload = '<img src="x" onerror="alert(1)" alt="badge">Badge</img>';
    const result = sanitizeString(payload);
    expect(result).not.toContain("onerror");
    expect(result).toContain("Badge");
  });

  it("removes an <iframe> entirely", () => {
    const payload = '<iframe src="https://evil.example"></iframe>inline';
    const result = sanitizeString(payload);
    expect(result).not.toContain("<iframe");
    expect(result).not.toContain("evil.example");
    expect(result).toContain("inline");
  });

  it("strips href javascript: pseudo-protocol payloads", () => {
    const payload = '<a href="javascript:alert(1)">click</a>';
    const result = sanitizeString(payload);
    expect(result?.toLowerCase()).not.toContain("javascript:");
    expect(result).toContain("click");
  });

  it("passes null through unchanged (required-field validation is Zod's job)", () => {
    expect(sanitizeString(null)).toBeNull();
  });

  it("passes undefined through unchanged", () => {
    expect(sanitizeString(undefined)).toBeUndefined();
  });

  it("returns empty string for empty string (no whitespace injection)", () => {
    expect(sanitizeString("")).toBe("");
  });

  it("preserves benign plain text without modification", () => {
    expect(sanitizeString("Groceries: weekly budget")).toBe(
      "Groceries: weekly budget",
    );
  });
});

describe("sanitizeStringArray", () => {
  it("sanitizes every element while preserving identity for null/undefined", () => {
    const result = sanitizeStringArray([
      "<b>safe</b>",
      null,
      undefined,
      "<script>alert(1)</script>ok",
    ]);
    expect(result[0]).not.toContain("<script>");
    expect(result[0]).toContain("safe");
    expect(result[1]).toBeNull();
    expect(result[2]).toBeUndefined();
    expect(result[3]).toContain("ok");
    expect(result[3]).not.toContain("alert");
  });

  it("returns non-array input untouched (Zod owns required-shape validation)", () => {
    const nonArray = 42 as unknown as Array<string>;
    expect(sanitizeStringArray(nonArray)).toBe(nonArray);
  });
});

describe("sanitizeObject", () => {
  it("sanitizes string leaves at every nesting level while leaving non-string leaves alone", () => {
    const payload = {
      name: "<script>x</script>Bob",
      amount: "1.2345",
      active: true,
      nested: {
        bio: '<img src=x onerror="alert(1)">hi',
        count: 3,
        tags: ["<b>ok</b>", "plain"],
      },
    };
    const result = sanitizeObject(payload);
    expect(result.name).not.toContain("<script>");
    expect(result.name).toContain("Bob");
    expect(result.amount).toBe("1.2345"); // decimal strings survive
    expect(result.active).toBe(true);
    expect(result.nested.bio).not.toContain("onerror");
    expect(result.nested.bio).toContain("hi");
    expect(result.nested.count).toBe(3);
    expect(result.nested.tags[0]).toBe("ok");
    expect(result.nested.tags[1]).toBe("plain");
  });

  it("returns null/undefined input unchanged", () => {
    expect(sanitizeObject(null)).toBeNull();
    expect(sanitizeObject(undefined)).toBeUndefined();
  });

  it("refuses to mutate Date instances (semantic safety)", () => {
    const d = new Date("2026-01-01T00:00:00Z");
    const wrapped = { when: d };
    const result = sanitizeObject(wrapped);
    expect(result.when).toBe(d); // identity preserved
    expect(result.when).toBeInstanceOf(Date);
    expect(result.when.getTime()).toBe(d.getTime());
  });

  it("refuses to mutate RegExp / Map / Set instances", () => {
    const rx = /abc/;
    const map = new Map([["k", "v"]]);
    const set = new Set(["a"]);
    const payload = { rx, map, set };
    const result = sanitizeObject(payload);
    expect(result.rx).toBe(rx);
    expect(result.map).toBe(map);
    expect(result.set).toBe(set);
  });

  it("throws on a circular reference (an attacker signal, not a valid request)", () => {
    const a: Record<string, unknown> = { name: "<script>x</script>" };
    const b: Record<string, unknown> = { ref: a };
    a.ref = b; // circular link
    expect(() => sanitizeObject(a)).toThrowError(/circular reference/i);
  });

  it("walks arrays whose elements are themselves objects", () => {
    const payload = {
      items: [
        { label: '<iframe src="x"></iframe>kept' },
        { note: "plain text" },
      ],
    };
    const result = sanitizeObject(payload);
    expect(result.items[0].label).not.toContain("<iframe");
    expect(result.items[0].label).toContain("kept");
    expect(result.items[1].note).toBe("plain text");
  });

  it("handles nested arrays-of-arrays (string leaves at every depth)", () => {
    const payload = {
      matrix: [
        ["<b>a</b>", "b"],
        ["c", "<script>d</script>e"],
      ],
      scalar: "f",
    };
    const result = sanitizeObject(payload);
    expect(result.matrix[0][0]).toBe("a");
    expect(result.matrix[0][1]).toBe("b");
    expect(result.matrix[1][0]).toBe("c");
    expect(result.matrix[1][1]).toBe("e");
    expect(result.scalar).toBe("f");
  });

  it("does not descend into a custom class instance (preserves reference + prototype)", () => {
    class Money {
      constructor(public cents: number) {}
      formatted() {
        return `$${(this.cents / 100).toFixed(2)}`;
      }
    }
    const money = new Money(1099);
    const payload = { amount: money };
    const result = sanitizeObject(payload);
    expect(result.amount).toBe(money); // identity preserved, not cloned
    expect(result.amount).toBeInstanceOf(Money);
    expect(result.amount.formatted()).toBe("$10.99");
  });

  it("sanitizes string leaves nested inside a Date-immune object", () => {
    const when = new Date("2026-01-01T00:00:00Z");
    const payload = {
      when,
      label: "<script>x</script>event",
      nested: { dirty: "<img src=x onerror=alert(1)>y" },
    };
    const result = sanitizeObject(payload);
    expect(result.when).toBe(when);
    expect(result.label).toBe("event");
    expect(result.nested.dirty).toBe("y");
  });

  it("treats boolean and number leaves as non-xss and passes them through unchanged", () => {
    const payload = {
      n: 42,
      b: false,
      deep: { count: 7, flag: true },
    };
    const result = sanitizeObject(payload);
    expect(result.n).toBe(42);
    expect(result.b).toBe(false);
    expect(result.deep.count).toBe(7);
    expect(result.deep.flag).toBe(true);
  });

  it("strips an event-handler attribute payload while keeping the visible label (mixed markup)", () => {
    const payload =
      '<a href="javascript:alert(1)" onclick="steal()">Click me</a>';
    const result = sanitizeString(payload);
    expect(result).toContain("Click me");
    expect((result ?? "").toLowerCase()).not.toContain("javascript:");
    expect((result ?? "").toLowerCase()).not.toContain("onclick");
    expect((result ?? "").toLowerCase()).not.toContain("steal");
  });
});
