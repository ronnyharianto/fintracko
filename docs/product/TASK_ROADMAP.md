# Implementation Task Roadmap (MVP 1 Milestone) - Fintracko

This roadmap lists chronological technical checkpoints to build Fintracko safely. The AI Agent must fulfill each task completely, verify it with unit tests, and obtain authorization before starting the next phase. All code, routes, and logic must align with `ARCHITECTURE.md`, `PRD.md`, `API_SPECS.md`, `PROJECT_STRUCTURE.md`, and `AGENT_RULES.md`.

---

## Phase 1: Project Initialization & Configuration
- [x] **Task 1.1: Next.js Foundation Setup**
  - Initialize the Next.js application with TypeScript, Tailwind CSS, and the structured `src/` directory layout.
  - Set up `tsconfig.json` and verify absolute path mapping (`@/*`).
- [x] **Task 1.2: Testing Environment Config**
  - Configure `vitest.config.ts` and set up the sample environment sanity tests.
  - Enforce the rule: All unit tests must be co-located directly next to their target files using the explicit `*.test.ts` or `*.test.tsx` naming pattern.
- [x] **Task 1.3: Prisma Database Schema Definition**
  - Initialize Prisma ORM. Implement the full multi-tenant schema matching `ARCHITECTURE.md` §2. Models: `User`, `Profile`, `Workspace`, `WorkspaceMember`, `Account` (financial), `Category`, `SubCategory`, `Budget`, `Transaction`, plus the Better Auth–aligned `AuthAccount` and `Session` tables reconciled into the schema here (not deferred to Task 2.2) to guarantee migration continuity.
  - Use PostgreSQL `UUID` primary keys, `Decimal(18,4)` for all financial fields, `String[]` for `Transaction.tags`, and Prisma enums for `WorkspaceRole`, `CategoryType`, `BudgetInterval`, `Gender`, and `TransactionType`.
  - Enforce compound unique keys: `WorkspaceMember[workspaceId, userId]`, `Account[workspaceId, name]`, `Budget[subCategoryId, interval]`, and `AuthAccount[providerId, accountId]`.
  - Enforce `On Delete: Cascade` per the architecture spec; add performance indexes on foreign keys, `User.email`, `Transaction.date`, `Transaction.payeePayer`, and `Category(type)`.
  - Create the Prisma client singleton at `src/lib/db.ts` (cached on `globalThis` to survive Next.js dev hot-reload without exhausting the connection pool).
  - Bootstrap a local Supabase Postgres via the Supabase CLI (Docker) for development; apply the initial migration and verify primary keys, compound uniques, and cascade behavior against this instance.
  - Verify primary keys, compound unique indexes, and cascade delete logic on local/Supabase development instances.
  - Add npm scripts: `prisma:generate`, `prisma:migrate`, `prisma:studio`, `db:push`, `db:reset`, `supabase:start`, `supabase:stop`.
  - Add a co-located `src/lib/db.test.ts` unit test asserting the generated Prisma Client exposes all 11 model delegates and the expected enum values. (Vitest's `include` is restricted to `src/**`, so the test sits beside the singleton `db.ts` — the import target — rather than under `prisma/`.)
- [x] **Task 1.4: Design System Ingestion**
  - Initialize `shadcn/ui` atomic visual components within `src/components/ui/` (button, card, dialog, input, form, label, table, toast). All components carry `data-slot` attributes for deterministic DOM querying and are styled via the new-york variant.
  - Replace shadcn's default slate CSS variables in `src/app/globals.css` with Fintracko's teal design tokens per `docs/core/DESIGN_SYSTEM.md` §Color Palette. Light mode uses `#0f766e` (primary: `175 77% 26%`), dark mode uses `#14b8a6` (primary: `173 80% 40%`). Added `@custom-variant dark (&:is(.dark *))` for explicit dark-mode toggling alongside `prefers-color-scheme`.
  - Integrate `sonner` toast notification provider into root layout (`src/app/layout.tsx`) with `richColors`, `closeButton`, and `position="top-right"`. Update metadata to Fintracko branding ("Fintracko — Smart Financial Tracker").
  - Add a co-located smoke test at `src/components/ui/ui-components.test.tsx` asserting every installed component renders without throwing and exposes the expected `data-slot` attribute.
  - Enforce component isolation: code injection in `src/components/ui/` must remain completely generic; no business-state parsing occurs inside these files.

## Phase 2: Core Authentication & Security Gateway Pipeline
- [x] **Task 2.1: Public Pages & SEO Setup**
  - Construct the responsive public marketing Landing Page (`src/app/page.tsx`).
  - Add accessible static legal routes for compliance: `/privacy-policy` and `/terms-of-service`.
  - **Resolution (2026-07-13):** ✅ Complete. 14 files created/rewritten. Landing page composed of 6 modular Server Component sections under `src/components/shared/landing/` (NavBar, HeroSection, FeatureGrid, HowItWorks, CtaSection, Footer). All sections follow Fintracko's teal design system (DESIGN_SYSTEM.md), are mobile-first responsive, and have semantic HTML. `/privacy-policy` and `/terms-of-service` live inside the `(marketing)` route group with a shared layout providing NavBar + Footer wrappers. All 4 pages carry proper SEO metadata (title, description, openGraph, robots). 4 co-located unit test files (79 tests total) validate rendering, content presence, CTA links, and metadata exports. Build verified — all 4 routes compile as static pages.
  - **Iteration (2026-07-14):** ✅ Polish & theme robustness. Added an accessible client-side ThemeToggle (`src/components/shared/theme-toggle.tsx`, `role="switch"` + `aria-checked` + localStorage persistence) wired through a pre-hydration inline script in [`src/app/layout.tsx`](src/app/layout.tsx) (prevents FOUC, default dark). Logo redesigned as a wallet + rising chart-bars SVG (`src/components/shared/fintracko-logo.tsx`) with light/dark variants; later tuned to a lighter steel-slate palette. Critical CSS fix: design-token HSL channels in `globals.css` `@theme inline` now wrapped in `hsl()` (previously emitted invalid color values that caused browsers to fall back to black text in dark mode). Documentation aligned in README.md, PROJECT_STRUCTURE.md, and DESIGN_SYSTEM.md. Test suite grown to 86 tests across 8 files; build green.
- [x] **Task 2.2: Better Auth Integration**
  - Install and initialize Better Auth bindings inside `src/lib/auth.ts` using strictly OAuth-only login mechanisms (Google and GitHub Providers). Disable standard password credentials.
  - Implement the security enforcement pipeline: Explicitly reject incoming OAuth payloads if `email_verified` is false. Disable unsafe global account linking.
  - **Resolution (2026-07-15):** ✅ Complete. 7 files created/updated. [`src/lib/auth.ts`](src/lib/auth.ts) configures Better Auth with the Prisma adapter (`postgresql`), `emailAndPassword.enabled: false`, Google + GitHub social providers, `account.accountLinking.enabled: false` (linking disabled), and a [`signIn`](src/lib/auth.ts:58) callback rejecting any payload where `emailVerified === false`. Exports `AuthClient = typeof auth` for type-safe server usage. [`src/lib/auth-client.ts`](src/lib/auth-client.ts) ships a browser-safe `createAuthClient()` instance (no `baseURL` — resolves to `window.location.origin`) plus an `OAuthProvider` (`"google" | "github"`) type union. The route handler at [`src/app/api/v1/auth/[...better-auth]/route.ts`](src/app/api/v1/auth/[...better-auth]/route.ts) mounts explicit `GET`/`POST` async functions that delegate to `auth.handler`. Frontend surfaces live in the `(auth)` route group: [`layout.tsx`](src/app/(auth)/layout.tsx) (centered brand shell importing [`FintrackoLogo`](src/components/shared/fintracko-logo.tsx), `robots: { index: false, follow: false }` metadata), [`login/page.tsx`](src/app/(auth)/login/page.tsx) ("Welcome back" card with `CardDescription`, link to `/register`), and [`register/page.tsx`](src/app/(auth)/register/page.tsx) ("Create your account" card with `CardDescription`, link to `/login`); both pages render the [`OAuthButtons`](src/components/shared/auth/oauth-buttons.tsx) client component (`title` + `className` props, Google/GitHub buttons, per-provider pending state with "Redirecting…" UX, `callbackURL = {origin}/onboarding`). 45 co-located unit tests across 5 files all pass (auth 17, oauth-buttons 11, layout 5, login 6, register 6). Build green; runtime redirect target is `/onboarding`. Full technical documentation in [`docs/README.md`](docs/README.md).
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