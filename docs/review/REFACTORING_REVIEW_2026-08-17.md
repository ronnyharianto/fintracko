# Fintracko — Senior Refactoring Review

**Date:** August 17, 2026
**Branch reviewed:** `develop`
**Scope:** Second-pass review of the current codebase, performed *after* the first review's items (B1–B8, P1–P2, R1–R3, D1–D8) were all resolved and committed.

This document catalogs refactoring opportunities found during a senior-dev read-through of the post-hardening codebase. Items are grouped by priority and ordered by value. File paths are relative to the project root; line numbers refer to the state of the files at review time.

**Baseline at review time:** `npx tsc --noEmit` clean, `npm run lint` reports 1 error + 2 warnings (all pre-existing, see L6), working tree clean.

---

## Severity Summary

| ID | Severity | Category | Issue | Location |
|----|----------|----------|-------|----------|
| H1 | 🔴 High | Refactor ✅ | Ownership guard (`findFirst` + throw `FORBIDDEN`) duplicated 4× in the workspace service layer | `src/features/workspaces/services.ts` (lines 89, 151, 186, 214) |
| H2 | 🔴 High | Bug | Sidebar links to 4 routes that do not exist (`/accounts`, `/transactions`, `/budgets`, `/analytics`) — 4 of 6 nav items 404 | `src/components/shared/sidebar.tsx` |
| H3 | 🔴 High | Refactor | ~6 hand-rolled `fetch` + envelope-unwrap + `alert()` blocks on the client; mixes `alert()` and sonner `toast` | workspace dialogs + `settings/workspace/page.tsx` |
| H4 | 🟠 Medium | Refactor | `Member` / `Workspace` interfaces copy-pasted across 3 client files (Member ×3, Workspace ×2) plus a third thinner `Workspace` shape in the workspace context | `settings/workspace/page.tsx`, `workspace-card.tsx`, `collaborator-list.tsx`, `workspace-context.tsx` |
| M1 | 🟠 Medium | Refactor | Route try/catch boilerplate (`workspaceErrorFailure` mapping + generic 500 fallback) repeated in 4 handlers | `workspaces/[id]/route.ts` ×2, `members/route.ts`, `members/[memberId]/route.ts` |
| M2 | 🟠 Medium | Refactor | `UpdateWorkspaceSchema` re-declares the workspace-name validation already in `CreateWorkspaceSchema`; schema lives in a route file, not the feature schemas module | `src/app/api/v1/workspaces/[id]/route.ts`, `src/features/workspaces/schemas.ts` |
| M3 | 🟠 Medium | Refactor | Split-brain fetch/state logic: `loadOwnedWorkspaces` and the mount effect duplicate the load path; same duplication in `workspace-context.tsx` (`refreshWorkspaces` vs mount effect) | `settings/workspace/page.tsx`, `workspace-context.tsx` |
| M4 | 🟢 Low | Refactor | `AuthLike` / `SessionLike` structural types re-declared instead of imported from `session.ts` (which exports them) | `src/components/guards/onboarding-guard-wrapper.tsx` |
| L1 | 🟢 Low | Refactor | Avatar-initials logic duplicated between the user menu and the account page | `user-menu.tsx`, `settings/account/page.tsx` |
| L2 | 🟢 Low | Refactor | `createWorkspace` throws bare `new Error(...)` for an invalid template — inconsistent with the R2 typed-error approach (near-unreachable: Zod validates `templateName`) | `src/features/workspaces/services.ts` |
| L3 | 🟢 Low | Cleanup | Stale comment claims a retry loop that does not exist | `src/components/shared/workspace/user-menu.tsx` |
| L4 | 🟢 Low | Doc drift | AGENT_RULES.md mandates `react-hook-form` for client forms, but the D4 sweep removed the deps and all forms use manual state | `docs/core/AGENT_RULES.md` vs `src/components/**` |
| L5 | 🟢 Low | Refactor | Settings nav item rendered via an IIFE duplicating the NavLink markup; stale "workspace switcher in sidebar on mobile" comment | `src/components/shared/sidebar.tsx` |
| L6 | 🟢 Low | Lint debt | `edit-workspace-dialog.tsx` setState-in-effect (error), `collaborator-list.tsx` unused `workspaceId` (warning), `<img>` in account Avatar card (warning) | 3 files |

---

## 0. Resolution Log

| ID | Resolution |
|----|------------|
| H1 | ✅ Extracted `findWorkspaceOwner(userId, workspaceId)` in `src/features/workspaces/services.ts` — a private helper that returns the OWNER membership row (`{ id }` via a compound-filtered `WorkspaceMember` lookup on `workspaceId` + `userId` + `role: "OWNER"`) or `null`. The 4 duplicated guard blocks in `inviteCollaborator`, `removeCollaborator`, `deleteWorkspace`, and `updateWorkspace` now call the helper and throw `WorkspaceServiceError("FORBIDDEN")` **at their own call site** when it returns `null`, keeping the error handling visible where it happens (per review feedback on 2026-08-17 — the helper returns a result, it does not throw). Verified with `npx tsc --noEmit` (clean) and `npx eslint src/features/workspaces/services.ts` (clean). No behavior change. |

