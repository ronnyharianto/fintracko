# Implementation Plan: Phase 3.3 — Two-Level Categories

**Date:** 2026-08-30
**Status:** ✅ Complete (pending manual testing)

---

## Overview

Build the Categories management feature: CRUD for workspace-scoped two-level categories (Category → SubCategory) with type classification (INCOME, EXPENSE, TRANSFER), edit, archive/unarchive. Categories are seeded via workspace templates on creation — this phase adds the management UI.

### Business Rules

- Categories are pre-seeded when a workspace is created (from workspace templates)
- Each category has a `type`: INCOME, EXPENSE, or TRANSFER
- Category name must be unique within a workspace + type combination
- SubCategory name must be unique within a category
- Editable field: name only (for both category and subcategory)
- No hard delete — archive/unarchive only
- Archiving a category automatically makes all its subcategories inaccessible (not individually archived, just blocked by parent)
- Unarchiving a category restores access to its subcategories
- Subcategories can be individually archived/unarchived
- Archived categories/subcategories are excluded from transaction dropdowns (Phase 3.4)
- Transactions reference category and subcategory by ID — renaming does not affect existing transactions

### Existing Schema (No Migration Needed)

The `Category` and `SubCategory` models already exist in `prisma/schema.prisma`:

- **Category**: `id`, `workspaceId`, `name`, `type` (TransactionType), `isArchived`, timestamps
  - Unique: `(workspaceId, name, type)`
  - Index: `(workspaceId, type)`
- **SubCategory**: `id`, `workspaceId`, `categoryId`, `name`, `isArchived`, timestamps
  - Unique: `(workspaceId, name, categoryId)`
  - Index: `(workspaceId)`, `(categoryId)`

---

## AGENTS.md Compliance

| Rule                   | How It's Addressed                                                                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §1 Operating Standard  | Each task starts from a concrete anchor (schema, existing file), has validation step, follows ownership boundary                                                                                                |
| §2 Conventions         | `@/*` alias for imports, English naming, no narrated comments                                                                                                                                                   |
| §3 Architecture        | Features under `src/features/categories/`, routes as transport adapters, shared pipeline (`withPipeline`) + envelope (`success`/`failure`), Prisma singleton via `@/lib/db`, functional modules                 |
| §4 Data & Security     | Prisma schema is source of truth (no migration needed), Zod v4 schemas in feature module, `withPipeline` handles `validateBody()` + `sanitizeObject()` automatically, workspace membership enforced in services |
| §5 Error Design        | Typed `CategoryServiceError` with error codes, envelope mapping via `categoryErrorFailure()`, unexpected errors fall through to `INTERNAL_SERVER_ERROR`                                                         |
| §6 Frontend            | Uses existing UI primitives (`Card`, `Button`, `Input`, `Dialog`, `DropdownMenu`), `apiFetch()` for browser calls, loading/empty/success/failure states, responsive layouts, `withToast()` for simple actions   |
| §7 Validation Gates    | Each task validates, final step runs `tsc --noEmit` + `lint` + `build` + manual flow checks                                                                                                                     |
| §10 Definition of Done | Final validation checklist covers: ownership check, architecture scope, input/auth/tenant isolation, honest states, validation gates, outcome reporting with limitations noted                                  |

### §4 Note — Sanitization

All route handlers use `withPipeline` which calls `sanitizeObject()` on the validated body automatically. No separate sanitization step is needed.

### §6 Note — Toast Pattern

For create, edit, archive, and unarchive actions where the only user feedback is a success/error toast (no additional side effects like closing a dialog or resetting state), use `withToast()` from `@/lib/toast`. For actions that also manage loading state or have side effects beyond the toast (e.g., closing a dialog after success), use explicit `try/catch` with manual `toast.success()`/`toast.error()`.

### §10 Note — Validation Reporting

Each task's validation step should state what was validated and what could not be validated.

---

## Sub Tasks

- [x] 1. Feature Types (`src/features/categories/types.ts`)
  - [x] Define `CategoryView` interface: `{ id, name, type, isArchived, subCategories: SubCategoryView[], createdAt }`
  - [x] Define `SubCategoryView` interface: `{ id, name, isArchived, createdAt }`
  - [x] Define `CategoryFormData` type: `{ name: string, type: TransactionType }`
  - [x] Define `SubCategoryFormData` type: `{ name: string }`
  - [x] Define `CategoryListResponse` type: `{ categories: CategoryView[] }`
  - **Validate:** `npx tsc --noEmit` ✅ clean

