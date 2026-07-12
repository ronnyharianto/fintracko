/**
 * Co-located unit test for the Prisma Client singleton at `src/lib/db.ts`.
 *
 * Per docs/core/AGENT_RULES.md §4 (Mandatory Unit Testing) and
 * docs/core/PROJECT_STRUCTURE.md §3 (Co-located Automated Unit Testing),
 * this test sits directly next to its target `db.ts`. It verifies the public
 * contract of the generated Prisma Client (all 11 model delegates, all 5
 * enums, and the singleton property) WITHOUT issuing any database queries —
 * the assertions operate purely on the client object surface so the test runs
 * offline and never exhausts the Supabase connection pool.
 *
 * Why this lives under `src/lib/` and not under `prisma/`: the project's
 * Vitest `include` filter is restricted to `src/**` (see vitest.config.mts).
 * `db.ts` is the import target that depends on the generated client, so the
 * co-located test site is here, faithfully next to its target file.
 */
import { describe, it, expect } from "vitest";

import { db } from "@/lib/db";

import {
  WorkspaceRole,
  CategoryType,
  TransactionType,
  BudgetInterval,
  Gender,
} from "../../generated/prisma/enums";

/**
 * Canonical list of all 11 models defined in `prisma/schema.prisma`.
 * If the schema grows or shrinks, update `EXPECTED_MODELS` and this test
 * fails fast — surfacing the contract change at the import boundary.
 */
const EXPECTED_MODELS = [
  "user",
  "authAccount",
  "session",
  "profile",
  "workspace",
  "workspaceMember",
  "account",
  "category",
  "subCategory",
  "budget",
  "transaction",
] as const;

describe("Prisma Client singleton (db)", () => {
  it("exposes all 11 model delegates from the FINtracko schema", () => {
    for (const modelName of EXPECTED_MODELS) {
      // Each Prisma model delegate is an object exposing findUnique, findMany,
      // create, update, delete, etc. We assert presence + a couple of method
      // shapes to ensure the client was generated correctly.
      const delegate = (db as unknown as Record<string, unknown>)[modelName];
      expect(delegate, `expected db.${modelName} to exist`).toBeDefined();
      for (const method of ["findMany", "findUnique", "create", "update", "delete"]) {
        expect(
          (delegate as Record<string, unknown>)[method],
          `expected db.${modelName}.${method} to exist`,
        ).toBeInstanceOf(Function);
      }
    }
  });

  it("exposes exactly the 11 expected model delegates (no rogue models)", () => {
    // Prisma attaches a few non-model utility properties (e.g. `$transaction`,
    // `$connect`, `$disconnect`, `$on`, `$use`). We filter those out by
    // checking the shape (object with `findMany`).
    const actualModels = Object.keys(db).filter(
      (key) =>
        !key.startsWith("$") &&
        typeof (db as unknown as Record<string, unknown>)[key] === "object" &&
        typeof ((db as unknown as Record<string, Record<string, unknown>>)[key]?.findMany) === "function",
    );
    expect(actualModels.sort()).toEqual([...EXPECTED_MODELS].sort());
  });
});

describe("Prisma schema enums", () => {
  it("WorkspaceRole contains OWNER and COLLABORATOR", () => {
    expect(WorkspaceRole.OWNER).toBe("OWNER");
    expect(WorkspaceRole.COLLABORATOR).toBe("COLLABORATOR");
    expect(Object.keys(WorkspaceRole).sort()).toEqual(["COLLABORATOR", "OWNER"]);
  });

  it("CategoryType contains INCOME, EXPENSE, TRANSFER", () => {
    expect(CategoryType.INCOME).toBe("INCOME");
    expect(CategoryType.EXPENSE).toBe("EXPENSE");
    expect(CategoryType.TRANSFER).toBe("TRANSFER");
    expect(Object.keys(CategoryType).sort()).toEqual(["EXPENSE", "INCOME", "TRANSFER"]);
  });

  it("TransactionType mirrors CategoryType (intentional duplicated enum)", () => {
    // The schema intentionally declares `TransactionType` separately from
    // `CategoryType` so future divergence does not force a breaking rename
    // of the budget-oriented enum. They start identical.
    expect(TransactionType.INCOME).toBe("INCOME");
    expect(TransactionType.EXPENSE).toBe("EXPENSE");
    expect(TransactionType.TRANSFER).toBe("TRANSFER");
    expect(Object.keys(TransactionType).sort()).toEqual(["EXPENSE", "INCOME", "TRANSFER"]);
  });

  it("BudgetInterval contains MONTHLY and YEARLY", () => {
    expect(BudgetInterval.MONTHLY).toBe("MONTHLY");
    expect(BudgetInterval.YEARLY).toBe("YEARLY");
    expect(Object.keys(BudgetInterval).sort()).toEqual(["MONTHLY", "YEARLY"]);
  });

  it("Gender contains MALE, FEMALE, OTHER", () => {
    expect(Gender.MALE).toBe("MALE");
    expect(Gender.FEMALE).toBe("FEMALE");
    expect(Gender.OTHER).toBe("OTHER");
    expect(Object.keys(Gender).sort()).toEqual(["FEMALE", "MALE", "OTHER"]);
  });
});

describe("Prisma Client singleton property", () => {
  it("re-importing the db module returns the exact same instance", async () => {
    // Re-import the module via dynamic import; Vitest's module graph caches the
    // singleton under `globalThis.__prismaClient`, so the second import must be
    // strictly equal to the first (Prisma client never gets re-instantiated).
    const { db: dbAgain } = await import("@/lib/db");
    expect(dbAgain).toBe(db);
  });
});
