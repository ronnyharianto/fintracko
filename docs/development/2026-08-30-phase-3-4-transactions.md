# Implementation Plan: Phase 3.4 — Transaction Management

**Date:** 2026-08-30
**Status:** 🔄 In Progress

---

## Overview

Build the Transaction Management feature: CRUD for workspace-scoped financial transactions with type classification (Income, Expense, Transfer), account association, category/subcategory selection, and atomic balance updates. Includes image attachment upload via Imgur API.

### Business Rules

- Transaction types: INCOME, EXPENSE, TRANSFER
- Mandatory fields: date, type, subCategory, amount
- Account association rules:
  - INCOME → `destinationAccountId` required
  - EXPENSE → `sourceAccountId` required
  - TRANSFER → both `sourceAccountId` and `destinationAccountId` required
- Amount must be a positive number
- `subCategoryId` references the subcategory directly — transactions are detached from category/subcategory names
- When a category or subcategory is renamed, existing transactions are unaffected
- When a category is archived, its subcategories become inaccessible for new transactions, but existing transactions remain valid
- When an account is archived, it cannot be used for new transactions, but existing transactions remain valid
- **Atomic balance updates:** `netTransactionSum` on source/destination accounts must be updated atomically inside a Prisma `$transaction` block on every create/update/delete
- **Race condition handling:** Use Prisma's `increment`/`decrement` with `WHERE` conditions for atomic balance mutations
- Optional fields: description, payeePayer, tags (string array), attachmentUrl
- Attachment upload: image uploaded to Imgur API from Next.js backend, public URL stored in database
- `createdById` / `updatedById` track who created/modified the transaction

### Existing Schema (No Migration Needed)

The `FinancialTransaction` model already exists in `prisma/schema.prisma`:

- **Fields:** `id`, `workspaceId`, `type`, `amount`, `subCategoryId`, `date`, `sourceAccountId?`, `destinationAccountId?`, `description?`, `payeePayer?`, `tags[]`, `attachmentUrl?`, `createdById?`, `updatedById?`, timestamps
- **Relations:** workspace, sourceAccount (Restrict), destinationAccount (Restrict), subCategory (Restrict), createdBy (SetNull), updatedBy (SetNull)
- **Indexes:** `(workspaceId, date, type)`, `(sourceAccountId)`, `(destinationAccountId)`, `(payeePayer)`

### Existing Features That Feed Into This Phase

- **Accounts** (Phase 3.3): Active accounts appear in source/destination dropdowns; archived accounts excluded
- **Categories** (Phase 3.3): Active categories/subcategories appear in category picker; archived ones excluded
- **Account balance** (Phase 3.3): `netTransactionSum` starts at 0, updated atomically by this phase

---

## AGENTS.md Compliance

| Rule | How It's Addressed |
|---|---|
| §1 Operating Standard | Each task starts from a concrete anchor (schema, existing file), has validation step, follows ownership boundary |
| §2 Conventions | `@/*` alias for imports, English naming, no narrated comments |
| §3 Architecture | Features under `src/features/transactions/`, routes as transport adapters, shared pipeline (`withPipeline`) + envelope (`success`/`failure`), Prisma singleton via `@/lib/db`, functional modules |
| §4 Data & Security | Prisma schema is source of truth (no migration needed), Zod v4 schemas in feature module, `withPipeline` handles `validateBody()` + `sanitizeObject()` automatically, workspace membership enforced in services, Prisma `$transaction` for atomic balance updates |
| §5 Error Design | Typed `TransactionServiceError` with error codes, envelope mapping via `transactionErrorFailure()`, unexpected errors fall through to `INTERNAL_SERVER_ERROR` |
| §6 Frontend | Uses existing UI primitives (`Card`, `Button`, `Input`, `Select`, `Dialog`), `apiFetch()` for browser calls, loading/empty/success/failure states, responsive layouts, `CurrencyInput` for amount field, `withToast()` for simple actions |
| §7 Validation Gates | Each task validates, final step runs `tsc --noEmit` + `lint` + `build` + manual flow checks |
| §10 Definition of Done | Final validation checklist covers: ownership check, architecture scope, input/auth/tenant isolation, honest states, validation gates, outcome reporting with limitations noted |

