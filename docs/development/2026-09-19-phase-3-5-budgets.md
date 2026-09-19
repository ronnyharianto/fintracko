# Implementation Plan: Phase 3.5 — Budgeting System

**Date:** 2026-09-19
**Status:** 🚧 In Progress
**Depends on:** Phase 3.3 (Categories) and Phase 3.4 (Transactions) — both complete.

---

## Overview

Build the Budgeting feature: workspace-scoped CRUD for budgets attached to a Level 2
subcategory, with a Monthly or Yearly interval and a bounded period, plus real-time
utilization tracking against actual expense transactions.

This phase also produces the utilization data Phase 3.6 (Dashboard & Analytics) depends
on, which is why it precedes it.

### Locked Business Decisions

- **Overlap rule:** a subcategory may have many budgets over time, but no two budgets for
  the same subcategory may cover the same day. Create/update rejects an overlapping window.
- **Period end date:** inclusive last day. A budget matches a transaction when
  `date >= startDate && date <= endDate`.
  - `MONTHLY`: start = first day of a month, end = last day of the **same** month.
  - `YEARLY`: start = January 1, end = December 31 of the **same** year.
- **Utilization basis:** net sum of `EXPENSE` transaction amounts in the period. A negative
  expense (refund) reduces usage. `INCOME` and `TRANSFER` are ignored.
- **Lifecycle:** `interval` is fixed at creation and cannot change. Amount, period, and
  target subcategory are editable (re-validated for overlap). Hard delete is allowed — a
  budget is configuration and is not referenced by transactions.

### Assumptions (not explicitly stated in the PRD)

- A budget may only target a subcategory whose parent category type is `EXPENSE`.
- `amount` must be greater than zero.
- A budget covers exactly one calendar month or one calendar year (non-recurring).

### Documented PRD Deviation

The PRD states monthly "start and end date must be the first day of the month." Per the
confirmed product decision, the end date is the **inclusive last day** of the period
instead, matching the existing schema comment (`2025-10-31`). This deviation is recorded
here deliberately.

### Existing Schema (No Migration Needed)

The `Budget` model and `BudgetInterval` enum already exist in `prisma/schema.prisma` and in
the initial migration (`20260727142925_initial`). The generated client at
`generated/prisma/enums.ts` already exports `BudgetInterval`.

- **Fields:** `id`, `workspaceId`, `subCategoryId`, `amount Decimal(18,4)`,
  `interval BudgetInterval`, `startDate @db.Date`, `endDate @db.Date`, `createdAt`,
  `updatedAt`
- **Relations:** workspace (Cascade), subCategory (Cascade)
- **Indexes:** `(workspaceId, subCategoryId)`, `(subCategoryId, startDate, endDate)`
- Note: `endDate` has a schema default of `9999-12-31`; this feature always supplies an
  explicit period end.

---

## AGENTS.md Compliance

| Rule | How It Is Addressed |
|---|---|
| §1 Operating Standard | Each task starts from a concrete anchor (schema, existing transactions feature) and ends with a validation step; scope limited to this feature |
| §2 Conventions | English; `@/*` alias within `src`; preserve existing formatting/quote style; ASCII |
| §3 Architecture | Feature under `src/features/budgets/`; routes are thin transport adapters; shared `withPipeline` + envelope; Prisma singleton; functional modules |
| §4 Data & Security | No migration (schema is source of truth); Zod v4 schemas live in the feature module; `withPipeline` runs `validateBody()` + `sanitizeObject()`; membership enforced by `workspaceId` + `userId` in every service call; overlap check + write are atomic in `$transaction` |
| §5 Error Design | Typed `BudgetServiceError` with stable codes; mapped to explicit API codes/statuses; unexpected errors fall through to a generic 500 |
| §6 Frontend | Existing UI primitives; `apiFetch()`; `withToast()` only for the simple delete path; explicit `try/catch` for dialogs with side effects; honest loading/empty/success/failure/disabled states |
| §7 Validation Gates | `tsc --noEmit`, `lint`, `build`, and focused manual flow checks. **No automated tests exist in this repository.** |
| §10 Definition of Done | Final checklist covers ownership, scope, tenant isolation, honest states, validation, and reported limitations |

