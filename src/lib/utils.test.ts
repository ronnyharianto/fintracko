import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

/**
 * Sanity + correctness suite for `cn` (the shared Tailwind class-merge helper).
 *
 * This file is co-located next to its target per docs/core/PROJECT_STRUCTURE.md §3
 * ("Co-located Automated Unit Testing") and serves as the Phase 1 Task 1.2
 * harness sanity check across happy paths and edge cases (AGENT_RULES.md §4).
 */
describe("cn() utility", () => {
  it("merges plain string class names", () => {
    expect(cn("p-4", "m-2")).toBe("p-4 m-2");
  });

  it("resolves conflicting Tailwind utilities (last wins)", () => {
    expect(cn("p-4", "p-6")).toBe("p-6");
  });

  it("skips falsy and conditional values", () => {
    const active = false;
    expect(cn("block", active && "hidden", undefined, null, "")).toBe("block");
  });

  it("joins arrays and objects", () => {
    expect(cn(["flex", { "justify-center": true }, ["gap-4"]])).toBe(
      "flex justify-center gap-4",
    );
  });

  it("returns an empty string for no input", () => {
    expect(cn()).toBe("");
  });
});