### §4 Note — Sanitization

All route handlers use `withPipeline` which calls `sanitizeObject()` on the validated body automatically. No separate sanitization step is needed.

### §4 Note — Atomic Balance Updates

Every transaction create/update/delete MUST update `netTransactionSum` on the affected source/destination accounts inside a Prisma `$transaction` block. Use `db.financialAccount.update({ where: { id }, data: { netTransactionSum: { increment: amount } } })` for atomic increments. This prevents race conditions when multiple transactions affect the same account simultaneously.

### §6 Note — Toast Pattern

For create, update, and delete actions where the only user feedback is a success/error toast (no additional side effects like closing a dialog or resetting state), use `withToast()` from `@/lib/toast`. For actions that also manage loading state or have side effects beyond the toast (e.g., closing a dialog after success), use explicit `try/catch` with manual `toast.success()`/`toast.error()`.

### §10 Note — Validation Reporting

Each task's validation step should state what was validated and what could not be validated.

---

## Sub Tasks

- [ ] 1. Feature Types (`src/features/transactions/types.ts`)
  - [ ] Define `TransactionView` interface: `{ id, type, amount, date, subCategoryId, sourceAccountId, destinationAccountId, description, payeePayer, tags, attachmentUrl, createdById, createdAt, updatedAt }`
  - [ ] Define `TransactionFormData` type: `{ type, amount, date, subCategoryId, sourceAccountId?, destinationAccountId?, description?, payeePayer?, tags?, attachmentUrl? }`
  - [ ] Define `TransactionListResponse` type: `{ transactions: TransactionView[], total: number }`
  - [ ] Re-export `TransactionType` from Prisma
  - **Validate:** `npx tsc --noEmit`

- [ ] 2. Feature Schemas (`src/features/transactions/schemas.ts`)
  - [ ] `CreateTransactionSchema` — z.object({ type, amount: z.number().positive(), date, subCategoryId, sourceAccountId?, destinationAccountId?, description?, payeePayer?, tags?, attachmentUrl? })
  - [ ] `UpdateTransactionSchema` — same fields as create (all optional except those required by type)
  - [ ] Custom Zod refinement for account rules: INCOME requires destinationAccountId, EXPENSE requires sourceAccountId, TRANSFER requires both
  - [ ] Type inference exports
  - **Validate:** `npx tsc --noEmit`

- [ ] 3. Feature Errors (`src/features/transactions/errors.ts`)
  - [ ] `TransactionServiceErrorCode` union: `FORBIDDEN`, `TRANSACTION_NOT_FOUND`, `INVALID_ACCOUNT`, `INVALID_CATEGORY`, `SOURCE_DESTINATION_SAME`
  - [ ] `TransactionServiceError` class extending Error with `code` field
  - [ ] `transactionErrorFailure()` helper for mapping to envelope responses
  - [ ] `handleTransactionErrors()` route handler wrapper
  - **Validate:** `npx tsc --noEmit`

- [ ] 4. Feature Service (`src/features/transactions/services.ts`)
  - [ ] `getTransactions(userId, workspaceId, filters?)` — verify membership, return transactions with optional filters (date range, type, category, account), ordered by date desc
  - [ ] `createTransaction(userId, workspaceId, data)` — verify membership, validate accounts exist and are not archived, validate subcategory exists and is not archived, create transaction + atomic balance update in `$transaction` block
  - [ ] `updateTransaction(userId, transactionId, data)` — verify membership, validate accounts, reverse old balance effect + apply new balance effect in `$transaction` block
  - [ ] `deleteTransaction(userId, transactionId)` — verify membership, reverse balance effect + delete in `$transaction` block
  - [ ] `requireMembership()` — reuse `findWorkspaceMembership` from `@/lib/auth/membership`
  - **Validate:** `npx tsc --noEmit`