---

## 1. High Priority

### H1 — Ownership guard duplicated 4× in the workspace service layer

**File:** `src/features/workspaces/services.ts`

`inviteCollaborator`, `removeCollaborator`, `deleteWorkspace`, and `updateWorkspace` each begin with the identical block:

```ts
const isOwner = await db.workspaceMember.findFirst({
  where: { workspaceId, userId, role: "OWNER" },
});
if (!isOwner) {
  throw new WorkspaceServiceError("FORBIDDEN");
}
```

Four copies of the same ownership check (the same class of duplication that R1/P2 eliminated on the API side). Any change to the guard (query shape, error code, caching) must be made 4×.

**Fix:** Extract a private `assertWorkspaceOwner(userId, workspaceId)` helper in `services.ts` (throws `WorkspaceServiceError("FORBIDDEN")`) and call it from the four mutating services. No behavior change.

### H2 — Sidebar links to 4 routes that do not exist

**File:** `src/components/shared/sidebar.tsx`

The `navItems` array contains `/accounts`, `/transactions`, `/budgets`, and `/analytics`. `src/app/(workspace)/` currently contains only `dashboard`, `settings`, and `workspaces` — so **4 of the 6 sidebar links land on 404 pages**. The dashboard is a placeholder (`<h1>Dashboard</h1>`), so the other modules are simply not built yet, but the nav advertises them as live.

**Fix (pick one):**
- Hide/disable the not-yet-built items until the features ship (keep only Dashboard + Settings), or
- Ship minimal placeholder pages for each route (consistent with the dashboard stub), so navigation never 404s.

### H3 — Hand-rolled `fetch` + envelope + `alert()` blocks on the client

**Files:** `create-workspace-dialog.tsx`, `edit-workspace-dialog.tsx`, `delete-workspace-dialog.tsx`, `invite-collaborator-dialog.tsx`, `settings/workspace/page.tsx`

Every mutation on the client repeats the same shape:

```ts
const res = await fetch(`/api/v1/...`, { method, headers, body });
if (res.ok) { ... } else {
  const json = await res.json();
  alert(json.error?.message || 'Failed to ...');
}
```

(~6 copies.) The account page uses sonner `toast`, the workspace dialogs use `alert()` — inconsistent UX and duplicated error-unwrapping that assumes the envelope contract by hand.

**Fix:** Add a small typed client helper (e.g. `apiFetch<T>(path, init)` in `src/lib/api/`) that unwraps the `{ success, data, error }` envelope, throws a typed `ApiClientError` carrying the envelope code/message, and reuse it across all dialogs/pages — standardizing on sonner `toast` for feedback.

### H4 — Duplicate domain types on the client

**Files:** `settings/workspace/page.tsx`, `workspace-card.tsx`, `collaborator-list.tsx`, `workspace-context.tsx`

The `Member` interface (with nested `user`) is declared identically in 3 files; the full `Workspace` interface (with `_count`) in 2; `workspace-context.tsx` declares a third, thinner `Workspace { id, name, role }`.

**Fix:** Extract a single client-safe types module (e.g. `src/features/workspaces/types.ts`) exporting `Workspace`, `Member`, and the minimal `WorkspaceSummary` used by the context, and import it everywhere. Removes 5 copy-pasted blocks and the drift risk they carry.

---

## 2. Medium Priority

### M1 — Route try/catch boilerplate (4×)

**Files:** `workspaces/[id]/route.ts` (PATCH, DELETE), `workspaces/[id]/members/route.ts`, `workspaces/[id]/members/[memberId]/route.ts`

Each handler repeats:

```ts
try { ... } catch (err) {
  const mapped = workspaceErrorFailure(err, { ...codes... });
  if (mapped) return mapped;
  return failure('INTERNAL_SERVER_ERROR', 'Failed to ...');
}
```

The mapping tables differ per route (correct), but the surrounding boilerplate is identical.

**Fix:** Add a small helper (e.g. `mapWorkspaceError(err, messages, fallbackMessage)` in `errors.ts`) or an optional `errorMapper` option on `withPipeline`, so handlers declare only their error mapping + fallback message.

### M2 — Workspace-name validation duplicated; schema in the wrong place

**Files:** `src/app/api/v1/workspaces/[id]/route.ts`, `src/features/workspaces/schemas.ts`

The inline `UpdateWorkspaceSchema` re-declares `name: z.string().min(1).max(100)` that already exists inside `CreateWorkspaceSchema`. Per AGENT_RULES §2, domain schemas belong in `src/features/<domain>/schemas.ts`, not in route files.

