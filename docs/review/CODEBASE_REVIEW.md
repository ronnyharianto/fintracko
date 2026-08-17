# Fintracko — Codebase Review Report

**Date:** August 16, 2026
**Branch reviewed:** `develop`
**Scope:** Full source review — auth, API pipeline, feature services, route handlers, App Router pages/components, Prisma schema.

This report catalogs potential bugs, performance issues, dead code, and refactoring priorities found during a read-through of the codebase. Items are grouped by category and ordered by impact. File paths are relative to the project root; line numbers refer to the state of the files at review time.

---

## Severity Summary

| ID | Severity | Category | Issue | Location |
|----|----------|----------|-------|----------|
| B1 | 🔴 High | Bug ✅ | Onboarding can be re-submitted; returns 500 instead of a proper conflict | `src/app/api/v1/onboarding/complete/route.ts` |
| B2 | 🔴 High | Bug ✅ | `/settings` renders the settings nav twice; active-tab highlight is dead | `src/app/(workspace)/settings/page.tsx` vs `settings/layout.tsx` |
| B3 | 🔴 High | Bug ✅ | `useSearchParams` without Suspense breaks `next build` (CSR bailout) | `src/app/error/page.tsx` |
| B4 | 🟠 Medium | Bug ✅ | Account settings fakes profile save & shows a password form for a passwordless app | `src/app/(workspace)/settings/account/page.tsx` |
| B5 | 🟠 Medium | Bug ✅ | Danger Zone "Delete Workspace" targets the first workspace, not a chosen one | `src/app/(workspace)/settings/workspace/page.tsx` |
| B6 | 🟠 Medium | Bug ✅ | User menu tab links (`?tab=security`) are ignored by the account page | `src/components/shared/workspace/user-menu.tsx`, `settings/account/page.tsx` |
| B7 | 🟠 Medium | Bug ✅ | `trustedOrigins` hardcoded to localhost; ignores `BETTER_AUTH_URL` | `src/lib/auth.ts` |
| B8 | 🟡 Low | Bug ✅ | All session failures (incl. DB down) surface as 401 | `src/lib/api/session.ts` |
| P1 | 🟠 Medium | Performance ✅ | N+1 template seeding on workspace creation (~19 sequential inserts) | `src/features/workspaces/services.ts` |
| P2 | 🟡 Low | Performance ✅ | Duplicated onboarding-guard `profile` query on every API request | 6 route handlers |
| D1 | 🟠 Medium | Dead code ✅ | `pipeline.ts` orchestrator has zero callers; routes re-wire stages manually | `src/lib/api/pipeline.ts` |
| D2 | 🟡 Low | Dead code ✅ | `sanitizeStringArray` unused | `src/lib/api/sanitize.ts` |
| D3 | 🟡 Low | Dead code ✅ | `AuthClient` type export unused | `src/lib/auth.ts` |
| D4 | 🟡 Low | Dead code ✅ | `ui/table.tsx`, `ui/toast.tsx`, `ui/form.tsx` unused; `react-hook-form`/`@hookform/resolvers`/`@radix-ui/react-toast` deps unused | `src/components/ui/` |
| D5 | 🟡 Low | Dead code ✅ | `settings/page.tsx` duplicates `settings/layout.tsx` | `src/app/(workspace)/settings/` |
| D6 | 🟢 Info | Dead code ✅ | `sidebarRef` set but never read | `src/components/shared/sidebar.tsx` |
| D7 | 🟢 Info | Dead code ✅ | Debug `console.log`s left in request paths | `services.ts`, `workspaces/route.ts` |
| D8 | 🟢 Info | Dead code ✅ | Stale comments referencing removed unit-test files | `auth.ts`, `session.ts`, `envelope.ts`, … |
| R1 | 🟠 Medium | Refactor ✅ | 6 route handlers duplicate session+validate+sanitize+onboarding-guard wiring | `src/app/api/v1/workspaces/**`, `onboarding/**` |
| R2 | 🟡 Low | Refactor ✅ | Error signaling via `throw new Error("FORBIDDEN")` + string matching + `catch (err: any)` | `src/features/workspaces/services.ts`, routes |

---

## Resolution Log

Dead-code items D1–D8 were removed on **2026-08-16**. All removals verified with `tsc --noEmit` (no errors).