- [ ] 5. API Routes — Transactions CRUD
  - **Directory:** `src/app/api/v1/workspaces/[id]/transactions/`
  - [ ] `GET route.ts` — List transactions with filters
    - Pipeline: `withPipeline` + `requireOnboarding`
    - Query params: `type`, `categoryId`, `subCategoryId`, `accountId`, `from`, `to`, `page`, `limit`
    - Calls `getTransactions(userId, workspaceId, filters)`
    - Returns `success({ transactions, total })`
  - [ ] `POST route.ts` — Create transaction
    - Pipeline: `withPipeline` + `schema: CreateTransactionSchema` + `requireOnboarding`
    - Calls `createTransaction(userId, workspaceId, data)`
    - Returns `success({ transaction })`
  - **Validate:** `npx tsc --noEmit`

- [ ] 6. API Routes — Transaction Actions
  - **Directory:** `src/app/api/v1/workspaces/[id]/transactions/[transactionId]/`
  - [ ] `GET route.ts` — Get single transaction detail
  - [ ] `PATCH route.ts` — Update transaction
    - Pipeline: `withPipeline` + `schema: UpdateTransactionSchema` + `requireOnboarding`
    - Calls `updateTransaction(userId, transactionId, data)`
    - Returns `success({ transaction })`
  - [ ] `DELETE route.ts` — Delete transaction
    - Pipeline: `withPipeline` + `requireOnboarding`
    - Calls `deleteTransaction(userId, transactionId)`
    - Returns `success({ deleted: true })`
  - **Validate:** `npx tsc --noEmit`

- [ ] 7. API Route — Image Upload
  - **Directory:** `src/app/api/v1/upload/`
  - [ ] `POST route.ts` — Upload image to Imgur
    - Pipeline: `withPipeline` + `requireOnboarding`
    - Accepts multipart form data (image file)
    - Validates file type (jpg, png, gif, webp) and max size (5MB)
    - Uploads to Imgur API using server-side API key
    - Returns `success({ url })` with the public Imgur URL
  - **Note:** Imgur API key stored in environment variable, never exposed to client
  - **Validate:** `npx tsc --noEmit`

- [ ] 8. Transactions Page — Layout & State
  - [ ] "use client" page component at `src/app/(workspace)/transactions/page.tsx`
  - [ ] Fetch transactions from `/api/v1/workspaces/${workspaceId}/transactions` on mount
  - [ ] State: `transactions: TransactionView[]`, `isLoading`, `error`, `pagination`
  - [ ] Use `useWorkspace()` for activeWorkspaceId
  - [ ] Filter state: `type`, `dateRange`, `categoryId`, `accountId`
  - [ ] Summary card: total income, total expense, net balance for current month
  - **Validate:** `npx tsc --noEmit`

- [ ] 9. Transactions Page — Transaction List
  - [ ] Page header: "Transactions" title + "New Transaction" button
  - [ ] Filter bar: type dropdown, date range picker, category filter, account filter
  - [ ] Transaction list: grouped by date, each row shows type icon, description, category, amount (colored by type), account
  - [ ] Each transaction row: dropdown menu (⋮) with Edit, Delete actions
  - [ ] Empty state: "No transactions yet" + "Create Transaction" button
  - [ ] Loading state: skeleton placeholders
  - [ ] Pagination: load more / infinite scroll
  - **Validate:** `npx tsc --noEmit`