### §4 Note — Overlap Enforcement and Residual Risk

No database-level exclusion constraint exists for non-overlapping periods (Prisma cannot
express a Postgres `EXCLUDE` constraint declaratively). The service enforces non-overlap
inside a Prisma `$transaction`:

```
existing = count(budgets where workspaceId, subCategoryId,
                 startDate <= newEnd AND endDate >= newStart, id != self)
if (existing > 0) throw OVERLAPPING_BUDGET
```

Residual risk: two concurrent creates could theoretically both pass the count before either
writes. This is the same class of risk the repository already accepts; it is documented here
rather than silently ignored. A future migration adding a Postgres exclusion constraint
could close it.

### §6 Note — Toast Pattern

- **Use `withToast()`** when the only feedback is a success/error toast with no further
  side effects.
- **Use explicit `try/catch`** when the action also manages loading state, closes a dialog,
  or resets a form.

In this feature: delete uses `ConfirmDialog` (which already toasts and closes); create/edit
use explicit `try/catch` (close dialog + refetch).

---

## Utilization Model

For each budget:

```
spent          = SUM(amount) over EXPENSE transactions
                 where workspaceId, subCategoryId match and date in [startDate, endDate]
effectiveLimit = amount
utilization    = spent / amount * 100     (amount > 0 guarantees no division by zero)
status         = ACTIVE | UPCOMING | ENDED   (today vs [startDate, endDate])
```

- Sums are computed with Prisma's `Decimal(18,4)` and serialized to strings, never floats.
- `utilization` is emitted as a number for presentation only.
- Aggregation strategy: one `aggregate` per budget resolved with `Promise.all`; each query
  uses the existing `(workspaceId, date, type)` index. A single batched `groupBy` can
  replace it later if scale requires.

---

## Sub Tasks

- [x] 1. Phase development document (`docs/development/2026-09-19-phase-3-5-budgets.md`)
  - [x] Document scope, locked decisions, assumptions, and the PRD period-end deviation
  - [x] Document non-overlap enforcement, utilization model, and residual risks
  - [x] Include per-task checkbox status tracking
  - **Validate:** document matches the implemented contract

- [x] 2. Feature Types (`src/features/budgets/types.ts`)
  - [x] Define `BudgetView`: `{ id, subCategoryId, subCategoryName, categoryId, categoryName, amount, interval, startDate, endDate, spent, utilization, status, createdAt, updatedAt }`
  - [x] Define `BudgetStatus` union: `ACTIVE | UPCOMING | ENDED`
  - [x] Define `BudgetFormData` and `BudgetListResponse`
  - [x] Re-export `BudgetInterval` from Prisma
  - **Validate:** `npx tsc --noEmit`

- [x] 3. Feature Schemas (`src/features/budgets/schemas.ts`)
  - [x] `BudgetIntervalEnum` derived from the Prisma enum
  - [x] `CreateBudgetSchema` — `{ subCategoryId: uuid, amount: number > 0, interval, startDate, endDate }`
  - [x] Refinements: `startDate <= endDate` and interval alignment (monthly = same-month boundaries; yearly = same-year Jan 1 / Dec 31)
  - [x] `UpdateBudgetSchema` — `amount?`, `subCategoryId?`, `startDate?`, `endDate?`; **no `interval`** (frozen at creation)
  - [x] `BudgetQuerySchema` — `interval?`, `status?`
  - [x] Export inferred input types
  - **Validate:** `npx tsc --noEmit`

