# Implementation Log - Fintracko MVP 1

This document records **how** completed roadmap tasks were implemented — file-level decisions, test counts, build outcomes, and post-merge fixes. It is the historical companion to [`TASK_ROADMAP.md`](TASK_ROADMAP.md), which remains a clean forward-looking progress tracker (task bullets + status markers only). New entries are appended here as each roadmap task completes.

> **Rendering note:** Long resolution paragraphs were relocated verbatim from the roadmap. Where a paragraph exceeds the line width of source viewers it is intentionally kept on a single physical line to preserve the original record; reading tools may wrap it.

---

## Task 1.1 — Next.js Foundation Setup

### Resolution ✅ Complete

Next.js 16.2.10 bootstrapped with React 19.2.4 in TypeScript strict mode, using the App Router under a structured `src/` directory. [`tsconfig.json`](../../tsconfig.json) locks the language contract: `strict: true`, `target: ES2017`, `moduleResolution: "bundler"`, `isolatedModules`, the `next` plugin, and a `paths` alias of `@/* → ./src/*` enabling absolute imports across the codebase. Tailwind CSS 4 is wired through [`postcss.config.mjs`](../../postcss.config.mjs) and surfaced via [`src/app/globals.css`](../../src/app/globals.css); [`next.config.ts`](../../next.config.ts) carries the project-level Next configuration, and [`eslint.config.mjs`](../../eslint.config.mjs) extends `eslint-config-next` for the lint contract. The App Router skeleton carries root [`layout.tsx`](../../src/app/layout.tsx), [`page.tsx`](../../src/app/page.tsx), plus co-located [`error.tsx`](../../src/app/error.tsx), [`loading.tsx`](../../src/app/loading.tsx), and [`not-found.tsx`](../../src/app/not-found.tsx) error boundaries. Foundation verified: the dev server boots on `http://localhost:3000` and `next build` compiles the static marketing routes cleanly.