- [ ] 10. Create Transaction Dialog
  - [ ] File: `src/app/(workspace)/transactions/_components/create-transaction-dialog.tsx`
  - [ ] Step 1: Select type (Income, Expense, Transfer) — visual card selection
  - [ ] Step 2: Form fields based on type:
    - Amount (`CurrencyInput`)
    - Date (date picker)
    - Category → SubCategory (cascading select, filtered by type)
    - Source Account (Select, filtered by type: Expense/Transfer)
    - Destination Account (Select, filtered by type: Income/Transfer)
    - Description (optional text)
    - Payee/Payer (optional text)
    - Tags (optional, tag input)
    - Attachment (file picker → upload to Imgur)
  - [ ] Validation: required fields per type, amount positive, accounts not archived
  - [ ] Submit: POST to `/api/v1/workspaces/${workspaceId}/transactions`
  - [ ] Success: refetch transactions + close dialog
  - [ ] Error: inline error message
  - [ ] Loading state on submit button
  - **Validate:** `npx tsc --noEmit`

- [ ] 11. Edit Transaction Dialog
  - [ ] File: `src/app/(workspace)/transactions/_components/edit-transaction-dialog.tsx`
  - [ ] Pre-fill form with current transaction data
  - [ ] Same form as create but type is not editable
  - [ ] Submit: PATCH to `/api/v1/workspaces/${workspaceId}/transactions/${transactionId}`
  - [ ] Success: refetch transactions + close dialog (explicit try/catch — side effect of closing)
  - **Validate:** `npx tsc --noEmit`

- [ ] 12. Delete Transaction Confirmation
  - [ ] Reuse existing `ConfirmDialog` component
  - [ ] Warning: "This will reverse the balance change on affected accounts"
  - [ ] Confirm: DELETE to `/api/v1/workspaces/${workspaceId}/transactions/${transactionId}`
  - [ ] Success: refetch transactions
  - **Validate:** `npx tsc --noEmit`

- [ ] 13. Sidebar Navigation
  - [ ] "Transactions" nav item already exists with correct href `/transactions`
  - [ ] Verify isActive logic matches `/transactions` route
  - **Validate:** Already correct — no changes needed

- [ ] 14. Final Validation (§7 + §10)
  - [ ] Run `npx tsc --noEmit` — no type errors
  - [ ] Run `npm run lint` — no lint errors
  - [ ] Run `npm run build` — builds successfully
  - [ ] Manual: Create income → appears in list, destination account balance updated
  - [ ] Manual: Create expense → appears in list, source account balance updated
  - [ ] Manual: Create transfer → appears in list, both account balances updated
  - [ ] Manual: Edit transaction → balances recalculated correctly
  - [ ] Manual: Delete transaction → balances reversed correctly
  - [ ] Manual: Archived accounts excluded from dropdowns
  - [ ] Manual: Archived subcategories excluded from category picker
  - [ ] Manual: Image upload → attachment URL stored and displayed
  - [ ] Manual: Filter by type, date, category, account
  - [ ] Report: list all validated items and note any limitations

---

## Files to Create

| File | Purpose |
|---|---|
| `src/features/transactions/types.ts` | Domain types (TransactionView, TransactionFormData) |
| `src/features/transactions/schemas.ts` | Zod validation schemas |
| `src/features/transactions/errors.ts` | Domain errors + error mapping |
| `src/features/transactions/services.ts` | Business logic (CRUD + atomic balance updates) |
| `src/app/api/v1/workspaces/[id]/transactions/route.ts` | GET (list) + POST (create) |
| `src/app/api/v1/workspaces/[id]/transactions/[transactionId]/route.ts` | GET (detail) + PATCH (update) + DELETE |
| `src/app/api/v1/upload/route.ts` | POST (Imgur upload) |
| `src/app/(workspace)/transactions/page.tsx` | Transactions list page |
| `src/app/(workspace)/transactions/_components/create-transaction-dialog.tsx` | Create transaction dialog |
| `src/app/(workspace)/transactions/_components/edit-transaction-dialog.tsx` | Edit transaction dialog |
| `src/app/(workspace)/transactions/_components/transaction-filters.tsx` | Reusable filter bar component |
| `src/app/(workspace)/transactions/_components/transaction-row.tsx` | Reusable transaction row component |

## Files to Modify

| File | Change |
|---|---|
| `src/components/shared/workspace/sidebar.tsx` | Verify Transactions nav item (no change expected) |