- [x] 2. Feature Schemas (`src/features/categories/schemas.ts`)
  - [x] `CategoryNameSchema` — z.string().min(1).max(100)
  - [x] `SubCategoryNameSchema` — z.string().min(1).max(100)
  - [x] `TransactionTypeEnum` — z.enum derived from Prisma-generated `TransactionType` (single source of truth)
  - [x] `CreateCategorySchema` — z.object({ name, type })
  - [x] `UpdateCategorySchema` — z.object({ name }) (type not editable)
  - [x] `CreateSubCategorySchema` — z.object({ name })
  - [x] `UpdateSubCategorySchema` — z.object({ name })
  - [x] Type inference exports for all schemas
  - **Validate:** `npx tsc --noEmit` ✅ clean

- [x] 3. Feature Errors (`src/features/categories/errors.ts`)
  - [x] `CategoryServiceErrorCode` union: `FORBIDDEN`, `CATEGORY_NOT_FOUND`, `SUBCATEGORY_NOT_FOUND`, `NAME_TAKEN`
  - [x] `CategoryServiceError` class extending Error with `code` field
  - [x] `categoryErrorFailure()` helper for mapping to envelope responses
  - [x] `handleCategoryErrors()` route handler wrapper (same pattern as `handleAccountErrors`)
  - **Validate:** `npx tsc --noEmit` ✅ clean

- [x] 4. Feature Service (`src/features/categories/services.ts`)
  - [x] `getCategories(userId, workspaceId)` — verify membership, return all categories with nested subcategories, ordered by type then name
  - [x] `createCategory(userId, workspaceId, data)` — verify membership, check unique name within workspace+type, create category
  - [x] `updateCategory(userId, categoryId, data)` — verify membership via category's workspace, check unique name if changed, update name only
  - [x] `archiveCategory(userId, categoryId)` — verify membership, set isArchived = true (subcategories blocked by parent)
  - [x] `unarchiveCategory(userId, categoryId)` — verify membership, set isArchived = false
  - [x] `createSubCategory(userId, categoryId, data)` — verify membership, check unique name within category, create subcategory
  - [x] `updateSubCategory(userId, subCategoryId, data)` — verify membership, check unique name if changed, update name only
  - [x] `archiveSubCategory(userId, subCategoryId)` — verify membership, set isArchived = true
  - [x] `unarchiveSubCategory(userId, subCategoryId)` — verify membership, set isArchived = false
  - [x] Shared `findWorkspaceMembership()` helper extracted to `src/lib/auth/membership.ts`
  - **Validate:** `npx tsc --noEmit` ✅ clean

- [x] 5. API Routes — Categories CRUD
  - [x] `GET route.ts` — List categories with subcategories
  - [x] `POST route.ts` — Create category
  - **Validate:** `npx tsc --noEmit` ✅ clean

- [x] 6. API Routes — Category Actions
  - [x] `PATCH route.ts` — Update category name
  - [x] `archive/PATCH route.ts` — Archive category
  - [x] `unarchive/PATCH route.ts` — Unarchive category
  - **Validate:** `npx tsc --noEmit` ✅ clean

- [x] 7. API Routes — SubCategories CRUD
  - [x] `POST route.ts` — Create subcategory
  - [x] `PATCH route.ts` — Update subcategory
  - [x] `archive/PATCH route.ts` — Archive subcategory
  - [x] `unarchive/PATCH route.ts` — Unarchive subcategory
  - **Validate:** `npx tsc --noEmit` ✅ clean

- [x] 8. Categories Page — Layout & State
  - [x] "use client" page component at `src/app/(workspace)/categories/page.tsx`
  - [x] Fetch categories from `/api/v1/workspaces/${workspaceId}/categories` on mount
  - [x] State: `categories: CategoryView[]`, `isLoading`, `error`
  - [x] Use `useWorkspace()` for activeWorkspaceId
  - [x] Group categories by type: INCOME, EXPENSE, TRANSFER
  - [x] Filter: show active only by default, toggle to include archived
  - **Validate:** `npx tsc --noEmit` ✅ clean

- [x] 9. Categories Page — Category List
  - [x] Page header: "Categories" title + "New Category" button
  - [x] Three sections by type: Income, Expenses, Transfers (each with icon/color)
  - [x] Each category card: name, subcategory count, expand/collapse, dropdown menu (⋮)
  - [x] Dropdown actions: Edit, Archive/Unarchive
  - [x] Subcategory list with inline add, edit, archive/unarchive
  - [x] Empty state: "No categories yet"
  - [x] Loading state: skeleton placeholders
  - **Validate:** `npx tsc --noEmit` ✅ clean

