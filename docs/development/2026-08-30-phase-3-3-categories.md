# Implementation Plan: Phase 3.3 — Two-Level Categories

**Date:** 2026-08-30
**Status:** 🔄 In Progress

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

| Rule | How It's Addressed |
|---|---|
| §1 Operating Standard | Each task starts from a concrete anchor (schema, existing file), has validation step, follows ownership boundary |
| §2 Conventions | `@/*` alias for imports, English naming, no narrated comments |
| §3 Architecture | Features under `src/features/categories/`, routes as transport adapters, shared pipeline (`withPipeline`) + envelope (`success`/`failure`), Prisma singleton via `@/lib/db`, functional modules |
| §4 Data & Security | Prisma schema is source of truth (no migration needed), Zod v4 schemas in feature module, `withPipeline` handles `validateBody()` + `sanitizeObject()` automatically, workspace membership enforced in services |
| §5 Error Design | Typed `CategoryServiceError` with error codes, envelope mapping via `categoryErrorFailure()`, unexpected errors fall through to `INTERNAL_SERVER_ERROR` |
| §6 Frontend | Uses existing UI primitives (`Card`, `Button`, `Input`, `Dialog`, `DropdownMenu`), `apiFetch()` for browser calls, loading/empty/success/failure states, responsive layouts, `withToast()` for simple actions |
| §7 Validation Gates | Each task validates, final step runs `tsc --noEmit` + `lint` + `build` + manual flow checks |
| §10 Definition of Done | Final validation checklist covers: ownership check, architecture scope, input/auth/tenant isolation, honest states, validation gates, outcome reporting with limitations noted |

### §4 Note — Sanitization

All route handlers use `withPipeline` which calls `sanitizeObject()` on the validated body automatically. No separate sanitization step is needed.

### §6 Note — Toast Pattern

For create, edit, archive, and unarchive actions where the only user feedback is a success/error toast (no additional side effects like closing a dialog or resetting state), use `withToast()` from `@/lib/toast`. For actions that also manage loading state or have side effects beyond the toast (e.g., closing a dialog after success), use explicit `try/catch` with manual `toast.success()`/`toast.error()`.

### §10 Note — Validation Reporting

Each task's validation step should state what was validated and what could not be validated.

---

## Sub Tasks

- [ ] 1. Feature Types (`src/features/categories/types.ts`)
  - [ ] Define `CategoryView` interface: `{ id, name, type, isArchived, subCategories: SubCategoryView[], createdAt }`
  - [ ] Define `SubCategoryView` interface: `{ id, name, isArchived, createdAt }`
  - [ ] Define `CategoryFormData` type: `{ name: string, type: TransactionType }`
  - [ ] Define `SubCategoryFormData` type: `{ name: string }`
  - [ ] Define `CategoryListResponse` type: `{ categories: CategoryView[] }`
  - **Validate:** `npx tsc --noEmit`

- [ ] 2. Feature Schemas (`src/features/categories/schemas.ts`)
  - [ ] `CategoryNameSchema` — z.string().min(1).max(100)
  - [ ] `SubCategoryNameSchema` — z.string().min(1).max(100)
  - [ ] `TransactionTypeEnum` — z.enum derived from Prisma-generated `TransactionType` (single source of truth)
  - [ ] `CreateCategorySchema` — z.object({ name, type })
  - [ ] `UpdateCategorySchema` — z.object({ name }) (type not editable)
  - [ ] `CreateSubCategorySchema` — z.object({ name })
  - [ ] `UpdateSubCategorySchema` — z.object({ name })
  - [ ] Type inference exports for all schemas
  - **Validate:** `npx tsc --noEmit`

- [ ] 3. Feature Errors (`src/features/categories/errors.ts`)
  - [ ] `CategoryServiceErrorCode` union: `FORBIDDEN`, `CATEGORY_NOT_FOUND`, `SUBCATEGORY_NOT_FOUND`, `NAME_TAKEN`
  - [ ] `CategoryServiceError` class extending Error with `code` field
  - [ ] `categoryErrorFailure()` helper for mapping to envelope responses
  - [ ] `handleCategoryErrors()` route handler wrapper (same pattern as `handleAccountErrors`)
  - **Validate:** `npx tsc --noEmit`

- [ ] 4. Feature Service (`src/features/categories/services.ts`)
  - [ ] `getCategories(userId, workspaceId)` — verify membership, return all categories with nested subcategories, ordered by type then name
  - [ ] `createCategory(userId, workspaceId, data)` — verify membership, check unique name within workspace+type, create category
  - [ ] `updateCategory(userId, categoryId, data)` — verify membership via category's workspace, check unique name if changed, update name only
  - [ ] `archiveCategory(userId, categoryId)` — verify membership, set isArchived = true (subcategories blocked by parent)
  - [ ] `unarchiveCategory(userId, categoryId)` — verify membership, set isArchived = false
  - [ ] `createSubCategory(userId, categoryId, data)` — verify membership, check unique name within category, create subcategory
  - [ ] `updateSubCategory(userId, subCategoryId, data)` — verify membership, check unique name if changed, update name only
  - [ ] `archiveSubCategory(userId, subCategoryId)` — verify membership, set isArchived = true
  - [ ] `unarchiveSubCategory(userId, subCategoryId)` — verify membership, set isArchived = false
  - [ ] `requireMembership()` helper — same pattern as accounts (reuse or shared helper)
  - **Validate:** `npx tsc --noEmit`

