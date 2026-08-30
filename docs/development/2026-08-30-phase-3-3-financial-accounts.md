# Implementation Plan: Phase 3.3 — Financial Accounts

**Date:** 2026-08-30
**Status:** 🔄 In Progress

---

## Overview

Build the Financial Accounts feature: CRUD for workspace-scoped accounts with name, type, and balance tracking. Archived accounts are hidden from transaction dropdowns but visible in a separate collapsed section.

### Business Rules
- Each workspace can have unlimited accounts
- Account name must be unique within a workspace
- Account types: `CHECKING`, `SAVINGS`, `CASH`, `CREDIT_CARD`, `DIGITAL_WALLET`, `INVESTMENT`
- Account type is set at creation and cannot be changed (MVP 2 migrates to account group table)
- Editable fields: name, initial balance only
- No hard delete — archive/unarchive only
- Archived accounts are excluded from total balance summary
- Archived accounts cannot be selected in transaction source/destination dropdowns
- Final balance = `initialBalance + netTransactionSum`
- `netTransactionSum` starts at 0 (updated in Phase 3.4)

---

## AGENTS.md Compliance

This plan follows all rules from `AGENTS.md`. Key adherence points:

| Rule | How It's Addressed |
|---|---|
| §1 Operating Standard | Each task starts from a concrete anchor (schema, existing file), has validation step, follows ownership boundary |
| §2 Conventions | `@/*` alias for imports, English naming, no narrated comments |
| §3 Architecture | Features under `src/features/accounts/`, routes as transport adapters, shared pipeline (`withPipeline`) + envelope (`success`/`failure`), Prisma singleton via `@/lib/db`, functional modules, reuses `handleWorkspaceErrors` pattern |
| §4 Data & Security | Prisma schema is source of truth (task 1), Zod v4 schemas in feature module (task 3), `withPipeline` handles `validateBody()` + `sanitizeObject()` automatically — no manual sanitization needed, workspace membership enforced in services (task 5), Prisma transactions for multi-row mutations |
| §5 Error Design | Typed `AccountServiceError` with error codes (task 4), envelope mapping via `accountErrorFailure()`, unexpected errors fall through to `INTERNAL_SERVER_ERROR` |
| §6 Frontend | Uses existing UI primitives (`Card`, `Button`, `Input`, `Select`, `Dialog`), `apiFetch()` for browser calls, loading/empty/success/failure states in every view, responsive layouts with breakpoints, icons from `lucide-react`, `withToast()` for create/edit/archive actions where toast is the only side effect |
| §7 Validation Gates | Each task validates, final step runs `tsc --noEmit` + `lint` + `build` + manual flow checks |
| §10 Definition of Done | Final validation checklist covers: ownership check, architecture scope, input/auth/tenant isolation, honest states, validation gates, migration documentation, outcome reporting with limitations noted |

### §4 Note — Sanitization
All route handlers use `withPipeline` which calls `sanitizeObject()` on the validated body automatically. No separate sanitization step is needed in route handlers or services.

### §6 Note — Toast Pattern
For create, edit, archive, and unarchive actions where the only user feedback is a success/error toast (no additional side effects like closing a dialog or resetting state), use `withToast()` from `@/lib/toast`. For actions that also manage loading state or have side effects beyond the toast (e.g., closing a dialog after success), use explicit `try/catch` with manual `toast.success()`/`toast.error()`.

### §10 Note — Validation Reporting
Each task's validation step should state what was validated (e.g., "tsc clean") and what could not be validated (e.g., "manual flow check pending until all tasks complete").

---

## Sub Tasks

- [x] 1. Prisma Schema — Add Account Type
  - **File:** `prisma/schema.prisma`
  - [x] Add `AccountType` enum: `CHECKING`, `SAVINGS`, `CASH`, `CREDIT_CARD`, `DIGITAL_WALLET`, `INVESTMENT`
  - [x] Add `type` field to `FinancialAccount` model (required, `@default(CHECKING)`)
  - [x] Run `npx prisma migrate dev --name add-account-type` — migration `20260830022900_add_account_type` created and applied
  - [x] Run `npx prisma generate` — Prisma Client generated
  - **Validate:** `npx tsc --noEmit` ✅ clean

- [x] 2. Feature Types (`src/features/accounts/types.ts`)
  - [x] Export `AccountType` enum re-export from Prisma client
  - [x] Define `AccountView` interface: `{ id, name, type, initialBalance, netTransactionSum, isArchived, createdAt }`
  - [x] Define `AccountFormData` type: `{ name: string, type: AccountType, initialBalance: number }`
  - [x] Define `AccountListResponse` type: `{ accounts: AccountView[] }`
  - **Validate:** `npx tsc --noEmit` ✅ clean