| ID | Resolution |
|----|------------|
| D1 | ✅ Deleted `src/lib/api/pipeline.ts` (no importers existed). |
| D2 | ✅ Removed `sanitizeStringArray` from `src/lib/api/sanitize.ts` (unused export). |
| D3 | ✅ Removed `AuthClient` type export from `src/lib/auth.ts` (unused export). |
| D4 | ✅ Deleted `src/components/ui/table.tsx`, `ui/toast.tsx`, `ui/form.tsx` and uninstalled `react-hook-form`, `@hookform/resolvers`, `@radix-ui/react-toast` (`npm uninstall`). |
| D5 | ✅ Replaced `settings/page.tsx` (duplicate of `settings/layout.tsx`) with a redirect to `/settings/workspace`, mirroring the existing `workspaces/page.tsx` pattern. The `/settings` route stays functional. |
| D6 | ✅ Removed `sidebarRef` and the now-unused `useRef` import from `src/components/shared/sidebar.tsx`. |
| D7 | ✅ Removed leftover debug `console.log`s in `src/features/workspaces/services.ts` (`getOwnedWorkspaces`) and `src/app/api/v1/workspaces/route.ts` (GET). |
| D8 | ✅ Rewrote stale comments referencing non-existent unit-test files (`auth.test.ts`, `session.test.ts`, co-located suites, Vitest isolation) in `src/lib/auth.ts`, `src/lib/api/session.ts`, `src/lib/api/envelope.ts`, `src/lib/api/validate.ts`, `src/lib/api/sanitize.ts`. |

### Bugs fixed (2026-08-16)

| ID | Fix |
|----|-----|
| B1 | ✅ Added an Onboarding Verification Guard to `src/app/api/v1/onboarding/complete/route.ts` — if a `Profile` row already exists for the user, the handler returns `CONFLICT` (409) "Onboarding has already been completed for this account." instead of hitting the unique-constraint violation and returning 500. |
| B2 | ✅ Duplicate nav removed in the D5 pass; the remaining half — `settings/layout.tsx` never highlighting the active tab — fixed by converting the layout to a client component that highlights the tab matching the current pathname (`usePathname` + `cn`). |
| B3 | ✅ Wrapped the `useSearchParams` read in `src/app/error/page.tsx` inside a `<Suspense>` boundary (`AuthErrorContent`), so the route can be statically rendered without the `missing-suspense-with-csr-bailout` build error. |

### Refactors completed (2026-08-17)

| ID | Resolution |
|----|------------|
| R1 + P2 | ✅ Rebuilt the shared pipeline at `src/lib/api/pipeline.ts` (`withPipeline`) and migrated **all 7 handlers** across the 5 route files under `src/app/api/v1/` to it. The pipeline composes the mandated steps — `withSession` → onboarding guard → `validateBody` → `sanitizeObject` — with per-route options: `{ schema?, requireOnboarding?, rejectIfOnboarded? }`. The onboarding guard now resolves the `Profile` row **once** and exposes it as `ctx.profile` (the POST /workspaces handler reuses `currencyPreference` from it), eliminating the 6 duplicated `db.profile.findUnique` calls (P2). `rejectIfOnboarded` subsumes the B1 guard on `/onboarding/complete` (409 on re-submission). Validated/sanitized bodies are handed to handlers as a typed second argument (`data: S['_output']`, no `!` assertions). `withSession`, `validateBody`, `sanitizeObject` remain exported for the pipeline; no route imports them directly anymore. Verified with `npx tsc --noEmit` (clean) and `npm run build` (compiles; all 5 API routes remain dynamic). |

### Bugs fixed (2026-08-17)