**Fix:** Extract `WorkspaceNameSchema` into `features/workspaces/schemas.ts` and reuse it in both `CreateWorkspaceSchema` and the PATCH handler's schema.

### M3 — Split-brain fetch/state logic

**Files:** `settings/workspace/page.tsx`, `workspace-context.tsx`

- `settings/workspace/page.tsx`: `loadOwnedWorkspaces` and the mount effect duplicate the fetch + setState path (they were split only to satisfy `react-hooks/set-state-in-effect`).
- `workspace-context.tsx`: `refreshWorkspaces` and the mount effect duplicate the `fetchWorkspaces → applyWorkspaces` path.

**Fix:** Extract a `useOwnedWorkspaces()` hook (page) and a single internal `load` routine (context) so there is exactly one load path per concern.

### M4 — Re-declared structural types in the onboarding guard

**File:** `src/components/guards/onboarding-guard-wrapper.tsx`

`AuthLike` and `SessionLike` are re-declared locally, identical to the exported types in `src/lib/api/session.ts`. The lazy `getProductionAuth` also duplicates `session.ts`'s `getProductionAuth`.

**Fix:** Import `AuthLike`/`SessionLike` from `@/lib/api/session` (client-safe? — verify: these are type-only imports, so no runtime coupling) and reuse `getProductionAuth` where possible.

---

## 3. Low Priority / Cleanup

### L1 — Avatar-initials logic duplicated
`user-menu.tsx` has `getInitials(name)`; `settings/account/page.tsx` inlines `user?.name?.charAt(0).toUpperCase()`. Extract a `getInitials()` util (e.g. into `src/lib/utils.ts` or a shared avatar component) and use it in both.

### L2 — Bare `new Error(...)` in `createWorkspace`
`throw new Error(\`Invalid workspace template: ...\`)` is inconsistent with the R2 typed-error approach. It is effectively unreachable because `CreateWorkspaceSchema` restricts `templateName` to the enum — simplify (drop the cast + runtime check) or throw a typed error.

### L3 — Stale comment in `user-menu.tsx`
The `fetchSession` comment claims "Retry transient network failures", but there is no retry loop (unlike `workspace-context.tsx`, which has one). Either add the retry or fix the comment.

### L4 — AGENT_RULES vs code drift on forms
`docs/core/AGENT_RULES.md` §2 mandates `react-hook-form` (+ `@hookform/resolvers/zod`) for Client Component forms, but the D4 dead-code pass removed those dependencies and every form (onboarding, all dialogs) uses manual `useState`. Decide one way: adopt RHF (large) or update the doc to reflect the actual approach.

### L5 — Sidebar markup duplication
The Settings item is rendered inside `{(() => { ... })()}` duplicating the NavLink JSX from the `navItems` map. Extract a small `NavLink` component and render Settings through it. The comment "on mobile it's in sidebar" for the workspace switcher is stale — the sidebar renders no switcher.

### L6 — Remaining lint debt (pre-existing, not introduced by prior passes)
- `edit-workspace-dialog.tsx:32` — `react-hooks/set-state-in-effect` (**error**; the `useEffect` seeds `name` from `workspace` — fix with the adjust-state-during-render pattern used in `settings/account/page.tsx`).
- `collaborator-list.tsx:26` — unused `workspaceId` prop (warning; either use it or drop the prop).
- `settings/account/page.tsx:228` — `<img>` instead of `next/image` (warning; requires `images.remotePatterns` config for the OAuth avatar host).

---

## 4. Deliberately Out of Scope

- **API pipeline core** (`pipeline.ts`, `envelope.ts`, `session.ts`, `validate.ts`, `sanitize.ts`) — clean, well-documented, recently verified.
- **`theme-toggle.tsx` setState-in-effect** — legitimate DOM-sync pattern with a documented eslint-disable.
- **Dashboard stub** — placeholder for a feature that has not shipped yet.

---

## 5. Suggested Fix Order

1. **H1** — extract `assertWorkspaceOwner` (smallest, safest structural win; same playbook as R1/P2).
2. **H2** — fix the 404 nav links (user-visible; decide hide-vs-placeholder).
3. **H4 + M2** — shared client types + shared `WorkspaceNameSchema` (pure dedup, no behavior change).
4. **M1** — fold route error-mapping boilerplate into a helper.
5. **H3** — typed `apiFetch` client helper; migrate dialogs off `alert()` onto sonner.
6. **M3, M4** — hook extraction + shared auth types.
7. **L1–L6** — cleanup pass (includes the 1 lint error + 2 warnings).

Each item should be implemented one at a time, committed separately, and this document updated with a resolution log — mirroring how the first review's items were handled.

## 6. Verification Notes

- H1 verified on 2026-08-17 with `npx tsc --noEmit` (clean) and `npx eslint src/features/workspaces/services.ts` (clean).
