# Fintracko Code Review — Bug & Issue Report

- **Date:** 2026-10-03
- **Branch:** `develop` (HEAD `2196e80 feat: compact list accounts on mobile view`)
- **Scope reviewed:** API pipeline and route handlers (`src/app/api/v1/**`), feature
  services (`src/features/**`), client fetch layer (`src/lib/api/client.ts`,
  `src/lib/hooks/use-workspace-collection.ts`), and the account/transaction/budget
  UI surfaces.
- **Method:** static reading of the source; narrow executable gates run. This is
  not a runtime end-to-end pass — the findings below are code-path analysis, and
  each is stated with the evidence used.

## Validation run during this review

| Check            | Command                                    | Result                    |
| ---------------- | ------------------------------------------ | ------------------------- |
| TypeScript       | `npx tsc --noEmit`                         | **Pass** (exit 0)         |
| Lint             | `npm run lint`                             | **Pass** (exit 0)         |
| Forward evidence | `node -e "JSON.stringify(new FormData())"` | `{}` (supports Finding 1) |

The repository has no automated test suite, so no unit/integration tests were run.
Items below were not reproduced against a live database or browser session; that
is a limitation of this review, not a claim that they are merely theoretical.

---

## Findings (ordered by severity)

### 1. HIGH — Image upload is non-functional: `apiFetch` serializes `FormData` as JSON