| ID | Fix |
|----|-----|
| B4 | ✅ Account settings no longer fakes saves. The profile form now persists the name through `authClient.updateUser({ name })` (a real Better Auth round-trip) and surfaces the server error via toast on failure. The fake 1s-`setTimeout` success path is gone. The "Change Password" form — impossible to satisfy in an OAuth-only app (`emailAndPassword.enabled: false`) — was removed and replaced with an honest card explaining that sign-in is managed via the Google/GitHub provider. 2FA and Delete Account cards were already honest (disabled / "not implemented yet") and left as-is. |
| B5 | ✅ Danger Zone no longer silently targets `workspaces[0]`. The tab now has an explicit workspace picker (`ui/select`) and the delete button stays disabled until a workspace is chosen. `DeleteWorkspaceDialog` gained an optional `workspaceName` prop and renders the targeted workspace's name ("…delete \"Name\"?") in the confirmation — this also names the workspace for the card-based delete flow, since the page derives the name from the current `deleteWorkspaceId`. |
| B6 | ✅ The account page now reads `?tab=` from `useSearchParams()` (inside a `<Suspense>` boundary, matching the B3 /error fix), validates it against `profile`/`security`/`notifications`, and uses it to initialize **and** keep the Tabs in sync — so the user-menu links `/settings/account?tab=security` and `?tab=notifications` land on the right tab even when navigating between them without a remount. Tabs switched from uncontrolled (`defaultValue`) to controlled (`value`). |

### Performance fixes completed (2026-08-17)

| ID | Resolution |
|----|------------|
| P1 | ✅ Replaced the per-row seeding loop in `createWorkspace` (`src/features/workspaces/services.ts`) with batched inserts: `tx.category.createManyAndReturn(...)` for all Level-1 categories (PostgreSQL `RETURNING` preserves input order, so index mapping back to `template.categories[i]` is safe), then a single `tx.subCategory.createMany(...)` for all Level-2 subcategories. Workspace creation now issues ~4 queries instead of ~21 (~19 sequential inserts → 2 batch inserts). Verified with `npx tsc --noEmit` (clean) and `npm run build` (passes). |

### Hardening completed (2026-08-17)

| ID | Resolution |
|----|------------|
| B7 | ✅ `trustedOrigins` in `src/lib/auth.ts` is now derived from `requireEnv("BETTER_AUTH_URL")` instead of the hardcoded `"http://localhost:3000"` literal — production deployments validate against the real app origin. |
| B8 | ✅ `resolveSession` in `src/lib/api/session.ts` now splits unexpected Better Auth failures: errors matching known transient signatures (ECONNREFUSED/ECONNRESET/ETIMEDOUT, socket hang up, Prisma P1001/P1002, connection-closed/database-down patterns) map to the new `SERVICE_UNAVAILABLE` (HTTP 503) envelope code; everything else still degrades to a clean 401. The raw error is never serialized (no internals leak). |
| R2 | ✅ Introduced typed domain errors in `src/features/workspaces/errors.ts` — `WorkspaceServiceError` carries a stable `code` (`FORBIDDEN`, `USER_NOT_FOUND`, `ALREADY_MEMBER`, `MEMBER_NOT_FOUND`, `CANNOT_REMOVE_OWNER`) and a `workspaceErrorFailure(err, messages)` mapper that returns a ready failure envelope or `null`. `services.ts` now throws `WorkspaceServiceError` instead of `new Error("FORBIDDEN")`, and the PATCH/DELETE `/workspaces/[id]`, POST `/members`, and DELETE `/members/[memberId]` handlers map `err.code` → envelope without `catch (err: any)` or string matching. This also clears the 4 `@typescript-eslint/no-explicit-any` lint errors those handlers carried. |
| R3 | ✅ Added `src/lib/env.ts` (`requireEnv`) and replaced the `!` non-null assertions: `src/lib/db.ts` requires `DATABASE_URL`; `src/lib/auth.ts` requires `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` (now passed explicitly as `secret`), and the four OAuth credentials (`AUTH_GOOGLE_ID`/`SECRET`, `AUTH_GITHUB_ID`/`SECRET`). Misconfiguration now fails fast with a message pointing at `.env.example`. |

---

## 1. Potential Bugs

### B1 — Missing onboarding guard on `POST /api/v1/onboarding/complete`

**File:** `src/app/api/v1/onboarding/complete/route.ts`

The route's header comment states it follows the pipeline including an *"Onboarding Verification Guard (ensures Profile doesn't already exist)"* — but no such check exists in the handler. It only validates, sanitizes, and calls `completeOnboarding`.

