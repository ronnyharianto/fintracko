# Fintracko Agent Instructions

Use these project-specific rules when reviewing, changing, or validating this
financial application. Read the owning code and its callers first; make the
smallest complete change, preserve unrelated work, and report validation and
remaining limitations.

## Stack and architecture

- Next.js 16 App Router, React 19, strict TypeScript, Prisma 7, PostgreSQL, and
  Zod 4. Server Components are the default; use Client Components only for
  interaction, browser APIs, or client state.
- Keep route pages and API Route Handlers thin. Put reusable domain logic,
  schemas, services, and errors under `src/features/<domain>/`.
- API handlers under `src/app/api/v1/` should use
  `src/lib/api/pipeline.ts` for session, onboarding, and JSON validation, and
  `src/lib/api/envelope.ts` for standard responses. Keep domain rules in
  feature services.
- Validate untrusted input with Zod. JSON request bodies use the shared
  `validateBody()` and `sanitizeObject()` pipeline. Validate multipart or
  other non-JSON input at the route boundary, including its size, format, and
  fields.
- Use Prisma through `src/lib/db.ts`; `prisma/schema.prisma` is the data-model
  source of truth. Do not edit generated Prisma output. Prefer Prisma
  operations; if raw SQL is necessary, parameterize it.
- Prefer plain functions and existing helpers. Introduce abstractions only
  when they clarify ownership, remove meaningful duplication, or provide a
  needed test seam. Keep imports within `src` on the `@/*` alias.

## Security and data integrity

- Every workspace-scoped read or mutation must authorize the authenticated
  `userId` as a member of the specified `workspaceId`; owner-only operations
  must also enforce `role: "OWNER"`. Treat all resource IDs as untrusted.
- Nested workspace routes must use every parent path ID in authorization and
  database predicates; checking only a leaf ID is insufficient.
- Keep related multi-row or multi-model writes atomic, using a Prisma
  transaction or an equivalent atomic Prisma operation. This is especially
  important for onboarding, workspace creation, and financial balances.
- Preserve exact financial arithmetic and transaction/account direction
  invariants. Reject archived categories or accounts where they cannot be
  used.
- Keep production authentication OAuth-only. Preserve the existing
  development-only email/password sign-in for local seeded accounts; never
  enable it in production.
- Never hardcode secrets or production origins, log credentials or sensitive
  financial data, expose raw provider/database errors, or render untrusted
  HTML. Return safe errors through the standard API envelope.

## UI and contracts

- Follow existing design tokens and shared components in `src/components/ui/`.
  Use `apiFetch()` for browser calls to Fintracko API routes and `withToast()`
  for async actions that only need toast handling.
- Keep user-facing states honest: loading, empty, success, failure, and
  unavailable actions. Preserve responsive layouts and accessible labels.
- Keep public contracts stable. Check callers and update migrations or
  documentation when changing schemas, API responses, or database fields.
- Do not fake persistence or success. Catch `unknown`, use typed domain
  errors/results, and map expected failures to explicit error codes and HTTP
  statuses. Unexpected errors must not expose internal details.

## Validation and delivery

- Run the narrowest relevant validation after completing a coherent change.
  For TypeScript/application changes, use `npx tsc --noEmit` and
  `npm run lint`; for route, database, or cross-module changes, also run
  `npm run build` when feasible. Check the affected user flow when relevant.
- Add focused regression tests for workspace isolation, mismatched nested
  route IDs, and financial mutations (decimal precision, direction,
  update/delete balance reversal, and archived-resource rejection).
  Use the configured test runner. If none exists, say so and use the
  applicable static checks and focused manual validation; don't claim
  automated coverage or add a test framework for unrelated work.
- If validation is blocked by missing tools, environment, or services, report
  the exact blocker and run independent checks that remain available. Never
  weaken checks to make a change pass.
- Inspect `git status` before editing. Preserve changes you did not make;
  don't discard work, commit, create branches, amend, or force-push unless
  explicitly asked. Keep changes scoped, review staged files before a
  requested commit, and verify the final worktree.
- In reviews, put bugs, regressions, risks, and missing tests first, ordered
  by severity. Final reports should state what changed, what was validated,
  and any remaining risk or blocker.

## Style

- Write source, documentation, names, and user-facing text in English.
- Preserve local formatting; avoid unrelated reformatting. Use ASCII by
  default and add comments only to explain non-obvious constraints or
  decisions.