> **Source-of-truth alignment:** The foundation layout and path aliasing are canonically documented in [`docs/core/PROJECT_STRUCTURE.md`](../core/PROJECT_STRUCTURE.md) §2 (Directory Layout) and the technology stack in [`docs/architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md) §1 (Technology Stack).

---

## Task 1.2 — Testing Environment Config

### Resolution ✅ Complete

[`vitest.config.mts`](../../vitest.config.mts) defines the test contract: `environment: "jsdom"` (DOM APIs available for React Testing Library), globals enabled so `describe`/`it`/`expect` need no imports, a resolve `alias` of `@` → `./src` mirroring the [`tsconfig.json`](../../tsconfig.json) `paths` mapping, `setupFiles: ["./src/test/setup.ts"]` registering `@testing-library/jest-dom` matchers, and an `include: ["src/**/*.test.ts", "src/**/*.test.tsx"]` glob that hard-enforces the co-located test rule (tests sit directly next to their target files, `*.test.ts`/`*.test.tsx` naming — AGENT_RULES.md §4 + PROJECT_STRUCTURE.md §3). `node_modules`, `.next`, `build`, and `out` are excluded so generated/dependency code never runs. Vitest is resolved from `vitest@^4.1.10` with `@vitejs/plugin-react` and `vite-tsconfig-paths`. The sanity test at [`src/lib/utils.test.ts`](../../src/lib/utils.test.ts) fences the runner against the `cn()` `clsx` + `tailwind-merge` utility (5 tests: plain merge, Tailwind conflict resolution, falsy/conditional skipping, array/object joining, empty-input passthrough).

> **Source-of-truth alignment:** The co-located testing rule and runner config are canonically documented in [`docs/core/AGENT_RULES.md`](../core/AGENT_RULES.md) §4 (Mandatory Unit Testing) and [`docs/core/PROJECT_STRUCTURE.md`](../core/PROJECT_STRUCTURE.md) §3 (Co-located Automated Unit Testing).

---

## Task 1.3 — Prisma Database Schema Definition

### Resolution ✅ Complete

The full multi-tenant schema matching `ARCHITECTURE.md` §2 ships at [`prisma/schema.prisma`](../../prisma/schema.prisma) as migration `20260716222200_init` (under [`prisma/migrations/`](../../prisma/migrations/)). Twelve models — `User`, `Profile`, `Workspace`, `WorkspaceMember`, `FinancialAccount`, `Category`, `SubCategory`, `Budget`, `FinancialTransaction`, plus the Better Auth–aligned `AuthAccount`, `Session`, and `Verification` — use PostgreSQL `UUID` primary keys, `Decimal(18,4)` for every financial field, `String[]` `FinancialTransaction.tags`, and Prisma enums (`WorkspaceRole`, `CategoryType`, `BudgetInterval`, `Gender`, `TransactionType`). Compound unique keys enforce `WorkspaceMember[workspaceId, userId]`, `FinancialAccount[workspaceId, name]`, `Budget[subCategoryId, interval]`, and `AuthAccount[providerId, accountId]`; `On Delete: Cascade` is applied per the architecture spec and performance indexes cover foreign keys plus `User.createdAt`, `FinancialTransaction.date`, `FinancialTransaction.payeePayer`, and `Category[workspaceId, type]`. The Prisma Client singleton at [`src/lib/db.ts`](../../src/lib/db.ts) caches the client instance on `globalThis` (avoiding connection-pool exhaustion across Next.js dev hot-reload). Local Postgres 17 is bootstrapped via the Supabase CLI Docker stack ([`supabase/config.toml`](../../supabase/config.toml)); npm scripts `prisma:generate`, `prisma:migrate`, `prisma:migrate:deploy`, `prisma:studio`, `db:push`, `db:reset`, `supabase:start`, `supabase:stop`, and `supabase:status` are wired in [`package.json`](../../package.json). The co-located [`src/lib/db.test.ts`](../../src/lib/db.test.ts) suite (9 tests) asserts every one of the 12 model delegates is exposed, the five enum contracts (`WorkspaceRole`, `CategoryType`, `TransactionType`, `BudgetInterval`, `Gender`) hold their literal members, and re-importing `db` returns the identical singleton instance.

### Cross-reference notes (relocated from roadmap bullets)

- `Verification` was added later during Task 2.2 — see the [Task 2.2 resolution](#task-22--better-auth-integration) below.
- The co-located `src/lib/db.test.ts` unit test asserts the generated Prisma Client exposes all 12 model delegates and the expected enum values. Vitest's `include` is restricted to `src/**`, so the test sits beside the singleton `db.ts` (the import target) rather than under `prisma/`. The count was updated to 12 after Task 2.2 added the `Verification` model.

---

## Task 1.4 — Design System Ingestion

### Resolution ✅ Complete

The new-york `shadcn/ui` atomic variant lands in [`src/components/ui/`](../../src/components/ui/) — `button`, `card`, `dialog`, `input`, `label`, `table` (plus `checkbox`, `select`, `form`, `toast`) — each carrying `data-slot` attributes for deterministic DOM querying and styled via the Tailwind 4 + Radix primitives stack. [`src/app/globals.css`](../../src/app/globals.css) replaces shadcn's default slate CSS variables with Fintracko's teal design tokens (DESIGN_SYSTEM.md §Color Palette): light-mode primary `#0f766e` (`175 77% 26%`), dark-mode primary `#14b8a6` (`173 80% 40%`), with `@custom-variant dark (&:is(.dark *))` added for explicit dark-mode toggling alongside `prefers-color-scheme`. The `sonner` toast provider is integrated into the root layout at [`src/app/layout.tsx`](../../src/app/layout.tsx) (`richColors`, `closeButton`, `position="top-right"`) and the root metadata is updated to Fintracko branding (`"Fintracko — Smart Financial Tracker"`). The co-located smoke test at [`src/components/ui/ui-components.test.tsx`](../../src/components/ui/ui-components.test.tsx) (12 tests — Button ×3, Card ×2, Dialog ×2, Input ×2, Label ×1, Table ×2) asserts every installed component renders without throwing and exposes the expected `data-slot` attribute. Component isolation is enforced: files under `src/components/ui/` stay completely generic, no business-state parsing leaks into the atoms.

### Implementation detail (relocated from roadmap bullet)

- `@custom-variant dark (&:is(.dark *))` was added for explicit dark-mode toggling alongside `prefers-color-scheme`.

> **Source-of-truth alignment:** The teal design tokens, the `data-slot` component contract, and the `sonner` integration are canonically documented in [`docs/core/DESIGN_SYSTEM.md`](../core/DESIGN_SYSTEM.md) §Color Palette and §Component Architecture, and the `src/components/ui/` atomic layout in [`docs/core/PROJECT_STRUCTURE.md`](../core/PROJECT_STRUCTURE.md) §2.2 (`src/components/ui/`).

---

## Task 2.1 — Public Pages & SEO Setup

### Resolution (2026-07-13) ✅ Complete

14 files created/rewritten. Landing page composed of 6 modular Server Component sections under `src/components/shared/landing/` (NavBar, HeroSection, FeatureGrid, HowItWorks, CtaSection, Footer). All sections follow Fintracko's teal design system (DESIGN_SYSTEM.md), are mobile-first responsive, and have semantic HTML. `/privacy-policy` and `/terms-of-service` live inside the `(marketing)` route group with a shared layout providing NavBar + Footer wrappers. All 4 pages carry proper SEO metadata (title, description, openGraph, robots). 4 co-located unit test files (79 tests total) validate rendering, content presence, CTA links, and metadata exports. Build verified — all 4 routes compile as static pages.

### Iteration (2026-07-14) ✅ Polish & theme robustness

Added an accessible client-side ThemeToggle (`src/components/shared/theme-toggle.tsx`, `role="switch"` + `aria-checked` + localStorage persistence) wired through a pre-hydration inline script in [`src/app/layout.tsx`](src/app/layout.tsx) (prevents FOUC, default dark). Logo redesigned as a wallet + rising chart-bars SVG (`src/components/shared/fintracko-logo.tsx`) with light/dark variants; later tuned to a lighter steel-slate palette. Critical CSS fix: design-token HSL channels in `globals.css` `@theme inline` now wrapped in `hsl()` (previously emitted invalid color values that caused browsers to fall back to black text in dark mode). Documentation aligned in README.md, PROJECT_STRUCTURE.md, and DESIGN_SYSTEM.md. Test suite grown to 86 tests across 8 files; build green.

> **Source-of-truth alignment:** The theme robustness decisions above are canonically documented in [`docs/core/DESIGN_SYSTEM.md`](../core/DESIGN_SYSTEM.md) §Design Tokens → Theme Management.

---

## Task 2.2 — Better Auth Integration

### Resolution (2026-07-15) ✅ Complete

7 files created/updated. [`src/lib/auth.ts`](src/lib/auth.ts) configures Better Auth with the Prisma adapter (`postgresql`), `basePath: "/api/v1/auth"` (matched to the versioned route handler — the default `/api/auth` 404s against it), `emailAndPassword.enabled: false`, Google + GitHub social providers, `account.accountLinking.enabled: false` (linking disabled), and a [`signIn`](src/lib/auth.ts:91) callback rejecting any payload where `emailVerified === false`. It also declares explicit Better Auth `modelMapping` (`user`→`User`, `account`→`AuthAccount`, `session`→`Session`, `verification`→`Verification`) so the adapter queries the project's renamed tables instead of the default ones. Exports `AuthClient = typeof auth` for type-safe server usage. [`src/lib/auth-client.ts`](src/lib/auth-client.ts) ships a browser-safe `createAuthClient()` instance (no `baseURL` — resolves to `window.location.origin`) plus an `OAuthProvider` (`"google" | "github"`) type union. The route handler at [`src/app/api/v1/auth/[...better-auth]/route.ts`](src/app/api/v1/auth/[...better-auth]/route.ts) mounts explicit `GET`/`POST` async functions that delegate to `auth.handler`. Frontend surfaces live in the `(auth)` route group: [`layout.tsx`](<src/app/(auth)/layout.tsx>) (centered brand shell importing [`FintrackoLogo`](src/components/shared/fintracko-logo.tsx), `robots: { index: false, follow: false }` metadata), [`login/page.tsx`](<src/app/(auth)/login/page.tsx>) ("Welcome back" card with `CardDescription`, link to `/register`), and [`register/page.tsx`](<src/app/(auth)/register/page.tsx>) ("Create your account" card with `CardDescription`, link to `/login`); both pages render the [`OAuthButtons`](src/components/shared/auth/oauth-buttons.tsx) client component (`title` + `className` props, Google/GitHub buttons, per-provider pending state with "Redirecting…" UX, `callbackURL = {origin}/onboarding`). 44 co-located unit tests across 5 files all pass (auth 17, oauth-buttons 10, layout 5, login 6, register 6). Build green; runtime redirect target is `/onboarding`.

**Follow-up fix (2026-07-15):** Added a new `Verification` model to [`prisma/schema.prisma`](../../prisma/schema.prisma) (12 models total) backed by migration `20260715141409_add_better_auth_verification_model`, which resolved the "Model verification does not exist in the database" error that aborted OAuth sign-in. Full technical documentation in [`README.md`](../../README.md).

> **Source-of-truth alignment:** The auth config and the `Verification` table are canonically documented in [`docs/architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md) §1 (Security Enforcement) and §2 (Verification Table).

---

## Task 2.3 — Rest API Hardened Envelope & Pipeline

### Resolution (2026-07-17) ✅ Complete

11 files created/updated. A new [`src/lib/api/`](src/lib/api/) module folder packages the Task 2.3 contract as four co-resident handlers plus a composable orchestrator. [`envelope.ts`](src/lib/api/envelope.ts) implements the API_SPECS.md §1 success/failure JSON envelopes — `success()` (200), `successWithStatus()` (201/similar), `failure()` (canonical HTTP_STATUS_BY_CODE map: 400/401/403/404/409/422/500), `failureWithStatus()` (override), and `validationFailure()` (Zod-issue → field-level `validationErrors` translation). All envelopes carry a UTC ISO-8601 `timestamp` (trailing `Z`) so the contract stays locale-independent per ARCHITECTURE.md §4 i18n. [`session.ts`](src/lib/api/session.ts) implements API_SPECS.md §2 "Session & Identity Extraction" via Better Auth's `auth.api.getSession({ headers })`; missing/invalid session or a thrown auth error both collapse to a clean `UNAUTHORIZED` (401) envelope — internal Better Auth detail is never echoed (AGENT_RULES.md §3 sensitive-data handling). `withSession()` lazily resolves the production auth singleton via dynamic `import("../auth")` to keep the test graph Prisma-free. [`validate.ts`](src/lib/api/validate.ts) wraps Zod 4 schema validation: invalid JSON → `BAD_REQUEST` (400), schema failure → `VALIDATION_ERROR` (422) with per-field `validationErrors`, and a schema that throws inside `.parse` degrades to 400 rather than leaking a 500. [`sanitize.ts`](src/lib/api/sanitize.ts) runs `isomorphic-dompurify` against every string leaf — script/iframe/on* tags, `javascript:` hrefs and style attributes stripped; arrays (`FinancialTransaction.tags`) and arbitrarily-nested payloads (`sanitizeObject`) are walked with circular-reference refusal and Date/RegExp/Map/Set instance immunity. [`pipeline.ts`](src/lib/api/pipeline.ts) orchestrates the three stages (session → validate → sanitize) as a discriminated `PipelineResult` so consumer Route Handlers cannot reach business logic until every stage attests success (or short-circuit by returning the ready envelope); `withPipeline(request, schema, handler)` is the idiomatic Route Handler surface. Task 2.3 scope deliberately excludes the Phase 3+ Onboarding & Workspace Anti-IDOR guards — those land in Task 3.1 and 3.4 respectively. 64 new unit tests across 5 co-located `*.test.ts(x)` suites cover happy paths and every failure mode (XSS vector survival, non-JSON body, schema-throws-inside-`.parse`, missing-session, session-resolved-but-no-userId, thrown-auth, circular payload, `skipSanitization` opt-in). Additionally fixed a pre-existing drift in [`src/lib/db.test.ts`](src/lib/db.test.ts) where the `EXPECTED_MODELS`list still listed the legacy`account`/`transaction`names superseded by Task 1.3's`FinancialAccount`/`FinancialTransaction`rename; list now matches the generated Prisma client. Full suite green — 18 files, 194 tests passed — and`tsc --noEmit` is clean.

> **Source-of-truth alignment:** The envelope/pipeline contract is canonically documented in [`docs/architecture/API_SPECS.md`](../architecture/API_SPECS.md) §1 (Response Standards) and §2 (Global Security & Gateway Pipeline).

---

## Task 3.1 — Profile Implicit Onboarding Guard

### Resolution ✅ Complete

6 files created/wired. [`src/components/guards/onboarding-guard-wrapper.tsx`](src/components/guards/onboarding-guard-wrapper.tsx) implements the ARCHITECTURE.md §3 "Onboarding & Auth Guard" as a React Server Component (no `'use client'`). It reads the request headers via `next/headers`, then resolves the Better Auth session and the Prisma singleton **lazily** (dynamic `import("@/lib/auth")` / `import("@/lib/db")`) so the module-load graph stays small and the unit tests run Prisma-free. The guard flow: (1) call `auth.api.getSession({ headers })` — no session (or no `session.user.id`) → `redirect("/login")`; (2) `db.profile.findUnique({ where: { userId } })` — no `Profile` → `redirect("/onboarding")`; (3) otherwise render `children` via a `<>{children}</>` fragment. Structural `AuthLike` / `SessionLike` / `DbLike` interfaces provide injection seams for tests. The guard is mounted in two layouts: [`src/app/(dashboard)/layout.tsx`](<src/app/(dashboard)/layout.tsx>) (wraps every private dashboard route) and [`src/app/(onboarding)/layout.tsx`](<src/app/(onboarding)/layout.tsx>) (so onboarded users hitting `/onboarding` are bounced back). 6 co-located tests in [`onboarding-guard-wrapper.test.tsx`](src/components/guards/onboarding-guard-wrapper.test.tsx) cover: no-session → `/login`, session-without-`user.id` → `/login`, session-without-`Profile` → `/onboarding`, session+`Profile` → renders children, `Profile.findUnique` queried with the correct `userId`, and graceful handling of a thrown `db.profile.findUnique` (does not leak to the client). Build green.

> **Source-of-truth alignment:** The guard behavior is canonically documented in [`docs/architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md) §3 (Core Architectural Safeguards & Guards) and [`docs/core/PROJECT_STRUCTURE.md`](../core/PROJECT_STRUCTURE.md) §2.3 (`src/components/guards/`).

---

## Task 3.2 — Onboarding Wizard Flow

### Resolution ✅ Complete

11 files created. The onboarding UI, business logic, and REST endpoint form a single vertical slice:

- **Route group** — [`src/app/(onboarding)/layout.tsx`](<src/app/(onboarding)/layout.tsx>) renders a distraction-free centered shell (Fintracko brand link, no NavBar/Footer, `robots: { index: false, follow: false }`) and wraps children in `OnboardingGuardWrapper`. [`src/app/(onboarding)/onboarding/page.tsx`](<src/app/(onboarding)/onboarding/page.tsx>) mounts the `OnboardingForm` Server Component child.
- **Form** — [`src/components/shared/onboarding/onboarding-form.tsx`](src/components/shared/onboarding/onboarding-form.tsx) is a `"use client"` card-driven wizard collecting `bio` (optional, ≤500 chars), `dateOfBirth` (required), `gender` (`MALE` | `FEMALE` | `OTHER`), `currencyPreference` (`USD|IDR|EUR|GBP|JPY|SGD`), `languagePreference` (`en|id|es`), plus two legal checkboxes that stay **disabled** until the user clicks the corresponding `/terms-of-service` / `/privacy-policy` links (gated-read UX). On submit it converts the date to ISO, `POST`s to `/api/v1/onboarding/complete`, surfaces `sonner` toasts on success/failure, and hard-redirects to `/dashboard` on success.
- **Schemas** — [`src/features/onboarding/schemas.ts`](src/features/onboarding/schemas.ts) exports `GenderEnum`, `CurrencyEnum`, `LanguageEnum`, and `CompleteOnboardingSchema` (Zod 4 `z.object` with `bio: z.string().max(500).nullable().optional()`, `dateOfBirth: z.string().datetime()`, and the three enums). `CompleteOnboardingInput` is inferred for the service layer.
- **Service** — [`src/features/onboarding/services.ts`](src/features/onboarding/services.ts) `completeOnboarding(userId, data)` runs a single Prisma `$transaction` that creates the `Profile`, the first `Workspace` (default name `"My Workspace"`, `ownerId = userId`), and a `WorkspaceMember` row with `role: "OWNER"` — guaranteeing the user lands post-onboarding with one owned workspace and a profile marker.
- **Endpoint** — [`src/app/api/v1/onboarding/complete/route.ts`](src/app/api/v1/onboarding/complete/route.ts) reuses the Task 2.3 pipeline: `withSession` → `validateBody(CompleteOnboardingSchema)` → `sanitizeObject` → `completeOnboarding(userId, data)`, returning the standard `success({ profile, workspace })` envelope, or `failure("INTERNAL_SERVER_ERROR", …)` if the transaction throws (e.g. a `Profile` already exists for that `userId`).

Co-located tests: [`schemas.test.ts`](src/features/onboarding/schemas.test.ts) (15 tests — enum accept/reject, optional/null `bio`, required-field and date-format rejection), [`services.test.ts`](src/features/onboarding/services.test.ts) (5 tests — atomic profile+workspace+member creation, correct field passthrough, default workspace name, OWNER role, error propagation), [`onboarding-form.test.tsx`](src/components/shared/onboarding/onboarding-form.test.tsx) (3 tests — field render with disabled checkboxes, checkbox enable on link click, validation toast on submit without acceptance), [`route.test.ts`](src/app/api/v1/onboarding/complete/route.test.ts) (3 tests — success, validation error, internal-server-error fallthrough), [`onboarding/page.test.tsx`](<src/app/(onboarding)/onboarding/page.test.tsx>) (1 test), [`(onboarding)/layout.test.tsx`](<src/app/(onboarding)/layout.test.tsx>) (5 tests). Total suite now 234 tests across 23 files.

> **Source-of-truth alignment:** The onboarding endpoint contract is canonically documented in [`docs/architecture/API_SPECS.md`](../architecture/API_SPECS.md) §3.0 (Onboarding Module), and the wizard flow aligns with [`docs/product/PRD_MVP1.md`](PRD_MVP1.md) §3.1 (Mandatory Onboarding).

---

## Task 3.3 — Dynamic Workspace Templates Creation

### Resolution ✅ Complete

5 files created/updated. Implements the dynamic workspace templates creation vertical slice:

- **Constants** — [`src/features/workspaces/constants/workspace-templates.ts`](../../src/features/workspaces/constants/workspace-templates.ts) defines static configuration templates for `PERSONAL`, `FAMILY`, and `SMALL_BUSINESS`, mapping template names to default Level 1 Categories (`INCOME`, `EXPENSE`, `TRANSFER`) and Level 2 SubCategories.
- **Schemas** — [`src/features/workspaces/schemas.ts`](../../src/features/workspaces/schemas.ts) exports `WorkspaceTemplateEnum` and `CreateWorkspaceSchema` (validating `name` length 1-100 and `templateName`), with co-located unit tests in [`schemas.test.ts`](../../src/features/workspaces/schemas.test.ts).
- **Service** — [`src/features/workspaces/services.ts`](../../src/features/workspaces/services.ts) `createWorkspace(userId, data)` runs an atomic Prisma `$transaction` that creates the `Workspace`, inserts an owner `WorkspaceMember` (`role: "OWNER"`), and bulk-inserts Category and SubCategory rows derived from the selected template. Co-located unit tests in [`services.test.ts`](../../src/features/workspaces/services.test.ts).
- **Endpoint** — [`src/app/api/v1/workspaces/route.ts`](../../src/app/api/v1/workspaces/route.ts) implements `POST /api/v1/workspaces`. Enforces session extraction, the Onboarding Verification guard (`db.profile.findUnique` → `403 ONBOARDING_REQUIRED` if missing), Zod validation, XSS sanitization, and service execution, returning `successWithStatus(workspace, 201)`. Co-located unit tests in [`route.test.ts`](../../src/app/api/v1/workspaces/route.test.ts).

Total test suite now stands at 259 passing tests across 29 test files. Build and lint are completely clean.

> **Source-of-truth alignment:** The workspace creation contract and template seeding logic are canonically documented in [`docs/architecture/API_SPECS.md`](../architecture/API_SPECS.md) §3.1 (Workspace Module) and [`docs/architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md) §4 (Workspace Templates Storage).