**Consequence:** A second submission (double-click, page refresh, or direct API call) violates the `@unique` constraint on `Profile.userId`. The Prisma error is swallowed by the blanket `catch` and returned as `INTERNAL_SERVER_ERROR` (500) — a confusing response for a situation that should be a `CONFLICT` (409) or a redirect. The `(onboarding)` route-group layout guards the *page*, but nothing guards the *API*.

**Fix:** Check `db.profile.findUnique({ where: { userId } })` at the top of the handler and return `failure("CONFLICT", …)` if a profile already exists — or add the guard to the shared pipeline (see R1).

### B2 — `/settings` renders the settings navigation twice

**Files:** `src/app/(workspace)/settings/page.tsx`, `src/app/(workspace)/settings/layout.tsx`

Both `layout.tsx` and `page.tsx` render the identical settings sidebar nav. The `page.tsx` is a `"use client"` component that renders `{children}` — but Next.js pages never receive `children`, so `/settings` shows the nav duplicated with an empty content area. Additionally, the `usePathname`-based active-tab highlighting lives **only** in the dead `page.tsx`; the layout's nav (which is the one actually rendered on `/settings/workspace` and `/settings/account`) never highlights the active tab.

**Fix:** Delete `settings/page.tsx` (or turn it into a redirect to `/settings/workspace`) and move the active-state logic into `settings/layout.tsx`.

### B3 — `useSearchParams` without Suspense breaks production builds

**File:** `src/app/error/page.tsx`

`useSearchParams()` is called at the top level of a client component on a route that would otherwise be statically rendered. Next.js 15+ throws `missing-suspense-with-csr-bailout` at build time for this pattern.

**Consequence:** `next build` can fail, blocking deploys.

**Fix:** Wrap the component in `<Suspense>` (e.g. a small wrapper page that suspends a child which calls `useSearchParams`), or mark the route `dynamic`.

### B4 — Account settings fakes persistence and offers password auth

**File:** `src/app/(workspace)/settings/account/page.tsx`

- `handleProfileSave` waits 1s (`setTimeout`), then toasts **"Profile updated successfully"** — no API call is made, nothing is persisted.
- The "Change Password" form is rendered even though password authentication is disabled in `src/lib/auth.ts` (`emailAndPassword.enabled: false`). The form can never work against the backend but still fakes success.
- `handlePasswordChange` likewise only fakes success after 1s.

**Consequence:** Users believe their data/security settings were saved when they were not.

**Fix:** Wire real API calls (profile update endpoint; there is none yet — remove or disable the password section until one exists), or mark these sections as not-yet-implemented instead of pretending success.

### B5 — Danger Zone deletes the first workspace, not the chosen one

**File:** `src/app/(workspace)/settings/workspace/page.tsx`

The "Delete Workspace" button in the Danger Zone tab blindly passes `workspaces[0]?.id`. The delete dialog also never shows **which** workspace is being deleted.

**Consequence:** A user intending to delete a specific workspace may delete their first one instead; the irreversible-cascade delete (all accounts, transactions, budgets) makes this costly.

**Fix:** Require an explicit selection (e.g. a workspace picker in the dialog) and display the workspace name in the confirmation.

### B6 — User-menu tab links are ignored

**Files:** `src/components/shared/workspace/user-menu.tsx`, `src/app/(workspace)/settings/account/page.tsx`

`user-menu.tsx` links to `/settings/account?tab=security` and `/settings/account?tab=notifications`, but `account/page.tsx` initializes `activeTab` purely from state and never reads the `tab` query parameter. All three links open the "profile" tab.

**Fix:** Read `tab` from `useSearchParams()` on mount and pass it as the Tabs `defaultValue`.

### B7 — `trustedOrigins` hardcoded to localhost

**File:** `src/lib/auth.ts`

```ts
trustedOrigins: ["http://localhost:3000"],
```

`.env.example` documents `BETTER_AUTH_URL`, but the code ignores it. In a production deployment the app origin will not match the hardcoded list, which can break OAuth callback/session validation depending on deployment topology.

**Fix:** Derive trusted origins from the environment, e.g. `process.env.BETTER_AUTH_URL` (falling back to localhost for dev), rather than a literal.

### B8 — All session failures surface as 401

**File:** `src/lib/api/session.ts` (`resolveSession`)

The `catch` block maps *every* failure — including a dropped database connection during token verification — to `UNAUTHORIZED` (401). This masks infrastructure failures as authentication failures, which is confusing in monitoring and for clients.