- [ ] 3. Feature Schemas (`src/features/accounts/schemas.ts`)
  - [ ] `AccountNameSchema` — z.string().min(1).max(100)
  - [ ] `AccountTypeSchema` — z.enum(["CHECKING", "SAVINGS", "CASH", "CREDIT_CARD", "DIGITAL_WALLET", "INVESTMENT"])
  - [ ] `CreateAccountSchema` — z.object({ name, type, initialBalance: z.number() })
  - [ ] `UpdateAccountSchema` — z.object({ name, initialBalance: z.number() }) (type not editable)
  - **Validate:** `npx tsc --noEmit`

- [ ] 4. Feature Errors (`src/features/accounts/errors.ts`)
  - [ ] `AccountServiceErrorCode` union: `FORBIDDEN`, `ACCOUNT_NOT_FOUND`, `NAME_TAKEN`
  - [ ] `AccountServiceError` class extending Error with `code` field
  - [ ] `accountErrorFailure()` helper for mapping to envelope responses
  - [ ] `handleAccountErrors()` route handler wrapper (same pattern as `handleWorkspaceErrors`)
  - **Validate:** `npx tsc --noEmit`

- [ ] 5. Feature Service (`src/features/accounts/services.ts`)
  - [ ] `getAccounts(userId, workspaceId)` — verify membership, return all accounts ordered by createdAt
  - [ ] `createAccount(userId, workspaceId, data)` — verify membership, check unique name, create account
  - [ ] `updateAccount(userId, accountId, data)` — verify membership via account's workspace, check unique name if changed, update name + initialBalance only
  - [ ] `archiveAccount(userId, accountId)` — verify membership, set isArchived = true
  - [ ] `unarchiveAccount(userId, accountId)` — verify membership, set isArchived = false
  - **Pattern:** Use `findWorkspaceOwner` helper or membership check for authorization
  - **Validate:** `npx tsc --noEmit`

- [ ] 6. API Routes — Accounts CRUD
  - **Directory:** `src/app/api/v1/workspaces/[workspaceId]/accounts/`
  - **§4 Note:** All routes use `withPipeline` which handles `validateBody()` + `sanitizeObject()` automatically. No manual sanitization needed.
  - [ ] `GET route.ts` — List accounts for workspace
    - Pipeline: `withPipeline` + `requireOnboarding`
    - Calls `getAccounts(userId, workspaceId)`
    - Returns `success({ accounts })`
  - [ ] `POST route.ts` — Create account
    - Pipeline: `withPipeline` + `schema: CreateAccountSchema` + `requireOnboarding`
    - Calls `createAccount(userId, workspaceId, data)`
    - Returns `success({ account })`
  - **Validate:** `npx tsc --noEmit`

- [ ] 7. API Routes — Account Actions
  - **Directory:** `src/app/api/v1/workspaces/[workspaceId]/accounts/[accountId]/`
  - [ ] `PATCH route.ts` — Update account (name, initialBalance)
    - Pipeline: `withPipeline` + `schema: UpdateAccountSchema` + `requireOnboarding`
    - Calls `updateAccount(userId, accountId, data)`
    - Returns `success({ account })`
  - **Directory:** `src/app/api/v1/workspaces/[workspaceId]/accounts/[accountId]/archive/`
  - [ ] `PATCH route.ts` — Archive account
    - Pipeline: `withPipeline` + `requireOnboarding`
    - Calls `archiveAccount(userId, accountId)`
    - Returns `success({ archived: true })`
  - **Directory:** `src/app/api/v1/workspaces/[workspaceId]/accounts/[accountId]/unarchive/`
  - [ ] `PATCH route.ts` — Unarchive account
    - Pipeline: `withPipeline` + `requireOnboarding`
    - Calls `unarchiveAccount(userId, accountId)`
    - Returns `success({ unarchived: true })`
  - **Validate:** `npx tsc --noEmit`

- [ ] 8. Accounts Page — Layout & State
  - **File:** `src/app/(workspace)/accounts/page.tsx`
  - [ ] "use client" page component
  - [ ] Fetch accounts from `/api/v1/workspaces/${workspaceId}/accounts` on mount
  - [ ] State: `accounts: AccountView[]`, `isLoading`, `error`
  - [ ] Use `useWorkspace()` for activeWorkspaceId
  - [ ] Separate accounts into `activeAccounts` (isArchived=false) and `archivedAccounts` (isArchived=true)
  - [ ] Compute `totalBalance` from active accounts only: sum of `initialBalance + netTransactionSum`
  - **Validate:** `npx tsc --noEmit`