- [ ] 5. API Routes — Categories CRUD
  - **Directory:** `src/app/api/v1/workspaces/[id]/categories/`
  - [ ] `GET route.ts` — List categories with subcategories for workspace
    - Pipeline: `withPipeline` + `requireOnboarding`
    - Calls `getCategories(userId, workspaceId)`
    - Returns `success({ categories })`
  - [ ] `POST route.ts` — Create category
    - Pipeline: `withPipeline` + `schema: CreateCategorySchema` + `requireOnboarding`
    - Calls `createCategory(userId, workspaceId, data)`
    - Returns `success({ category })`
  - **Validate:** `npx tsc --noEmit`

- [ ] 6. API Routes — Category Actions
  - **Directory:** `src/app/api/v1/workspaces/[id]/categories/[categoryId]/`
  - [ ] `PATCH route.ts` — Update category name
    - Pipeline: `withPipeline` + `schema: UpdateCategorySchema` + `requireOnboarding`
    - Calls `updateCategory(userId, categoryId, data)`
    - Returns `success({ category })`
  - **Directory:** `src/app/api/v1/workspaces/[id]/categories/[categoryId]/archive/`
  - [ ] `PATCH route.ts` — Archive category
    - Pipeline: `withPipeline` + `requireOnboarding`
    - Calls `archiveCategory(userId, categoryId)`
    - Returns `success({ archived: true })`
  - **Directory:** `src/app/api/v1/workspaces/[id]/categories/[categoryId]/unarchive/`
  - [ ] `PATCH route.ts` — Unarchive category
    - Pipeline: `withPipeline` + `requireOnboarding`
    - Calls `unarchiveCategory(userId, categoryId)`
    - Returns `success({ unarchived: true })`
  - **Validate:** `npx tsc --noEmit`

- [ ] 7. API Routes — SubCategories CRUD
  - **Directory:** `src/app/api/v1/workspaces/[id]/categories/[categoryId]/subcategories/`
  - [ ] `POST route.ts` — Create subcategory
    - Pipeline: `withPipeline` + `schema: CreateSubCategorySchema` + `requireOnboarding`
    - Calls `createSubCategory(userId, categoryId, data)`
    - Returns `success({ subCategory })`
  - **Directory:** `src/app/api/v1/workspaces/[id]/categories/[categoryId]/subcategories/[subCategoryId]/`
  - [ ] `PATCH route.ts` — Update subcategory name
    - Pipeline: `withPipeline` + `schema: UpdateSubCategorySchema` + `requireOnboarding`
    - Calls `updateSubCategory(userId, subCategoryId, data)`
    - Returns `success({ subCategory })`
  - **Directory:** `src/app/api/v1/workspaces/[id]/categories/[categoryId]/subcategories/[subCategoryId]/archive/`
  - [ ] `PATCH route.ts` — Archive subcategory
  - **Directory:** `src/app/api/v1/workspaces/[id]/categories/[categoryId]/subcategories/[subCategoryId]/unarchive/`
  - [ ] `PATCH route.ts` — Unarchive subcategory
  - **Validate:** `npx tsc --noEmit`

- [ ] 8. Categories Page — Layout & State
  - [ ] "use client" page component at `src/app/(workspace)/categories/page.tsx`
  - [ ] Fetch categories from `/api/v1/workspaces/${workspaceId}/categories` on mount
  - [ ] State: `categories: CategoryView[]`, `isLoading`, `error`
  - [ ] Use `useWorkspace()` for activeWorkspaceId
  - [ ] Group categories by type: INCOME, EXPENSE, TRANSFER
  - [ ] Filter: show active only by default, toggle to include archived
  - **Validate:** `npx tsc --noEmit`

- [ ] 9. Categories Page — Category List
  - [ ] Page header: "Categories" title + "New Category" button
  - [ ] Three sections by type: Income, Expenses, Transfers (each with icon/color)
  - [ ] Each category card: name, subcategory count, dropdown menu (⋮)
  - [ ] Dropdown actions: Edit, Archive/Unarchive
  - [ ] Click to expand/collapse subcategories list
  - [ ] Each subcategory row: name, dropdown menu (⋮)
  - [ ] Subcategory dropdown: Edit, Archive/Unarchive
  - [ ] "Add Subcategory" button inside each category
  - [ ] Empty state: "No categories yet" (should not happen since templates seed them)
  - [ ] Loading state: skeleton placeholders
  - **Validate:** `npx tsc --noEmit`