**Note:** This appears intentional (documented in the module comments as "never leak Better Auth internals"). Low priority, but consider distinguishing a transient 503 from a genuine 401.

---

## 2. Performance Issues

### P1 — N+1 template seeding on workspace creation

**File:** `src/features/workspaces/services.ts` (`createWorkspace`)

Category/subcategory seeding runs one `tx.category.create` per category and one `tx.subCategory.create` per subcategory inside the `$transaction` — roughly 5 + 14 = **~19 sequential inserts** per workspace. Against a remote Supabase database each insert is a network round-trip.

**Fix:** Batch with `tx.category.createMany(...)` (categories first), then `tx.subCategory.createMany(...)` — reduces ~19 round-trips to ~3.

### P2 — Redundant onboarding-guard `profile` query on every API request

**Locations:** `GET`/`POST /api/v1/workspaces`, `PATCH`/`DELETE /api/v1/workspaces/[id]`, `POST /api/v1/workspaces/[id]/members`, `DELETE /api/v1/workspaces/[id]/members/[memberId]` — each performs

```ts
const profile = await db.profile.findUnique({ where: { userId }, select: { id: true } });
if (!profile) { return failure("ONBOARDING_REQUIRED", …); }
```

Six identical copies, one extra DB round-trip per request. See R1 — this belongs in the shared pipeline.

---

## 3. Dead Code

| ID | Item | Location | Detail |
|----|------|----------|--------|
| ID | Item | Location | Detail | Resolution |
|----|------|----------|--------|------------|
| D1 | `runPipeline` / `withPipeline` / `PipelineOptions` / `PipelineContext` | `src/lib/api/pipeline.ts` | **Zero callers.** Every route manually re-wires `withSession` + `validateBody` + `sanitizeObject`. Either adopt it (extended with the onboarding guard) or delete it. | ✅ Deleted (2026-08-16) |
| D2 | `sanitizeStringArray` | `src/lib/api/sanitize.ts` | Exported but never imported anywhere. | ✅ Removed (2026-08-16) |
| D3 | `AuthClient` type export | `src/lib/auth.ts` | Exported but never used. | ✅ Removed (2026-08-16) |
| D4 | `ui/table.tsx`, `ui/toast.tsx`, `ui/form.tsx` + deps | `src/components/ui/` | Never imported. `form.tsx` was the *only* consumer of `react-hook-form` + `@hookform/resolvers`; `toast.tsx` the only consumer of `@radix-ui/react-toast` (note: `docs/core/AGENT_RULES.md` mandates RHF usage, yet the only form in the app — the onboarding form — uses manual state). | ✅ Deleted files + uninstalled deps (2026-08-16) |
| D5 | `settings/page.tsx` | `src/app/(workspace)/settings/page.tsx` | Duplicate of `settings/layout.tsx` — see B2. | ✅ Replaced with redirect to `/settings/workspace` (2026-08-16) |
| D6 | `sidebarRef` | `src/components/shared/sidebar.tsx` | Assigned to `<aside ref={sidebarRef}>` but never read. | ✅ Removed (2026-08-16) |
| D7 | Debug `console.log`s | `src/features/workspaces/services.ts`, `src/app/api/v1/workspaces/route.ts` (GET) | Leftover logging in request paths. | ✅ Removed (2026-08-16) |
| D8 | Stale test references in comments | `src/lib/auth.ts`, `src/lib/api/session.ts`, `src/lib/api/envelope.ts`, `src/lib/api/validate.ts`, `src/lib/api/sanitize.ts` | Comments cite co-located suites (`auth.test.ts`, `session.test.ts`, …) that no longer exist — the "remove unit test" commit deleted all test files. Misleading for future contributors; the injection seams (e.g. `authInstance` params) remain but have no consumers. | ✅ Comments rewritten (2026-08-16) |

---

## 4. Refactoring Recommendations

### R1 — Build one real request pipeline and use it everywhere (highest value)

**Files:** `src/lib/api/pipeline.ts` + all route handlers under `src/app/api/v1/`

The `pipeline.ts` orchestrator already implements session + Zod validation + sanitization, but:
1. No route uses it (D1), and
2. It deliberately excludes the onboarding guard, so routes re-implement that check (P2).