- [x] 4. Feature Errors (`src/features/budgets/errors.ts`)
  - [x] `BudgetServiceErrorCode`: `FORBIDDEN`, `BUDGET_NOT_FOUND`, `INVALID_SUBCATEGORY`, `OVERLAPPING_BUDGET`, `INVALID_PERIOD`
  - [x] `BudgetServiceError` class with stable `code` field
  - [x] `budgetErrorFailure()` and `handleBudgetErrors()` mirroring the transactions module
  - **Validate:** `npx tsc --noEmit`

- [x] 5. Period & Utilization Helpers (`src/features/budgets/utilization.ts`)
  - [x] Pure `isPeriodAligned(interval, startDate, endDate)`
  - [x] Pure `periodsOverlap(aStart, aEnd, bStart, bEnd)`
  - [x] Pure `computeUtilization(spent, amount)`
  - [x] Pure `budgetStatus(today, startDate, endDate)`
  - [x] Pure `periodBounds(interval, referenceDate)` deriving start/end
  - **Validate:** `npx tsc --noEmit`

- [x] 6. Feature Service (`src/features/budgets/services.ts`)
  - [x] `requireMembership()` reusing `findWorkspaceMembership`
  - [x] `getBudgets(userId, workspaceId, filters?)` — membership, list, compute spent/utilization/status, return `{ budgets, total }`
  - [x] `getBudget(userId, workspaceId, budgetId)` — scoped by both `budgetId` and `workspaceId`
  - [x] `createBudget(userId, workspaceId, data)` — validate subcategory (workspace, not archived, parent not archived, parent type `EXPENSE`), period alignment, overlap check + create in `$transaction`
  - [x] `updateBudget(userId, workspaceId, budgetId, data)` — interval frozen; re-validate merged values; overlap check excluding self + update in `$transaction`
  - [x] `deleteBudget(userId, workspaceId, budgetId)` — scoped delete
  - **Validate:** `npx tsc --noEmit`

- [x] 7. API Routes — List + Create (`src/app/api/v1/workspaces/[id]/budgets/route.ts`)
  - [x] `GET` — `withPipeline` + `requireOnboarding`; parse `BudgetQuerySchema`; return `success({ budgets, total })`
  - [x] `POST` — `withPipeline` + `CreateBudgetSchema` + `requireOnboarding`; map `INVALID_SUBCATEGORY` → `BAD_REQUEST`, `OVERLAPPING_BUDGET` → `CONFLICT`; return `success({ budget })`
  - **Validate:** `npx tsc --noEmit`
  - **Cannot validate:** route flow (auth, onboarding guard) requires a running app with a database

- [x] 8. API Routes — Detail + Update + Delete (`src/app/api/v1/workspaces/[id]/budgets/[budgetId]/route.ts`)
  - [x] `GET` — scoped detail (`workspaceId` + `budgetId`)
  - [x] `PATCH` — `UpdateBudgetSchema`; overlap re-check excluding self
  - [x] `DELETE` — scoped delete; return `success({ deleted: true })`
  - [x] Consume the `id` path parameter in the authorization/database predicate (§4 — no leaf-ID-only lookups)
  - **Validate:** `npx tsc --noEmit`
  - **Cannot validate:** route flow requires a running app with a database

- [x] 9. Budgets Page — Layout & State (`src/app/(workspace)/budgets/page.tsx`)
  - [x] Replace the placeholder stub with a `"use client"` page using `useWorkspace()` + `useWorkspaceCollection`
  - [x] State: month/year view mode + reference period, interval filter, create/edit/delete dialog state
  - [x] Summary card: total budgeted vs total spent across the visible budgets, with overall utilization
  - [x] Honest loading (skeletons), empty, error + Retry states
  - **Validate:** `npx tsc --noEmit`

- [x] 10. Budget Card & Filters (`_components/budget-card.tsx`, `_components/budget-filters.tsx`)
  - [x] Card: subcategory → parent category, interval badge, `spent / amount`, progress bar (visually capped at 100%), and a footer pairing utilization % with a compact period token ("Jun 2026" / "2026"). The status badge was removed once period navigation made it redundant.
  - [x] Dropdown (⋮) with Edit and Delete actions
  - [x] Filter: interval (All/Monthly/Yearly). The status filter was removed in the view refactor below.
  - **Validate:** `npx tsc --noEmit`