- **File:** [src/lib/api/client.ts:114-124](src/lib/api/client.ts#L114-L124),
  [src/components/ui/image-upload.tsx:37-46](src/components/ui/image-upload.tsx#L37-L46)
- **What happens:** `apiFetch` unconditionally sets `Content-Type: application/json`
  and calls `JSON.stringify(body)` whenever a body is present. `ImageUpload`
  passes a `FormData` as that body. `JSON.stringify(new FormData())` is `"{}"`
  (verified), so the request is sent as a JSON `{}` — not `multipart/form-data`.
  The upload route then calls `request.formData()`
  ([src/app/api/v1/upload/route.ts](src/app/api/v1/upload/route.ts#L57)), which
  cannot parse a JSON body; it falls into the `catch` and returns
  `500 "Failed to upload image."`. Every attachment upload in the create/edit
  transaction dialogs fails.
- **Impact:** The entire "Attachment (optional)" feature is dead, even though the
  route, Imgur integration, size/signature validation, and UI all exist and look
  implemented. This is a "control that pretends to work" failure (AGENTS.md §5).
- **Suggested fix:** Detect `body instanceof FormData` in `apiFetch`; when so, do
  **not** set `Content-Type` (the browser must set the multipart boundary) and do
  **not** `JSON.stringify` — pass the `FormData` through untouched.

---

### 2. HIGH — Transaction list and summary are silently truncated at 50 rows ✅

- **Files:** [src/features/transactions/services.ts:99](src/features/transactions/services.ts#L99),
  [src/components/shared/transactions/transaction-list-view.tsx](src/components/shared/transactions/transaction-list-view.tsx),
  [src/app/api/v1/workspaces/[id]/transactions/route.ts](src/app/api/v1/workspaces/[id]/transactions/route.ts)
- **What happens:** The transactions endpoint defaults to `limit = 50` and returns
  one page plus a `total` count. The views (`TransactionListView`, and the account
  detail view that reuses it) request the endpoint with no `limit`/`page`, then
  filter by month/week/day, search, sort, and compute the Summary **entirely
  client-side** over that single page. `total` is returned but never consumed, and
  there is no pagination or "load more" control anywhere.
- **Impact:** Any workspace with more than 50 transactions in the fetched window
  shows an incomplete ledger and an **incorrect Summary** (income/expense/net), and
  client-side search/filters operate on a partial dataset. The month view is the
  default, so this hits normal users quickly. This violates the "loading, empty,
  success, failure states must behave honestly" rule.
- **Suggested fix:** Either move the date range (and type) into the request and
  page through all results, or add explicit pagination with visible total/remaining
  state. At minimum, do not compute period totals from a page whose `total` exceeds
  the returned count.

---

### 3. MEDIUM — Subcategory creation ignores the nested workspace path identifier

- **File:** [src/app/api/v1/workspaces/[id]/categories/[categoryId]/subcategories/route.ts:12-25](src/app/api/v1/workspaces/[id]/categories/[categoryId]/subcategories/route.ts#L12-L25),
  [src/features/categories/services.ts](src/features/categories/services.ts)
- **What happens:** The handler's params type is only `{ categoryId }`; the `[id]`
  segment is never read. `createSubCategory(userId, categoryId, data)` derives the
  workspace from the category row instead. A member of workspace A can POST to
  `/workspaces/<B>/categories/<A-categoryId>/subcategories` and the write succeeds
  against A while the URL says B.
- **Impact:** Not a cross-tenant data leak (membership in the category's workspace
  is still enforced), but AGENTS.md §4 requires **every** parent path identifier to
  be consumed by the authorization and database predicate for nested workspace
  routes. The PATCH/archive siblings for this same resource do thread `workspaceId`
  through and check `categoryId`; this route is the inconsistent one. It is a
  correctness/consistency hole and a latent security trap if the nested route is
  ever refactored.
- **Suggested fix:** Accept `workspaceId` in `createSubCategory`, load the category
  scoped by `{ id: categoryId, workspaceId }`, and reject a mismatch. Also consider
  rejecting creation under an archived category for parity with transaction
  validation.

---

### 4. MEDIUM — Transaction writes can persist an account on the non-applicable side

- **Files:** [src/features/transactions/schemas.ts:40,78](src/features/transactions/schemas.ts#L40),
  [src/features/transactions/services.ts](src/features/transactions/services.ts) (`createTransaction`, `updateTransaction`)
- **What happens:** Account fields are plain `z.string().optional()`. Two problems:
  1. **Empty-string IDs bypass validation.** `z.string()` accepts `""`; the service
     guards with falsy checks (`if (data.sourceAccountId)`), so `""` skips the
     "account exists / not archived / right workspace" checks, then
     `sourceAccountId: data.sourceAccountId ?? null` writes `""` into a `@db.Uuid`
     FK column — a Prisma/DB error surfaces as a generic 500 instead of a 400.
  2. **The wrong side can be set.** `UpdateTransactionSchema` permits
     `sourceAccountId` on an `INCOME` (and `destinationAccountId` on an `EXPENSE`).
     `balanceEffect` ignores that side (delta 0), but the row stores it anyway, so
     the ledger records an account that had no balance effect — inconsistent data
     that the UI will later display via `getAccountLabel`.
- **Impact:** Data-integrity drift and unhandled 500s from crafted payloads. The UI
  normally strips these, but the API is the trust boundary.
- **Suggested fix:** Use `z.uuid().optional()` for account IDs; in the service,
  validate that the account set matches the transaction type for both create and
  update (reject or null out the irrelevant side).

---

### 5. MEDIUM — Budget overlap guard is not concurrency-safe

- **File:** [src/features/budgets/services.ts:354,460,495](src/features/budgets/services.ts#L354)
- **What happens:** `createBudget`/`updateBudget` run `tx.budget.count(...)` to reject
  overlaps and then insert/update, inside a `$transaction`. The schema has **no
  unique constraint** preventing overlapping ranges (`Budget` only indexes
  `workspaceId/subCategoryId`), and the default isolation level is Read Committed.
  Two concurrent requests can both observe zero overlap and both commit.
- **Impact:** Duplicate/overlapping budgets for one subcategory, which breaks the
  "at most one budget matches a date" assumption used by
  `useBudgetForDate` (it takes the first match) and the overlap rejection contract.
- **Suggested fix:** Serialize on the parent (`SELECT ... FOR UPDATE` on the
  subcategory / advisory lock) or use `Serializable` isolation plus retry; a DB-level
  exclusion constraint (`tstzrange`/`daterange` with `EXCLUDE`) is the robust fix.

---

### 6. LOW/MEDIUM — "Today" is derived inconsistently across the codebase

- **Files:** [src/features/budgets/services.ts:258](src/features/budgets/services.ts#L258) uses UTC (`isoDate`),
  [src/features/budgets/utilization.ts](src/features/budgets/utilization.ts) `budgetStatus` default uses **local** (`toISODate`),
  [src/lib/date-period.ts](src/lib/date-period.ts) `toISODate` is local.
- **What happens:** `isoDate(new Date())` formats via `toISOString()` (UTC), while
  `budgetStatus(...)` defaults to local formatting through `toISODate`. The budget
  window defaults and the budget status are therefore computed against potentially
  different calendar days for a user whose timezone offset differs from the server's.
- **Impact:** Around midnight, a budget can be reported against one day while its
  status is judged against another (off-by-one in "spent this period" / ACTIVE vs
  UPCOMING/ENDED). Low blast radius but a real correctness inconsistency.
- **Suggested fix:** Pick one convention for "the user's today" and use it in both
  places; if the server is UTC, format dates with UTC getters everywhere consistent
  with the `@db.Date` columns.

---

### 7. LOW — Balance trend can be contaminated by future-dated transactions

- **File:** [src/features/analytics/services.ts:247](src/features/analytics/services.ts#L247) (`getBalanceTrend`)
- **What happens:** `currentTotal` is the live
  `initialBalance + netTransactionSum` (which includes **all** transactions,
  including future-dated ones), while the reconstruction subtracts only effects
  dated after each `monthEnd` and only within `[windowFrom, windowTo = today]`.
  A transaction dated after today is therefore baked into every historical point
  and into the current-month point, and is never subtracted.
- **Impact:** Historical month-end balances are overstated when future-dated
  transactions exist (the app allows arbitrary future dates).
- **Suggested fix:** Compute the cut-off against the live total, or exclude
  future-dated rows from `currentTotal`'s basis, or clamp `netTransactionSum` to
  effects with `date <= today`.

---

### 8. LOW — Signed amount rendering ignores negative amounts

- **File:** [src/components/shared/transactions/transaction-presentation.ts:40](src/components/shared/transactions/transaction-presentation.ts#L40)
- **What happens:** `formatSignedAmount` prints a fixed sign by type and
  `Math.abs(amount)`. The amount schema explicitly allows negatives (refunds /
  investment tracking), and `sumTransactions` adds the signed value. So a negative
  expense renders as `-1,234.50` while the Summary treats it as a reduction.
- **Impact:** Display/math disagreement for refund-style entries; low severity.
- **Suggested fix:** Derive the sign from the parsed amount (or render the raw
  signed value) rather than hard-coding it per type.

---

### 9. LOW — Invitation re-invite is delete-then-create without a transaction

- **File:** [src/features/workspaces/services/members.ts](src/features/workspaces/services/members.ts) (`inviteCollaborator`)
- **What happens:** A stale invitation is deleted, then a new one is created in a
  separate statement. Two concurrent re-invites can both pass the existence checks
  and race on the `@@unique([workspaceId, inviteeId])` constraint, yielding a 500.
- **Impact:** Rare, but user-visible as a generic failure. Wrap the delete+create in
  a `$transaction` (and/or upsert) to make it atomic.

---

### 10. LOW — Account/budget money enters the API as JS floats

- **Files:** [src/features/accounts/schemas.ts](src/features/accounts/schemas.ts) (`initialBalance: z.number()`),
  [src/features/budgets/schemas.ts](src/features/budgets/schemas.ts) (`amount: z.number().positive()`),
  [src/features/budgets/services.ts](src/features/budgets/services.ts) (`row.amount.mul(resolved.count)`)
- **What happens:** Transaction amounts are validated as decimal **strings** and
  handled with `Prisma.Decimal` (good), but accounts and budgets accept `z.number()`
  and the UI sends `Number(amount)` from `CurrencyInput`. Binary floats are then
  widened into `Decimal(18,4)`.
- **Impact:** Precision drift on values that are not exactly representable as
  doubles (e.g. `0.1`, `19.99`), inconsistent with the transactions convention and
  the "exact decimal arithmetic" rule.
- **Suggested fix:** Accept decimal strings here too (as transactions do) and let
  Prisma.Zod/Decimal carry the exact value.

---

### 11. LOW — Inconsistent not-found contract for a single transaction

- **File:** [src/app/api/v1/workspaces/[id]/transactions/[transactionId]/route.ts](src/app/api/v1/workspaces/[id]/transactions/[transactionId]/route.ts)
- **What happens:** `GET` returns `200 success: true, data: { transaction: null }`
  when the id is unknown, whereas the single-budget and single-account GETs return
  `404 NOT_FOUND`. The account detail view depends on `NOT_FOUND` to show its
  honest empty state; the transaction contract diverges.
- **Impact:** Clients must special-case null-vs-404; easy to render a blank success
  screen instead of a not-found state. Suggest returning `NOT_FOUND` consistently.

---

## What looked solid

- The shared API pipeline (`withSession` → onboarding guard → `validateBody` →
  `sanitizeObject`) is consistently applied, and the response envelope is
  centralized rather than duplicated.
- Workspace membership is enforced on every scoped service read/write via
  `findWorkspaceMembership`, and parent/child identifiers are generally threaded
  through (the subcategory POST is the exception, Finding 3).
- Financial mutations (`create/update/deleteTransaction`) reverse and re-apply
  account balance effects inside `$transaction`, and reject archived
  accounts/categories.
- The transaction amount schema correctly constrains precision and rejects zero.
- Error mapping uses typed domain errors and stable envelope codes rather than
  string matching.

## Recommended order of work

1. **Finding 1** (upload) — small change, restores a whole dead feature.
2. **Finding 2** (pagination) — data-correctness for the primary screen.
3. **Findings 3–4** (nested-path + account-side validation) — security/data integrity.
4. **Findings 5–7** (concurrency, timezone, trend) — correctness hardening.
5. **Findings 8–11** — polish and contract consistency.
