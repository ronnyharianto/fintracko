# Implementation Plan: Task 3.3 — Dynamic Workspace Templates Creation

This plan outlines the architecture, data contracts, and implementation steps for **Task 3.3: Dynamic Workspace Templates Creation** in Fintracko MVP 1.

---

## 1. Objectives & Scope

- **Endpoint:** `POST /api/v1/workspaces`
- **Payload Schema:** Zod validation requiring `name` (string, 1-100 chars) and `templateName` (enum: `PERSONAL`, `FAMILY`, `SMALL_BUSINESS`).
- **Template Source:** Static codebase constants under `src/features/workspaces/constants/workspace-templates.ts` mapping each template name to its default Category (Level 1) and SubCategory (Level 2) structure.
- **Atomic Database Transaction:** Runs inside a Prisma `$transaction` block to:
  1. Create the `Workspace` record.
  2. Create a `WorkspaceMember` record with `role: "OWNER"` bound to the creator (`userId`).
  3. Bulk seed the Category and SubCategory rows parsed from the selected template configuration.
- **Security & Pipeline:** Leverages the Task 2.3 pipeline (`withSession` → `validateBody` → `sanitizeObject`) and enforces an Onboarding Verification Guard (ensuring the user has an active `Profile`, returning `403 ONBOARDING_REQUIRED` if missing).

---

## 2. Architecture & File Structure

```text
src/
├── features/
│   └── workspaces/
│       ├── constants/
│       │   └── workspace-templates.ts   # Static template definitions (PERSONAL, FAMILY, SMALL_BUSINESS)
│       ├── schemas.ts                   # Zod validation schema for workspace creation
│       ├── schemas.test.ts              # Co-located unit tests for schemas
│       ├── services.ts                  # Prisma transaction service for workspace creation + template seeding
│       └── services.test.ts             # Co-located unit tests for services
└── app/
    └── api/
        v1/
            workspaces/
                route.ts                 # POST /api/v1/workspaces Route Handler
                route.test.ts            # Co-located unit tests for the route handler
```

---

## 3. Template Structures (`workspace-templates.ts`)

Each template defines a list of Level 1 Categories with their `type` (`INCOME` | `EXPENSE` | `TRANSFER`) and an array of Level 2 SubCategory names:

- **`PERSONAL`**:
  - Income: Salary, Freelance
  - Expense: Food & Dining, Rent & Utilities, Entertainment
  - Transfer: Savings Transfer
- **`FAMILY`**:
  - Income: Primary Income, Secondary Income
  - Expense: Groceries, Housing & Utilities, Education, Healthcare
  - Transfer: Family Savings
- **`SMALL_BUSINESS`**:
  - Income: Client Revenue, Product Sales
  - Expense: Software & Tools, Office Rent, Marketing, Payroll
  - Transfer: Business Reserve

---

## 4. Step-by-Step Implementation Tasks

1. **Create Constants (`src/features/workspaces/constants/workspace-templates.ts`)**
   - Define the TypeScript types and static objects for `PERSONAL`, `FAMILY`, and `SMALL_BUSINESS`.
2. **Create Zod Schemas (`src/features/workspaces/schemas.ts`)**
   - Define `CreateWorkspaceSchema` with `name` and `templateName`.
   - Write co-located `schemas.test.ts`.
3. **Create Database Service (`src/features/workspaces/services.ts`)**
   - Implement `createWorkspace(userId, data)` wrapping the Prisma `$transaction`.
   - Write co-located `services.test.ts`.
4. **Create API Route Handler (`src/app/api/v1/workspaces/route.ts`)**
   - Wire session extraction, onboarding guard, Zod validation, sanitization, and service execution.
   - Return `successWithStatus(workspaceData, 201)`.
   - Write co-located `route.test.ts`.

---

## 5. Verification Plan

- Run `npm run test:run` to verify all co-located tests pass successfully.
- Run `npm run lint` to verify zero lint errors.