- [x] 11. Create Budget Dialog (`_components/create-budget-dialog.tsx`)
  - [x] Fields: interval, cascading category then subcategory picker (non-archived EXPENSE categories only), `CurrencyInput` amount, month/year period picker deriving `startDate`/`endDate`
  - [x] Persist the selected `subCategoryId` (the category is a picker aid only)
  - [x] Submit via `apiFetch`; explicit `try/catch` (close dialog + refetch)
  - [x] Inline error, submit loading state, disabled state until valid
  - **Validate:** `npx tsc --noEmit`
  - **Cannot validate:** full form flow requires a running app with categories populated

- [x] 12. Edit & Delete Dialogs (`_components/edit-budget-dialog.tsx`, `_components/delete-budget-dialog.tsx`)
  - [x] Edit pre-fills the cascading category/subcategory and keeps the current target selectable if archived; interval read-only; re-validates overlap; explicit `try/catch`
  - [x] Delete uses shared `ConfirmDialog`
  - **Validate:** `npx tsc --noEmit`
  - **Cannot validate:** overlap re-check and period recomputation require a running app

- [ ] 13. Final Validation (§7 + §10)
  - [x] Run `npx tsc --noEmit` — clean
  - [x] Run `npm run lint` — clean
  - [x] Run `npm run build` — succeeds
  - [ ] Manual: create monthly + yearly budget
  - [ ] Manual: edit amount and period
  - [ ] Manual: delete budget
  - [ ] Manual: overlapping budget rejected with `CONFLICT`
  - [ ] Manual: archived / non-EXPENSE subcategory rejected
  - [ ] Manual: utilization reflects a refund (negative expense)
  - [ ] Manual: budgets isolated across workspaces
  - [ ] Manual: sidebar `/budgets` resolves
  - [ ] Report: list validated items and note limitations

---

## View Refactor (post-implementation)

After the first UI pass, the page was refactored so the primary axis is time, not status:

- [x] Add a **Month / Year** view-mode toggle.
- [x] Add period navigation (previous / next, with a "This month"/"This year" reset). Next is
disabled on the current period, mirroring the transactions page.
- [x] Scope the visible budgets by period overlap: a budget is shown when its inclusive
period intersects the selected month or year.
- [x] Keep the **interval** filter (All / Monthly / Yearly) as the secondary filter over the
selected period.
- [x] Remove the **status** filter from the UI: "Active / Upcoming / Ended" is relative to
today, so it becomes meaningless when reviewing past periods. The `status` query parameter
remains available on the list endpoint.
- [x] Recompute the summary card from the visible set ("Budgets in this period") instead of
all active budgets.
- [x] Add distinct empty states for: no budgets at all, no budgets in the selected period,
and no budgets matching the interval filter.
- [x] Filtering is client-side over the workspace's budget list; per-workspace budget counts
are small, and `useWorkspaceCollection` only refetches on workspace change.

### Category Grouping

The list can be grouped by parent category to make review easier:

- [x] Grouping is the **default** and is toggleable from the toolbar; the preference persists
under `fintracko_budgets_group_by_category` (grouped when `localStorage` is unavailable).
- [x] Sections cover only categories with budgets surviving the period and interval filters.
- [x] Each section header carries only the category name, the category's total budget, its
used percentage, and a roll-up bar. It is lighter than a card so it does not compete.
- [x] Section headers are collapsible and **start collapsed**, so the page opens as a
scannable set of category totals; the opened set lives in component state for the session.
- [x] Budgets within a section are ordered by utilization descending (most-used first).
- [x] Sections are ordered alphabetically by category name, so the structure is predictable
regardless of the incoming budget order.
- [x] Turning grouping off restores the original flat responsive grid.

