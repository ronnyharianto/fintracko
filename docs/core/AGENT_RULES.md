# Fintracko AI Agent Core Rules & Guidelines

You are an expert software engineer and architect AI agent responsible for building "Fintracko", a financial SaaS application. You must strictly adhere to the following rules, constraints, and engineering practices.

## 1. General Principles

- **Conciseness & Completeness:** Write clean, production-ready, and well-structured code. Do not omit necessary logic or use placeholders like `// TODO: implement later` unless explicitly requested.
- **English Language Consistency:** All source code components—including variable names, function names, class names, file names, database tables/columns, API endpoints, code comments, and inline documentation—MUST be written in English.

## 2. Tech Stack & Architecture Baseline

The tech baseline is fixed by `package.json`. Do not introduce a dependency, version range, or runtime contract that contradicts the installed versions below without explicit approval and re-verification of the full unit-test suite.

- **Framework:** Next.js 16 (App Router) on React 19. Leverage Server Components by default, and use Client Components (`'use client'`) strictly when interactivity or browser APIs are required. Charts, forms, and interactive widgets are Client Components; layouts and data-fetching shells remain Server Components.
- **TypeScript:** Strict mode (`tsconfig.json`). Use the `@/*` path alias (resolves to `./src/*`) for all intra-`src` imports — never use deep relative paths that cross feature boundaries when an alias is available.
- **Styling:** Tailwind CSS v4 via `@tailwindcss/postcss` in `postcss.config.mjs`, with Fintracko teal design tokens defined in `src/app/globals.css`. Compose atomic styles with `shadcn/ui` (new-york variant) atoms from `src/components/ui/`, merged through the `cn()` helper in `src/lib/utils.ts`.
- **Forms & Validation:** `react-hook-form` in Client Components, resolved through `@hookform/resolvers/zod`. All input validation — on both client and server — uses **Zod v4** schemas. Domain schemas live under `src/features/<domain>/schemas.ts` (or `src/features/<domain>/schemas/`).
- **Authentication:** Better Auth (`src/lib/auth.ts`) with the Prisma adapter, OAuth-only (Google + GitHub), `account.accountLinking.enabled: false`, and a `signIn` callback rejecting `emailVerified === false`. Browser-facing auth uses `src/lib/auth-client.ts`. Never wire ad-hoc credential/password flows.
- **Data Access:** Always use Prisma 7 (`@prisma/client` + `@prisma/adapter-pg`) via the `globalThis`-cached singleton in `src/lib/db.ts`. The generator emits to `generated/prisma` (git-ignored) and the datasource URL is resolved by `prisma.config.ts` via `dotenv` — it is no longer declared in `schema.prisma`. Avoid raw SQL queries unless explicitly approved; when unavoidable, use parameterized Prisma `$queryRaw` / `$executeRaw` to guarantee SQL-injection protection. The 12-model schema in `prisma/schema.prisma` is the source-of-truth data contract.
- **REST API Surface:** All network endpoints live under `src/app/api/v1/` and MUST run through the shared pipeline in `src/lib/api/` (`withSession` → `validateBody` → `sanitizeObject`) before reaching business logic. Every response body is wrapped by the envelope builders in `src/lib/api/envelope.ts`. Do not invent parallel envelope or pipeline implementations.
- **Feature Slicing:** Business logic (schemas, services, handlers) lives under `src/features/<domain>/`. Route Handlers in `src/app/api/v1/` are thin transport layers that delegate to feature services — they must not contain domain rules directly.

## 3. Secure-by-Default Principles & XSS Protection

Fintracko handles sensitive financial data. You must enforce strict security practices:

- **No Hardcoded Secrets:** Never hardcode API keys, secrets, tokens, or credentials. Use Next.js environment variables (`.env.local`). `.env.example` is the committed template and must stay free of real values.
- **Data Validation & Input Sanitization:** Validate all incoming payloads (Route Handlers or form submissions) using strict Zod v4 schema validation via `validateBody()`. For any field that may carry user-supplied strings, route the payload through `sanitizeObject()` / `sanitizeString()` in `src/lib/api/sanitize.ts` (powered by `isomorphic-dompurify`) before any business logic or ORM operation. The sanitize stage is mandatory and must never be skipped, even for "trusted" internal callers.
- **Anti-XSS in Rendering:** Next.js safely escapes React text children by default. However, you must NEVER use `dangerouslySetInnerHTML` or dynamic `href` attributes with `javascript:` pseudo-protocols unless the content has been rigorously sanitized using a trusted library (e.g., `isomorphic-dompurify`).
- **Anti-IDOR / Multi-Tenancy:** Every workspace-scoped query MUST compound-filter on `WorkspaceMember` by both `workspaceId` and `userId`. Single-key lookups that leak cross-tenant data are prohibited.
- **Transactional Integrity:** Any mutation that touches more than one row or model (e.g., creating `Profile` + `Workspace` + `WorkspaceMember`, or `FinancialTransaction` + delta updates on `FinancialAccount`) MUST run inside a Prisma `$transaction` block.
- **Sensitive Data Handling:** Never log, store, or expose plain-text passwords, PINs, bank accounts, or session tokens in application logs or client-facing error messages. Server errors degrade to safe envelopes (`failure()` / `failureWithStatus()`) — never let raw exception text leak to the client.

## 4. Quality Assurance & Performance

- **Error Handling:** Use standard HTTP status codes through the `src/lib/api/envelope.ts` builders (`success`, `successWithStatus`, `failure`, `failureWithStatus`, `validationFailure`) and `HTTP_STATUS_BY_CODE`. Never let unhandled exceptions leak to the client — `validateBody()` already degrades throwing `.parse` calls to a `400` / `422` envelope; Route Handlers must preserve the same discipline.
- **Performance Optimization:** Optimize database fetching to avoid N+1 query problems by using appropriate Prisma relation includes and `select` projections. Push aggregation (monthly sums, budget utilization, net-worth trends) into PostgreSQL via Prisma aggregate/groupBy rather than in-memory post-processing.
- **Code Quality:** Write clean, production-ready code with proper error handling and validation.
