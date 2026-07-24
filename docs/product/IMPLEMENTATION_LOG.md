# Implementation Log - Fintracko MVP 1

This document records **how** completed roadmap tasks were implemented — file-level decisions, test counts, build outcomes, and post-merge fixes. It is the historical companion to [`TASK_ROADMAP.md`](TASK_ROADMAP.md), which remains a clean forward-looking progress tracker (task bullets + status markers only). New entries are appended here as each roadmap task completes.

> **Rendering note:** Long resolution paragraphs were relocated verbatim from the roadmap. Where a paragraph exceeds the line width of source viewers it is intentionally kept on a single physical line to preserve the original record; reading tools may wrap it.

---

## Task 1.3 — Prisma Database Schema Definition

### Cross-reference notes (relocated from roadmap bullets)

- `Verification` was added later during Task 2.2 — see the [Task 2.2 resolution](#task-22--better-auth-integration) below.
- The co-located `src/lib/db.test.ts` unit test asserts the generated Prisma Client exposes all 12 model delegates and the expected enum values. Vitest's `include` is restricted to `src/**`, so the test sits beside the singleton `db.ts` (the import target) rather than under `prisma/`. The count was updated to 12 after Task 2.2 added the `Verification` model.

---

## Task 1.4 — Design System Ingestion

### Implementation detail (relocated from roadmap bullet)

- `@custom-variant dark (&:is(.dark *))` was added for explicit dark-mode toggling alongside `prefers-color-scheme`.

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