### Search and Card Cleanup

- [x] A search field filters the visible budgets by subcategory or category name, case-insensitively,
and composes with the period, interval, and grouping controls.
- [x] The shared `SearchInput` primitive (`src/components/ui/search-input.tsx`) backs both the budget
and transaction search fields.
- [x] A search-specific empty state distinguishes "no matches" from "nothing in this period".
- [x] The card's status badge (Active / Upcoming / Ended) was removed: the page is period-scoped, so
status is largely a function of the selected view and the interval badge plus the period token
already carry what it said.

---

## Files to Create

| File | Purpose |
|---|---|
| `docs/development/2026-09-19-phase-3-5-budgets.md` | This development plan |
| `src/features/budgets/types.ts` | Domain types (`BudgetView`, `BudgetFormData`, `BudgetListResponse`) |
| `src/features/budgets/schemas.ts` | Zod v4 validation schemas |
| `src/features/budgets/errors.ts` | Domain errors + envelope mapping |
| `src/features/budgets/utilization.ts` | Pure period + utilization helpers |
| `src/features/budgets/services.ts` | Business logic (CRUD + overlap enforcement + utilization) |
| `src/app/api/v1/workspaces/[id]/budgets/route.ts` | `GET` (list) + `POST` (create) |
| `src/app/api/v1/workspaces/[id]/budgets/[budgetId]/route.ts` | `GET` + `PATCH` + `DELETE` |
| `src/app/(workspace)/budgets/_components/create-budget-dialog.tsx` | Create dialog |
| `src/app/(workspace)/budgets/_components/edit-budget-dialog.tsx` | Edit dialog |
| `src/app/(workspace)/budgets/_components/delete-budget-dialog.tsx` | Delete confirmation |
| `src/app/(workspace)/budgets/_components/budget-card.tsx` | Budget card with progress bar + status badge |
| `src/app/(workspace)/budgets/_components/budget-filters.tsx` | Interval / status filter bar |
| `src/app/(workspace)/budgets/_components/budget-period.ts` | Shared period-picker helpers (default + derive bounds) |
| `src/app/(workspace)/budgets/_components/expense-categories.ts` | Shared fetcher for active expense categories with their subcategories |
| `src/app/(workspace)/budgets/_components/year-picker.tsx` | Year-only dropdown picker for yearly budgets (no native year input exists) |
| `src/app/(workspace)/budgets/_components/budget-view-period.ts` | Pure month/year view range, label, and navigation helpers |
| `src/app/(workspace)/budgets/_components/budget-grouping.tsx` | Toolbar toggle for category grouping |
| `src/app/(workspace)/budgets/_components/budget-sections.ts` | Pure category grouping with subtotals and utilization ordering |
| `src/app/(workspace)/budgets/_components/budget-section.tsx` | Collapsible category section header + card grid |

## Files to Modify

| File | Change |
|---|---|
| `src/app/(workspace)/budgets/page.tsx` | Replace placeholder stub with the real Budgets page |
| `src/components/shared/workspace/sidebar.tsx` | Verify the existing Budgets nav item (`/budgets`) — expected no change |

---

## Out of Scope

- Automated test harness or test files (explicitly deferred by product decision).
- Budget rollover / carry-over.
- Recurring or auto-created budgets.
- Phase 3.6 dashboard charts and "Top 5 budgets" cards — this phase only produces the
  utilization data they will consume.

## Risks and Limitations

1. **No DB-level overlap constraint** — service-level check inside `$transaction`;
   concurrent-create race documented above.
2. **PRD period-end deviation** — inclusive last day instead of the literal "first day"
   wording; recorded in this document.
3. **No automated tests** — validation relies on typecheck, lint, build, and manual flows.
4. **Aggregation cost** — one aggregate query per budget on list; acceptable at current
   scale, with a batched `groupBy` as the documented fallback.