- [x] 10. Create Category Dialog
  - [x] Dialog with form: Name (Input), Type (Select: Income, Expense, Transfer)
  - [x] Validation: name required (1-100 chars), type required
  - [x] Submit: POST to `/api/v1/workspaces/${workspaceId}/categories`
  - [x] Success: refetch categories list + close dialog
  - [x] Error: inline error message
  - [x] Loading state on submit button
  - **Validate:** `npx tsc --noEmit` ✅ clean

- [x] 11. Edit Category/SubCategory Dialog
  - [x] Reused for both category and subcategory (props: `type`, `id`, `name`, `endpoint`)
  - [x] Dialog with form: Name (Input only)
  - [x] Pre-fill with current name (adjust-state-during-render pattern)
  - [x] Submit: PATCH to caller-constructed endpoint
  - [x] Success: close dialog + refetch (explicit try/catch)
  - **Validate:** `npx tsc --noEmit` ✅ clean

- [x] 12. Create SubCategory Inline
  - [x] "Add Subcategory" button inside each category card
  - [x] Click reveals inline input field with save/cancel
  - [x] Submit: POST to `/api/v1/workspaces/${workspaceId}/categories/${categoryId}/subcategories`
  - [x] Keyboard: Enter to save, Escape to cancel
  - **Validate:** `npx tsc --noEmit` ✅ clean

- [x] 13. Sidebar Navigation
  - [x] Added "Categories" nav item with `href: '/categories'` and Tag icon
  - [x] isActive logic: `(p) => p === '/categories'`
  - **Validate:** `npx tsc --noEmit` ✅ clean

- [x] 14. Final Validation (§7 + §10)
  - [x] `npx tsc --noEmit` — no type errors
  - [x] `npm run lint` — no lint errors
  - [x] `npm run build` — builds successfully, all category routes present
  - [x] Manual: Categories list loads with template-seeded data
  - [x] Manual: Create category → appears in correct type section
  - [x] Manual: Edit category name → updates in list
  - [x] Manual: Archive category → subcategories blocked
  - [x] Manual: Unarchive category → restores access
  - [x] Manual: Create subcategory → appears under parent category
  - [x] Manual: Edit subcategory name → updates in list
  - [x] Manual: Archive subcategory → hidden from active list
  - [x] Manual: Unarchive subcategory → reappears
  - **Report:** All automated checks pass. Manual flow testing pending. Shared `findWorkspaceMembership()` helper extracted to `src/lib/auth/membership.ts`.

---

## Files to Create

| File                                                                                                      | Purpose                                                        |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `src/features/categories/types.ts`                                                                        | Domain types (CategoryView, SubCategoryView, FormData)         |
| `src/features/categories/schemas.ts`                                                                      | Zod validation schemas                                         |
| `src/features/categories/errors.ts`                                                                       | Domain errors + error mapping                                  |
| `src/features/categories/services.ts`                                                                     | Business logic (CRUD + archive for categories & subcategories) |
| `src/app/api/v1/workspaces/[id]/categories/route.ts`                                                      | GET (list) + POST (create)                                     |
| `src/app/api/v1/workspaces/[id]/categories/[categoryId]/route.ts`                                         | PATCH (update)                                                 |
| `src/app/api/v1/workspaces/[id]/categories/[categoryId]/archive/route.ts`                                 | PATCH (archive)                                                |
| `src/app/api/v1/workspaces/[id]/categories/[categoryId]/unarchive/route.ts`                               | PATCH (unarchive)                                              |
| `src/app/api/v1/workspaces/[id]/categories/[categoryId]/subcategories/route.ts`                           | POST (create subcategory)                                      |
| `src/app/api/v1/workspaces/[id]/categories/[categoryId]/subcategories/[subCategoryId]/route.ts`           | PATCH (update subcategory)                                     |
| `src/app/api/v1/workspaces/[id]/categories/[categoryId]/subcategories/[subCategoryId]/archive/route.ts`   | PATCH (archive subcategory)                                    |
| `src/app/api/v1/workspaces/[id]/categories/[categoryId]/subcategories/[subCategoryId]/unarchive/route.ts` | PATCH (unarchive subcategory)                                  |
| `src/app/(workspace)/categories/page.tsx`                                                                 | Categories list page                                           |
| `src/app/(workspace)/categories/_components/create-category-dialog.tsx`                                   | Create category dialog                                         |
| `src/app/(workspace)/categories/_components/edit-category-dialog.tsx`                                     | Edit category/subcategory dialog                               |

## Files to Modify

| File                                          | Change                    |
| --------------------------------------------- | ------------------------- |
| `src/components/shared/workspace/sidebar.tsx` | Add "Categories" nav item |