- [ ] 9. Accounts Page — Active Accounts Section
  - **File:** `src/app/(workspace)/accounts/page.tsx`
  - [ ] Page header: "Accounts" title + "New Account" button
  - [ ] Total balance summary card (above the grid)
  - [ ] Grid of account cards (1 col mobile, 2 col md, 3 col lg)
  - [ ] Each card: name, type badge (colored), final balance, dropdown menu (⋮)
  - [ ] Dropdown actions: Edit, Archive
  - [ ] Empty state: illustration + "No accounts yet" + "Create Account" button
  - [ ] Loading state: skeleton/pulse placeholders
  - **Validate:** `npx tsc --noEmit`

- [ ] 10. Accounts Page — Archived Section
  - **File:** `src/app/(workspace)/accounts/page.tsx`
  - [ ] Collapsed by default, expandable toggle
  - [ ] Shows count: "Archived (N)"
  - [ ] Same card layout but without balance display
  - [ ] Dropdown actions: Unarchive
  - [ ] Empty archived section: hidden entirely (no empty state needed)
  - **Validate:** `npx tsc --noEmit`

- [ ] 11. Create Account Dialog
  - **File:** `src/app/(workspace)/accounts/_components/create-account-dialog.tsx`
  - [ ] Dialog with form: Name (Input), Type (Select), Initial Balance (Input type=number)
  - [ ] Type select options: Checking, Savings, Cash, Credit Card, Digital Wallet, Investment
  - [ ] Validation: name required (1-100 chars), type required, balance required (number)
  - [ ] Submit: POST to `/api/v1/workspaces/${workspaceId}/accounts`
  - [ ] Success: toast + refetch accounts list (use `withToast()` — no side effects beyond toast)
  - [ ] Error: toast with error message
  - [ ] Loading state on submit button
  - **Validate:** `npx tsc --noEmit`

- [ ] 12. Edit Account Dialog
  - **File:** `src/app/(workspace)/accounts/_components/edit-account-dialog.tsx`
  - [ ] Dialog with form: Name (Input), Initial Balance (Input type=number)
  - [ ] Type displayed as read-only badge (not editable)
  - [ ] Pre-fill form with current account data
  - [ ] Validation: name required (1-100 chars), balance required
  - [ ] Submit: PATCH to `/api/v1/workspaces/${workspaceId}/accounts/${accountId}`
  - [ ] Success: toast + refetch accounts list + close dialog (use explicit `try/catch` — has side effect of closing dialog)
  - **Validate:** `npx tsc --noEmit`

- [ ] 13. Sidebar Navigation
  - **File:** `src/components/shared/workspace/sidebar.tsx`
  - [ ] Verify "Accounts" nav item already exists with correct href `/accounts`
  - [ ] Verify isActive logic matches `/accounts` route
  - **Validate:** `npx tsc --noEmit`

- [ ] 14. Final Validation (§7 + §10)
  - [ ] Run `npx prisma migrate dev` — migration applies cleanly
  - [ ] Run `npx tsc --noEmit` — no type errors
  - [ ] Run `npm run lint` — no lint errors
  - [ ] Run `npm run build` — builds successfully
  - [ ] Manual: Create account → appears in list with correct balance
  - [ ] Manual: Edit account → name/balance updates
  - [ ] Manual: Archive account → moves to archived section
  - [ ] Manual: Unarchive account → moves back to active
  - [ ] Manual: Archived account not shown in transaction dropdowns (Phase 3.4)
  - [ ] Manual: Total balance excludes archived accounts
  - [ ] Report: list all validated items and note any limitations (e.g., transaction dropdown exclusion verified only visually, no automated tests available)

---

## Files to Create

| File | Purpose |
|---|---|
| `src/features/accounts/types.ts` | Domain types (AccountView, AccountFormData) |
| `src/features/accounts/schemas.ts` | Zod validation schemas |
| `src/features/accounts/errors.ts` | Domain errors + error mapping |
| `src/features/accounts/services.ts` | Business logic (CRUD + archive) |
| `src/app/api/v1/workspaces/[workspaceId]/accounts/route.ts` | GET (list) + POST (create) |
| `src/app/api/v1/workspaces/[workspaceId]/accounts/[accountId]/route.ts` | PATCH (update) |
| `src/app/api/v1/workspaces/[workspaceId]/accounts/[accountId]/archive/route.ts` | PATCH (archive) |
| `src/app/api/v1/workspaces/[workspaceId]/accounts/[accountId]/unarchive/route.ts` | PATCH (unarchive) |
| `src/app/(workspace)/accounts/page.tsx` | Accounts list page |
| `src/app/(workspace)/accounts/_components/create-account-dialog.tsx` | Create dialog |
| `src/app/(workspace)/accounts/_components/edit-account-dialog.tsx` | Edit dialog |

## Files to Modify

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add AccountType enum + type field on FinancialAccount |
