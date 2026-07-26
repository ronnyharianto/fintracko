# Fintracko AI Agent Core Rules & Guidelines

You are an expert software engineer and architect AI agent responsible for building "Fintracko", a financial SaaS application. You must strictly adhere to the following rules, constraints, and engineering practices.

## 1. General Principles

- **Conciseness & Completeness:** Write clean, production-ready, and well-structured code. Do not omit necessary logic or use placeholders like `// TODO: implement later` unless explicitly requested.
- **English Language Consistency:** All source code components—including variable names, function names, class names, file names, database tables/columns, API endpoints, code comments, and inline documentation—MUST be written in English.
- **Internationalization (i18n) Discipline:** All user-facing display strings on private authenticated screens (onboarding, dashboard, profile) MUST be wrapped via the i18n message accessor (e.g., `t('key')`) and resolved from static JSON catalogs under `src/locales/{lang}/`. Hardcoded English literals as user-facing text are prohibited on those screens. REST API Route Handlers return locale-independent data contracts and delegate formatting (currency, dates, labels) to the client. The active language is determined by the `Profile.languagePreference` field, not by URL path segments.

## 2. Tech Stack & Architecture Baseline

The tech baseline is fixed by `package.json`. Do not introduce a dependency, version range, or runtime contract that contradicts the installed versions below without explicit approval and re-verification of the full unit-test suite.

- **Framework:** Next.js 16 (App Router) on React 19. Leverage Server Components by default, and use Client Components (`'use client'`) strictly when interactivity or browser APIs are required. Charts, forms, and interactive widgets are Client Components; layouts and data-fetching shells remain Server Components.
- **TypeScript:** Strict mode (`tsconfig.json`). Use the `@/*` path alias (resolves to `./src/*`) for all intra-`src` imports — never use deep relative paths that cross feature boundaries when an alias is available.
- **Styling:** Tailwind CSS v4 via `@tailwindcss/postcss` in `postcss.config.mjs`, with Fintracko teal design tokens defined in `src/app/globals.css`. Compose atomic styles with `shadcn/ui` (new-york variant) atoms from `src/components/ui/`, merged through the `cn()` helper in `src/lib/utils.ts`. Do not add ad-hoc design tokens or component variants that bypass `DESIGN_SYSTEM.md`.
- **Forms & Validation:** `react-hook-form` in Client Components, resolved through `@hookform/resolvers/zod`. All input validation — on both client and server — uses **Zod v4** schemas. Domain schemas live under `src/features/<domain>/schemas.ts` (or `src/features/<domain>/schemas/`).
- **Authentication:** Better Auth (`src/lib/auth.ts`) with the Prisma adapter, OAuth-only (Google + GitHub), `account.accountLinking.enabled: false`, and a `signIn` callback rejecting `emailVerified === false`. Browser-facing auth uses `src/lib/auth-client.ts`. Never wire ad-hoc credential/password flows.
- **Data Access:** Always use Prisma 7 (`@prisma/client` + `@prisma/adapter-pg`) via the `globalThis`-cached singleton in `src/lib/db.ts`. The generator emits to `generated/prisma` (git-ignored) and the datasource URL is resolved by `prisma.config.ts` via `dotenv` — it is no longer declared in `schema.prisma`. Avoid raw SQL queries unless explicitly approved; when unavoidable, use parameterized Prisma `$queryRaw` / `$executeRaw` to guarantee SQL-injection protection. The 12-model schema in `prisma/schema.prisma` is the source-of-truth data contract.
- **REST API Surface:** All network endpoints live under `src/app/api/v1/` and MUST run through the shared pipeline in `src/lib/api/` (`withSession` → `validateBody` → `sanitizeObject`) before reaching business logic. Every response body is wrapped by the envelope builders in `src/lib/api/envelope.ts`. Do not invent parallel envelope or pipeline implementations.
- **Feature Slicing:** Business logic (schemas, services, handlers) lives under `src/features/<domain>/`. Route Handlers in `src/app/api/v1/` are thin transport layers that delegate to feature services — they must not contain domain rules directly.

## 3. Secure-by-Default Principles & XSS Protection

Fintracko handles sensitive financial data. You must enforce strict security practices:

- **No Hardcoded Secrets:** Never hardcode API keys, secrets, tokens, or credentials. Use Next.js environment variables (`.env.local`, ensuring private keys do not have the `NEXT_PUBLIC_` prefix). `.env.example` is the committed template and must stay free of real values.
- **Data Validation & Input Sanitization:** Validate all incoming payloads (Server Actions, Route Handlers, or form submissions) using strict Zod v4 schema validation via `validateBody()`. For any field that may carry user-supplied strings, route the payload through `sanitizeObject()` / `sanitizeString()` in `src/lib/api/sanitize.ts` (powered by `isomorphic-dompurify`) before any business logic or ORM operation. The sanitize stage is mandatory and must never be skipped, even for "trusted" internal callers.
- **Anti-XSS in Rendering:** Next.js safely escapes React text children by default. However, you must NEVER use `dangerouslySetInnerHTML` or dynamic `href` attributes with `javascript:` pseudo-protocols unless the content has been rigorously sanitized using a trusted library (e.g., `isomorphic-dompurify`).
- **Anti-IDOR / Multi-Tenancy:** Every workspace-scoped query MUST compound-filter on `WorkspaceMember` by both `workspaceId` and `userId`. Single-key lookups that leak cross-tenant data are prohibited.
- **Transactional Integrity:** Any mutation that touches more than one row or model (e.g., creating `Profile` + `Workspace` + `WorkspaceMember`, or `FinancialTransaction` + delta updates on `FinancialAccount`) MUST run inside a Prisma `$transaction` block.
- **Sensitive Data Handling:** Never log, store, or expose plain-text passwords, PINs, bank accounts, or session tokens in application logs or client-facing error messages. Server errors degrade to safe envelopes (`failure()` / `failureWithStatus()`) — never let raw exception text leak to the client.

## 4. Quality Assurance & Performance

- **Error Handling:** Use standard HTTP status codes through the `src/lib/api/envelope.ts` builders (`success`, `successWithStatus`, `failure`, `failureWithStatus`, `validationFailure`) and `HTTP_STATUS_BY_CODE`. Never let unhandled exceptions leak to the client — `validateBody()` already degrades throwing `.parse` calls to a `400` / `422` envelope; Route Handlers must preserve the same discipline.
- **Performance Optimization:** Optimize database fetching to avoid N+1 query problems by using appropriate Prisma relation includes and `select` projections. Push aggregation (monthly sums, budget utilization, net-worth trends) into PostgreSQL via Prisma aggregate/groupBy rather than in-memory post-processing.
- **Code Quality:** Write clean, production-ready code with proper error handling and validation. Run `npm run lint` before marking any `TASK_ROADMAP.md` task as complete.

## 5. Continuous Documentation Sync (Strict & Non-Negotiable)

The documentation under `docs/` is a binding contract that other agents, reviewers, and future-you will rely on. Letting it drift from the code is a defect as severe as a failing build.

- **Read Before Write:** Before making any codebase change — and again before updating any document — the Agent MUST first read the related documentation end-to-end. Never edit a doc you have not read in full for the current task.
- **Auto-Sync on Every Change:** Whenever the Agent modifies the codebase (a new file, a refactored module, an API contract change, a schema migration, a dependency bump, or any step within a `TASK_ROADMAP.md` phase), it MUST — without being prompted — update every document impacted by that change. This is mandatory, not optional, and applies even when the user only asked for a "code" change.
- **Relevant-Only Updates:** Each document has a core purpose. Keep updates strictly scoped to that purpose. Do not overflow marketing content into `ARCHITECTURE.md`, do not duplicate roadmap status prose into `IMPLEMENTATION_LOG.md`, and do not backfill product requirements into `AGENT_RULES.md`. If a change does not affect a given document's scope, leave that document untouched.
- **Documents to Keep in Sync (non-exhaustive, by impact):**
  - `docs/core/AGENT_RULES.md` — when tooling, versions, test conventions, security pipeline, or agent workflows change.
  - `docs/core/PROJECT_STRUCTURE.md` — when files, route groups, feature modules, or `lib/` helpers are added/removed/renamed, or a phase goes live.
  - `docs/core/DESIGN_SYSTEM.md` — when tokens, components, or visual conventions change.
  - `docs/architecture/ARCHITECTURE.md` — when domain models, multi-tenancy rules, data flows, or system boundaries change.
  - `docs/architecture/API_SPECS.md` — when any `src/app/api/v1/**` Route Handler is added, removed, or its request/response contract changes.
  - `docs/product/PRD_MVP1.md` — only when product scope or accepted behavior changes (never for implementation detail).
  - `docs/product/TASK_ROADMAP.md` — update the task's status checkbox and add a one-line resolution pointer only; the full resolution narrative lives in `IMPLEMENTATION_LOG.md`.
  - `docs/product/IMPLEMENTATION_LOG.md` — append the resolution narrative (date, what changed, why, test tally, follow-ups) for every completed task step.
- **Single Source of Truth per Fact:** Never duplicate the same fact long-form across documents. State it once in the authoritative doc and reference it elsewhere (e.g., `[`AGENT_RULES.md`](../core/AGENT_RULES.md) §4`). Divergent copies are a bug.
- **Verification at Completion:** A `TASK_ROADMAP.md` step is not "Complete" until (a) tests/lint pass AND (b) every impacted document has been updated and re-read. The Agent must explicitly confirm both in its completion summary.