**Recommended shape:** add a `withAuthenticatedPipeline(request, schema, handler, { requireOnboarding })` (or a dedicated `requireOnboarding` step) and migrate all six workspace/onboarding handlers to it. This eliminates:

- the 6 duplicated onboarding guards (P2),
- the manual `withSession`/`validateBody`/`sanitizeObject` triplets,
- and converts the dead `pipeline.ts` into the thing it was designed to be.

### R2 — Replace string-based error signaling with typed errors

**Files:** `src/features/workspaces/services.ts`, route handlers

Services signal domain failures by throwing `new Error("FORBIDDEN")` / `"USER_NOT_FOUND"` / `"ALREADY_MEMBER"` / `"MEMBER_NOT_FOUND"` / `"CANNOT_REMOVE_OWNER"`, and routes match on `err.message === "FORBIDDEN"` inside `catch (err: any)`.

**Problems:**
- Typing is lost (`err: any`), so a refactor of a message string silently breaks the mapping.
- A Prisma/unknown error falls through to a generic 500 with no way to distinguish intent.

**Fix:** Introduce a small `WorkspaceServiceError extends Error` (or an error-code class) with a `code` field, and have routes map `err.code` → envelope. Alternatively return a discriminated result union from the services (matching the style already used in `session.ts`/`validate.ts`).

### R3 — Configuration from environment

- `trustedOrigins` from `BETTER_AUTH_URL` (B7).
- Validate required env vars (`DATABASE_URL`, `BETTER_AUTH_SECRET`, OAuth credentials) at startup rather than relying on `!` non-null assertions (`src/lib/db.ts`, `src/lib/auth.ts`), so misconfiguration fails fast with a clear message.

---

## 5. Suggested Fix Order

1. **B1, B2, B3** — small, high-impact bug fixes (onboarding guard, duplicate settings page, build breaker). ✅ **Done 2026-08-16** — see Bugs fixed.
2. **R1 + P2** — pipeline refactor (removes duplication and an extra DB query per request). ✅ **Done 2026-08-17** — see Refactors completed.
3. **B4, B5, B6** — user-facing honesty/UX fixes on settings pages. ✅ **Done 2026-08-17** — see Bugs fixed.
4. **P1** — batch template seeding. ✅ **Done 2026-08-17** — see Performance fixes completed.
5. **D1–D8** — dead-code sweep (safe to do at any point; nothing references the removed items). ✅ **Done 2026-08-16** — see Resolution Log.
6. **B7, B8, R2, R3** — hardening pass before wider development. ✅ **Done 2026-08-17** — see Hardening completed.

---

## 6. Verification Notes

- No test files exist in the repository (`**/*.test.*` / `*.spec.*` returned zero matches) despite extensive comments referencing unit suites — see D8.
- Findings in this report are based on static code review; runtime behavior (e.g. the `next build` failure in B3, the 500 in B1) should be confirmed against the deployed environment before/after fixes.
- Dead-code removal (D1–D8) verified on 2026-08-16 with `npx tsc --noEmit` — no type errors.
- High-severity bug fixes (B1, B2, B3) verified on 2026-08-16 with `npx tsc --noEmit` and `npm run build` — both pass; `/error` now prerenders as static (`○ /error`), confirming the Suspense fix.
- Pipeline refactor (R1 + P2) verified on 2026-08-17 with `npx tsc --noEmit` (clean) and `npm run build` (compiles; all 5 API route files still render as `ƒ` dynamic).
- Settings UX fixes (B4, B5, B6) verified on 2026-08-17 with `npx tsc --noEmit` (clean) and `npm run build` (compiles; `/settings/account` and `/settings/workspace` still render as `ƒ` dynamic — the account page's `useSearchParams` is wrapped in Suspense so no CSR-bailout regression).
- Template-seeding batching (P1) verified on 2026-08-17 with `npx tsc --noEmit` (clean) and `npm run build` (passes).
- Hardening pass (B7, B8, R2, R3) verified on 2026-08-17 with `npx tsc --noEmit` (clean), `npm run lint` (the 4 route-handler `no-explicit-any` errors are gone; only pre-existing issues remain in untouched files), and `npm run build` (passes).