- [ ] 10. Create Category Dialog
  - [ ] File: `src/app/(workspace)/categories/_components/create-category-dialog.tsx`
  - [ ] Dialog with form: Name (Input), Type (Select: Income, Expense, Transfer)
  - [ ] Validation: name required (1-100 chars), type required
  - [ ] Submit: POST to `/api/v1/workspaces/${workspaceId}/categories`
  - [ ] Success: refetch categories list + close dialog
  - [ ] Error: inline error message
  - [ ] Loading state on submit button
  - **Validate:** `npx tsc --noEmit`

- [ ] 11. Edit Category/SubCategory Dialog
  - [ ] File: `src/app/(workspace)/categories/_components/edit-category-dialog.tsx`
  - [ ] Reused for both category and subcategory (props: `type: "category" | "subcategory"`, `name`, `onSave`)
  - [ ] Dialog with form: Name (Input only)
  - [ ] Pre-fill with current name
  - [ ] Submit: PATCH to appropriate endpoint
  - [ ] Success: refetch categories list + close dialog (explicit try/catch — side effect of closing)
  - **Validate:** `npx tsc --noEmit`

- [ ] 12. Create SubCategory Inline
  - [ ] "Add Subcategory" button inside each category card
  - [ ] Click reveals an inline input field (not a dialog) with save/cancel
  - [ ] Submit: POST to `/api/v1/workspaces/${workspaceId}/categories/${categoryId}/subcategories`
  - [ ] Success: refetch categories list
  - [ ] Error: inline error message
  - **Validate:** `npx tsc --noEmit`

- [ ] 13. Sidebar Navigation
  - [ ] File: `src/components/shared/workspace/sidebar.tsx`
  - [ ] Add "Categories" nav item with `href: '/categories'` and appropriate icon
  - [ ] Add isActive logic: `(p) => p === '/categories'`
  - **Validate:** `npx tsc --noEmit`

- [ ] 14. Final Validation (§7 + §10)
  - [ ] Run `npx tsc --noEmit` — no type errors
  - [ ] Run `npm run lint` — no lint errors
  - [ ] Run `npm run build` — builds successfully
  - [ ] Manual: Categories list loads with template-seeded data
  - [ ] Manual: Create category → appears in correct type section
  - [ ] Manual: Edit category name → updates in list
  - [ ] Manual: Archive category → moves to archived (subcategories blocked)
  - [ ] Manual: Unarchive category → restores access
  - [ ] Manual: Create subcategory → appears under parent category
  - [ ] Manual: Edit subcategory name → updates in list
  - [ ] Manual: Archive subcategory → hidden from active list
  - [ ] Manual: Unarchive subcategory → reappears
  - [ ] Report: list all validated items and note any limitations

---

## Files to Create

| File | Purpose |
|---|---|
| `src/features/categories/types.ts` | Domain types (CategoryView, SubCategoryView, FormData) |
| `src/features/categories/schemas.ts` | Zod validation schemas |
| `src/features/categories/errors.ts` | Domain errors + error mapping |
| `src/features/categories/services.ts` | Business logic (CRUD + archive for categories & subcategories) |
| `src/app/api/v1/workspaces/[id]/categories/route.ts` | GET (list) + POST (create) |
| `src/app/api/v1/workspaces/[id]/categories/[categoryId]/route.ts` | PATCH (update) |
| `src/app/api/v1/workspaces/[id]/categories/[categoryId]/archive/route.ts` | PATCH (archive) |
| `src/app/api/v1/workspaces/[id]/categories/[categoryId]/unarchive/route.ts` | PATCH (unarchive) |
| `src/app/api/v1/workspaces/[id]/categories/[categoryId]/subcategories/route.ts` | POST (create subcategory) |
| `src/app/api/v1/workspaces/[id]/categories/[categoryId]/subcategories/[subCategoryId]/route.ts` | PATCH (update subcategory) |
| `src/app/api/v1/workspaces/[id]/categories/[categoryId]/subcategories/[subCategoryId]/archive/route.ts` | PATCH (archive subcategory) |
| `src/app/api/v1/workspaces/[id]/categories/[categoryId]/subcategories/[subCategoryId]/unarchive/route.ts` | PATCH (unarchive subcategory) |
| `src/app/(workspace)/categories/page.tsx` | Categories list page |
| `src/app/(workspace)/categories/_components/create-category-dialog.tsx` | Create category dialog |
| `src/app/(workspace)/categories/_components/edit-category-dialog.tsx` | Edit category/subcategory dialog |

## Files to Modify

| File | Change |
|---|---|
| `src/components/shared/workspace/sidebar.tsx` | Add "Categories" nav item |
