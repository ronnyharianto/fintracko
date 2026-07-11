# Implementation Task Roadmap (MVP 1 Milestone) - Fintracko

This roadmap lists chronological technical checkpoints to build Fintracko safely. The AI Agent must fulfill each task completely, verify it with unit tests, and obtain authorization before starting the next phase. All code, routes, and logic must align with `ARCHITECTURE.md`, `PRD.md`, `API_SPECS.md`, `PROJECT_STRUCTURE.md`, and `AGENT_RULES.md`.

---

## Phase 1: Project Initialization & Configuration
- [ ] **Task 1.1: Next.js Foundation Setup**
  - Initialize the Next.js application with TypeScript, Tailwind CSS, and the structured `src/` directory layout.
  - Set up `tsconfig.json` and verify absolute path mapping (`@/*`).
- [ ] **Task 1.2: Testing Environment Config**
  - Configure `vitest.config.ts` and set up the sample environment sanity tests.
  - Enforce the rule: All unit tests must be co-located directly next to their target files using the explicit `*.test.ts` or `*.test.tsx` naming pattern.
- [ ] **Task 1.3: Prisma Database Schema Definition**
  - Initialize Prisma ORM. Copy and implement the full multi-tenant schema matching `ARCHITECTURE.md` (User, Profile, Workspace, WorkspaceMember, Account, Category, SubCategory, Budget, Transaction).
  - Verify primary keys, compound unique indexes, and cascade delete logic on local/Supabase development instances.
- [ ] **Task 1.4: Design System Ingestion**
  - Initialize `shadcn/ui` atomic visual components within `src/components/ui/` (button, card, dialog, input, form, table, toast).
  - Enforce component isolation: code injection in `src/components/ui/` must remain completely generic.

## Phase 2: Core Authentication & Security Gateway Pipeline
- [ ] **Task 2.1: Public Pages & SEO Setup**
  - Construct the responsive public marketing Landing Page (`src/app/page.tsx`).
  - Add accessible static legal routes for compliance: `/privacy-policy` and `/terms-of-service`.
- [ ] **Task 2.2: Better Auth Integration**
  - Install and initialize Better Auth bindings inside `src/lib/auth.ts` using strictly OAuth-only login mechanisms (Google and GitHub Providers). Disable standard password credentials.
  - Implement the security enforcement pipeline: Explicitly reject incoming OAuth payloads if `email_verified` is false. Disable unsafe global account linking.
- [ ] **Task 2.3: Rest API Hardened Envelope & Pipeline**
  - Develop the base REST API route handling utility to wrap all network outputs inside the standardized global success/failure JSON envelopes.
  - Build the global pipeline handlers for API Route Handlers: session extraction, Zod input validation schema validation, and rigorous input HTML/JS sanitization via `isomorphic-dompurify` to neutralize XSS vectors.

## Phase 3: Implicit Onboarding & Multi-Tenancy Framework
- [ ] **Task 3.1: Profile Implicit Onboarding Guard**
  - Create the `OnboardingGuardWrapper.tsx` Server Component at the layout level enclosing all private dashboard pages (`src/app/(dashboard)/`).
  - Perform direct Prisma database verification to check for the existence of a `Profile` record linked to the `userId`. If no profile exists, gracefully intercept and render the onboarding wizard interface without global edge middleware block constraints.
- [ ] **Task 3.2: Onboarding Wizard Flow**
  - Implement the onboarding route wizard (`src/app/(onboarding)/onboarding`) to collect mandatory user settings (`bio`, `dateOfBirth`, `gender`, `currencyPreference`, `languagePreference`) and force explicit checkboxes confirming legal compliance.
  - Persist the new `Profile` entry and automatically establish the user's first baseline workspace in a single atomic database operation.
- [ ] **Task 3.3: Dynamic Workspace Templates Creation**
  - Implement `POST /api/v1/workspaces` following the explicit Prisma `$transaction` workflow.
  - Read static workspace configuration templates from codebase constants (`PERSONAL`, `FAMILY`, `SMALL_BUSINESS`) to populate multi-level Category (Level 1) and SubCategory (Level 2) rows bound to the new workspace.
- [ ] **Task 3.4: Workspace Collaborator Orchestration**
  - Implement `POST /api/v1/workspaces/invite` to safely attach a new row to `WorkspaceMember` with a default role of `COLLABORATOR`, checking recipient existence via indexed lookups.
  - Implement secure multi-tenancy Anti-IDOR validation across all workspace endpoints by performing compound query verification inside `WorkspaceMember` matching both `workspaceId` and `userId`.

## Phase 4: Financial Node Structure & Delta Account Balances
- [ ] **Task 4.1: Account Delta Invariant Processing**
  - Construct `src/app/(dashboard)/workspaces` and management UIs to handle Account CRUD.
  - Enforce the architectural balance formula: Final Account Balance = `initialBalance` + `netTransactionSum` (where `netTransactionSum` tracks the accumulated delta of all transaction mutations).
- [ ] **Task 4.2: Two-Level Category Framework**
  - Develop the nested hierarchy structure separating primary Category (Level 1) from SubCategory (Level 2).
  - Enforce structural constraints via backend guards: preventing users from assigning budgets or raw transactions directly onto Level 1 parents.

## Phase 5: Transaction Ledger & Precision Math Safety
- [ ] **Task 5.1: Transaction Processing Core Engine**
  - Implement the unified route ledger mapping `POST`, `PUT`, `DELETE` operations for transaction records (Income, Expense, Transfer).
  - Enforce strict database mathematical invariants using a unified Prisma `$transaction` block: every transaction insertion, removal, or update must mutate the `netTransactionSum` fields of the corresponding source and destination accounts.
- [ ] **Task 5.2: Precision Decimal & Storage Optimization Pipeline**
  - Enforce decimal safety across the core business tier using Prisma `Decimal` mapping onto PostgreSQL `Decimal(18,4)`. All client payloads must pass numbers as string-serialized numeric values to prevent JavaScript floating-point rounding degradation.
  - Implement the backend image upload pipeline: Intercept receipt attachments, validate file sizes under 2MB, route payloads directly to the Imgur API Free Tier, and store the resulting public image URL string into the database.

## Phase 6: Budget Constraint System
- [ ] **Task 6.1: SubCategory Level 2 Budget Engine**
  - Implement `POST /api/v1/budgets` to configure spending limits strictly mapping onto Level 2 SubCategories for Monthly or Yearly intervals.
  - Build backend database validation checks rejecting budget creations if the `categoryId` refers to a primary Level 1 parent node (`parentId === null`).
- [ ] **Task 6.2: Real-time Utilization Tracker**
  - Create a dynamic UI progress element tracking utilization percentages against live expense aggregations in the corresponding categories.

## Phase 7: Analytical Performance Dashboard
- [ ] **Task 7.1: Exhausted Budget Analytics Lookups**
  - Construct optimized database aggregation queries serving the Top 5 Monthly and Top 5 Yearly budgets closest to exhaustion.
- [ ] **Task 7.2: Graphical Categorized Breakdown & Net Worth Trends**
  - Build database aggregations summarizing Level 1 category expenditure distribution for the current calendar month.
  - Build a rolling 6-month historical net worth line dataset calculating the sum of all aggregated account balances at the end of each chronological month.
- [ ] **Task 7.3: Interactive Chart Rendering Isolation**
  - Bind analytics payloads onto dashboard chart elements using lightweight visual libraries (`Recharts`).
  - Isolate client interactivity: ensure chart components are explicitly designated with `'use client'` while layout wrapping shells remain performance-optimized Server Components.