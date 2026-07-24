# Engineering Architecture & Database Schema - Fintracko

## 1. Tech Stack (Production Ready - $0 Cost Infrastructure)

- **Framework:** Next.js 16 (App Router, React 19) deployed on Vercel (Free Tier).
- **Styling:** Tailwind CSS 4 (Utility-first CSS, processed at build-time via `@tailwindcss/postcss`).
- **UI Components:** shadcn/ui (Radix UI primitives + Tailwind, new-york variant, directly injected into the source code for maximum customizability and Server Components compatibility). All components carry `data-slot` attributes for deterministic DOM querying.
- **Database:** PostgreSQL 17 hosted on Supabase (Free Tier, 500MB Baseline). Local development uses the Supabase CLI Docker stack; non-MVP services (Auth, Realtime, Storage, Analytics, Connection Pooler) are trimmed in [`supabase/config.toml`](supabase/config.toml:1).
- **Authentication:** Better Auth (v1.x) leveraging Google & GitHub OAuth, bound to Prisma via the `prismaAdapter` (`postgresql` provider).
  - **Security Enforcement:** The production `signIn` callback ([`src/lib/auth.ts:92`](src/lib/auth.ts:92)) rejects OAuth payloads strictly when `emailVerified === false` and passes `null`/`undefined` through unmolested (treating them as "unknown"). The co-located unit-test helper in [`src/lib/auth.test.ts:112`](src/lib/auth.test.ts:112) additionally rejects `null` for deterministic test outcomes, while still allowing `undefined`. Account linking disabled (`account.accountLinking.enabled: false`).
  - **Verification Model:** A dedicated `Verification` table backs Better Auth's `verification` model (OAuth/email verification token round-trip). It is owned and mutated exclusively by the Better Auth runtime.
- **Database Access:** Prisma 7 ORM for schema-first modeling and type-safe queries. The client is emitted to `./generated/prisma/` (git-ignored) and connection management uses the `@prisma/adapter-pg` driver adapter (`PrismaPg`); CLI configuration lives in [`prisma.config.ts`](prisma.config.ts:1) (the `datasource.url` block was removed from the schema in Prisma 7).
- **Validation:** Zod 4 for request payload schema validation.
- **Testing Framework:** Vitest 4 + React Testing Library + jest-dom (Chosen for ultra-fast ESM performance, native TypeScript support, and seamless Next.js testing integration). All tests are co-located next to their target files using the `*.test.ts` / `*.test.tsx` naming pattern.

---

## 2. Database Schema Design (Prisma-Compliant, Multi-Schema)

The database utilizes a multi-schema strategy to separate authentication data from core business logic:

- **`ft_auth`**: Stores Better Auth-owned tables (`User`, `AuthAccount`, `Session`, `Verification`).
- **`ft_core`**: Stores Fintracko business logic tables (`Profile`, `Workspace`, `WorkspaceMember`, `FinancialAccount`, `Category`, `SubCategory`, `Budget`, `FinancialTransaction`).

### ft_auth Schema (Better Auth)

#### User Table

Tracks authenticated users. This table doubles as the Better Auth identity table; its field contract is intentionally aligned with Better Auth's Prisma adapter requirements so that the OAuth integration (Task 2.2) operates against the same source-of-truth table without a parallel identity store.

- **id:** String (UUID, Primary Key)
- **email:** String (Unique Key, Indexed for login lookups)
- **name:** String
- **emailVerified:** Boolean (Non-nullable. Stamps the `email_verified` claim returned by the OAuth provider — `true` when the provider confirmed the email, `false` otherwise. Per the security enforcement pipeline, the [`signIn`](src/lib/auth.ts:92) callback rejects payloads where `emailVerified === false`, aborting the session in Task 2.2.)
- **image:** String (Nullable)
- **createdAt:** DateTime (Indexed for chronological sorting)
- **updatedAt:** DateTime (Required by Better Auth for session refresh / touch-on-login behavior.)

#### AuthAccount Table

Stores OAuth provider identity linkage records. This table is owned and mutated exclusively by Better Auth; application code must never write to it directly. The name `AuthAccount` (not `Account`) is intentional — it avoids a naming collision with the financial `Account` table below. The mapping is wired via Better Auth's `modelMapping` configuration during Task 2.2.

- **id:** String (UUID, Primary Key)
- **userId:** String (Foreign Key -> User.id, On Delete Cascade, Indexed)
- **providerId:** String (OAuth provider identifier, e.g., "google" | "github")
- **accountId:** String (OAuth provider's internal user id)
- **accessToken:** String (Nullable)
- **refreshToken:** String (Nullable)
- **accessTokenExpiresAt:** DateTime (Nullable)
- **refreshTokenExpiresAt:** DateTime (Nullable)
- **scope:** String (Nullable)
- **idToken:** String (Nullable)
- **password:** String (Nullable. Always `null` for Fintracko — passwords are explicitly disabled per the OAuth-only login policy in `PRD_MVP1.md`. The column is retained to satisfy the Better Auth adapter's compiled schema contract.)
- **createdAt:** DateTime
- **updatedAt:** DateTime
- **Compound Unique Key:** [providerId, accountId] (Prevents duplicate identity linkage for the same provider-user pair.)

#### Session Table

Stores HttpOnly authenticated session tokens issued by Better Auth. Owned and managed exclusively by the Better Auth runtime; application code reads the active session via Better Auth's server session helper, not via direct Prisma queries against this table.

- **id:** String (UUID, Primary Key)
- **userId:** String (Foreign Key -> User.id, On Delete Cascade, Indexed)
- **token:** String (Unique Key, the HttpOnly cookie value)
- **expiresAt:** DateTime
- **ipAddress:** String (Nullable)
- **userAgent:** String (Nullable)
- **createdAt:** DateTime
- **updatedAt:** DateTime

#### Verification Table

Stores short-lived verification tokens used by Better Auth during OAuth flows (e.g. OAuth state round-trip callbacks) and email-verification flows. Like `AuthAccount` and `Session`, this table is owned and mutated exclusively by the Better Auth runtime; application code must never write to it directly. It was added as a Task 2.2 fix — the Better Auth Prisma adapter previously failed OAuth sign-in with "Model verification does not exist in the database" because neither the model nor a backing table existed.

- **id:** String (UUID, Primary Key)
- **value:** String (The verification token value)
- **identifier:** String (A stable identifier Better Auth uses to look up a pending verification, typically `<provider>:<userId>` or an email hash. Indexed for fast lookups during the OAuth callback path.)
- **expiresAt:** DateTime
- **createdAt:** DateTime
- **updatedAt:** DateTime

### ft_core Schema (Business Logic)

#### Profile Table

Stores comprehensive user profile details. The presence of a record in this table implicitly indicates that the user has successfully completed the onboarding process.

- **id:** String (UUID, Primary Key)
- **userId:** String (Unique Key, Foreign Key -> User.id, On Delete Cascade)
- **phoneNumber:** String (Nullable)
- **company:** String (Nullable)
- **bio:** String (Nullable)
- **dateOfBirth:** DateTime (Nullable)
- **gender:** String (Nullable) (Type: `Gender` enum → "MALE", "FEMALE", "OTHER". Declared as a Prisma `enum Gender` in [`schema.prisma`](prisma/schema.prisma:92), not a free-form string.)
- **currencyPreference:** String (Default: "USD", e.g., "IDR", "USD", "EUR")
- **languagePreference:** String (Default: "en", e.g., "en", "id", "es". Stores the user's preferred UI display language code for client-side internationalization resolution.)
- **createdAt:** DateTime
- **updatedAt:** DateTime

#### Workspace Table

The root boundary for multi-tenancy isolation.

- **id:** String (UUID, Primary Key)
- **name:** String
- **createdAt:** DateTime
- **ownerId:** String (Foreign Key -> User.id, Indexed for quick lookup of owned workspaces)

#### WorkspaceMember Table

Handles collaboration access control.

- **id:** String (UUID, Primary Key)
- **workspaceId:** String (Foreign Key -> Workspace.id, On Delete Cascade, Indexed)
- **userId:** String (Foreign Key -> User.id, On Delete Cascade, Indexed)
- **role:** String (Enum: "OWNER", "COLLABORATOR")
- **Compound Unique Key:** [workspaceId, userId] (Ensures a user is only added once per workspace)

#### FinancialAccount Table (Formerly Account)

Tracks financial nodes (e.g., Bank, Cash) with explicit initial balance decoupling and delta tracking.

- **id:** String (UUID, Primary Key)
- **workspaceId:** String (Foreign Key -> Workspace.id, On Delete Cascade, Indexed)
- **name:** String
- **initialBalance:** Decimal (Precision: 18, Scale: 4. Editable by user for adjustments).
- **netTransactionSum:** Decimal (Precision: 18, Scale: 4. Automatically adjusted on every transaction mutation. Represents the total delta accumulated from all transactions associated with this account).
- **createdAt:** DateTime
- **updatedAt:** DateTime (Tracks the most recent adjustment to the account configuration or balance delta.)
  - _Formula:_ `Final Balance = initialBalance + netTransactionSum`.
- **Compound Unique Key:** [workspaceId, name] (Prevents duplicate account names in the same workspace)

#### Category Table (Level 1)

Parent classification for transactions.

- **id:** String (UUID, Primary Key)
- **workspaceId:** String (Foreign Key -> Workspace.id, On Delete Cascade, Indexed)
- **name:** String
- **type:** String (Enum: "INCOME", "EXPENSE", "TRANSFER", Indexed for filtering)
- **createdAt:** DateTime
- **updatedAt:** DateTime

#### SubCategory Table (Level 2)

Detailed classification for transactions and budget targets.

- **id:** String (UUID, Primary Key)
- **workspaceId:** String (Foreign Key -> Workspace.id, On Delete Cascade, Indexed)
- **categoryId:** String (Foreign Key -> Category.id, On Delete Cascade, Indexed)
- **name:** String
- **createdAt:** DateTime
- **updatedAt:** DateTime

#### Budget Table

Enforces spending limits strictly on Level 2 sub-categories.

- **id:** String (UUID, Primary Key)
- **workspaceId:** String (Foreign Key -> Workspace.id, On Delete Cascade, Indexed)
- **subCategoryId:** String (Foreign Key -> SubCategory.id, Indexed)
- **amount:** Decimal (Precision: 18, Scale: 4)
- **interval:** String (Enum: "MONTHLY", "YEARLY")
- **Compound Unique Key:** [subCategoryId, interval] (Ensures only one active budget per interval for a specific sub-category)
- **createdAt:** DateTime
- **updatedAt:** DateTime (Tracks threshold adjustments for audit traceability.)

#### FinancialTransaction Table (Formerly Transaction)

Core ledger for financial mutations.

- **id:** String (UUID, Primary Key)
- **workspaceId:** String (Foreign Key -> Workspace.id, On Delete Cascade, Indexed)
- **type:** String (Enum: "INCOME", "EXPENSE", "TRANSFER", Indexed)
- **amount:** Decimal (Precision: 18, Scale: 4)
- **subCategoryId:** String (Foreign Key -> SubCategory.id, Indexed)
- **date:** DateTime (Indexed for time-series aggregation and reporting)
- **sourceAccountId:** String (Nullable, Foreign Key -> `FinancialAccount.id`, Indexed, mandatory for Expense/Transfer, `On Delete: Restrict`)
- **destinationAccountId:** String (Nullable, Foreign Key -> `FinancialAccount.id`, Indexed, mandatory for Income/Transfer, `On Delete: Restrict`)
- **description:** String (Nullable)
- **payeePayer:** String (Nullable, Indexed for autocomplete text search)
- **tags:** String[] (Array of strings, optionally indexed using GIN in PostgreSQL for array searches)
- **attachmentUrl:** String (Nullable, references external Imgur URLs)
- **createdAt:** DateTime
- **updatedAt:** DateTime (Critical for financial audit trails; the application will prefer immutable ledger append reversal patterns where possible, but any direct PUT/PATCH mutation must stamp this field.)

---

## 3. Core Architectural Safeguards & Guards

- **Onboarding & Auth Guard (Server Component Layout Wrapper):** ✅ Live (Task 3.1)
  - Instead of using global Next.js Middleware which runs on the Edge runtime (limiting direct database connections), authentication and onboarding status checks are implemented via a React Server Component layout wrapper ([`src/components/guards/onboarding-guard-wrapper.tsx`](src/components/guards/onboarding-guard-wrapper.tsx)) wrapping the children of all non-public pages. It is mounted by both [`src/app/(dashboard)/layout.tsx`](<src/app/(dashboard)/layout.tsx>) (every private dashboard route) and [`src/app/(onboarding)/layout.tsx`](<src/app/(onboarding)/layout.tsx>) (so already-onboarded users hitting `/onboarding` are bounced back to the dashboard).
  - **Guard Logic Flow:**
    1. Read request headers via `next/headers`, then lazily resolve the Better Auth singleton ([`src/lib/auth.ts`](src/lib/auth.ts)) and the Prisma singleton ([`src/lib/db.ts`](src/lib/db.ts)) via dynamic `import()` — this keeps the module-load graph small and lets co-located unit tests run Prisma-free.
    2. Call `auth.api.getSession({ headers })`. If no session resolves, or the session lacks `user.id`, instantly perform a server-side `redirect('/login')` from `next/navigation`.
    3. `db.profile.findUnique({ where: { userId } })` checks for a `Profile` record linked to the authenticated `userId`.
    4. If the `Profile` record **does not exist**, the user is classified as "Not Onboarded" and is immediately server-side `redirect('/onboarding')`.
    5. If the `Profile` record exists, the component renders the layout `children` normally via a `<>{children}</>` fragment.
  - **Note:** This guard governs **page-route** access (Server Component redirects). The API-specific `403 ONBOARDING_REQUIRED` fallthrough in API_SPECS.md §2 governs **REST endpoint** access for the workspace-tenant-guarded routes coming in Phase 3.3+. The live Task 3.2 endpoint (`POST /api/v1/onboarding/complete`, API_SPECS.md §3.0) instead short-circuits on an _already-existing_ `Profile` via its transaction failure path rather than via a pre-check guard.
- **API-First Architecture (RESTful Route Handlers):**
  - All data mutations and retrievals MUST utilize standard REST APIs via Next.js Route Handlers (`app/api/...`) instead of Server Actions to ensure modular decoupling and effortless extensibility for future platforms (e.g., MVP 2 Mobile App).
  - **API Security Protocol:** All endpoints require strict Session validation (Better Auth tokens), rate limiting implementation, request payload validation using Zod schemas, and strict CORS configuration restricting external domain access.
- **Query Hardening (Anti-IDOR):** Every database query within the Route Handlers MUST look up records using BOTH the specific resource ID and the validated active `workspaceId` derived from the session membership check to prevent Insecure Direct Object Reference vulnerabilities.
- **Atomic Balance Updates:** Balance updates must follow strict mathematical invariants within a Prisma `$transaction` block. Any transaction creation, deletion, or adjustment must modify the `netTransactionSum` of the associated `FinancialAccount`. The `initialBalance` remains separate and is only touched when the user explicitly modifies the account settings.
- **Financial Precision:** All financial mutations and calculations MUST use database `Decimal(18,4)` fields to eliminate JavaScript floating-point rounding errors.
- **Database Transaction:** All financial mutations and calculations MUST be wrapped in a Prisma `$transaction` block to ensure atomicity and consistency.

---

## 4. Feature-Specific Architecture Designs

### Workspace Templates Storage

- **Constant-Based Storage:** Workspace Templates (e.g., _Personal Finance Starter_, _SME/Business Template_) are explicitly stored as static TypeScript constants inside the application codebase (e.g., `constants/workspace-templates.ts`) instead of being stored in the database.
- **Execution Logic:** When a user initiates workspace creation during onboarding or configuration, the backend reads the structural object from the static file and performs a high-performance bulk insert (`createMany`) into the `Category` and `SubCategory` tables for that specific workspace ID. This completely eliminates unnecessary database read-overhead and allows painless structural updates via standard Git version control.

### Autocomplete Architecture for Optional Fields

To provide real-time autocomplete inputs for optional parameters like `payeePayer` and `tags` without overloading the database tier:

- **Database Optimization:** The `payeePayer` field is indexed to facilitate high-speed `DISTINCT` keyword scan queries.
- **Debounced API Fetching:** The frontend input field implements a strict `debounce` handler (e.g., 300ms window delay). The application will only trigger a `GET /api/v1/workspaces/[workspaceId]/autocomplete?field=payeePayer&query=xyz` request after the user pauses typing.
- **Client-Side Caching:** Fetched suggestions are cached in memory on the client side using a state synchronization library (e.g., TanStack Query / SWR) with a short Time-To-Live (TTL) configuration to drastically minimize redundant network rounds.

### Internationalization (i18n) Architecture

Fintracko respects the per-user `languagePreference` stored on the `Profile` table to deliver a localized experience.

- **Preference Source of Truth:** The `languagePreference` field (default `"en"`) is collected during mandatory onboarding and is editable via Profile Management. Supported language codes initially include `en` (English) and `id` (Bahasa Indonesia), with the list extensible as new translations are contributed.
- **Translation Catalog Storage:** Translation message catalogs MUST be stored as static JSON files inside the application codebase (e.g., `src/locales/{lang}/common.json`, `src/locales/{lang}/dashboard.json`) — never in the database — to preserve build-time optimization and version-controlled rollback capability.
- **Client-Side Resolution:** The application resolves the active language on route segment mount inside the `(dashboard)` and `(onboarding)` route groups. The resolved `languagePreference` is passed into the Next.js `locale` context, hydrating a lightweight i18n client (e.g., `next-intl` or equivalent) bound globally via the root layout session provider.
- **Server Component Compliance:** All user-facing strings rendered inside Server Components MUST be wrapped via the i18n message accessor (e.g., `t('key')`) — hardcoded English fallbacks are prohibited on private authenticated screens.
- **Backend Independence:** REST API Route Handlers return locale-independent data contracts (string-serialized decimals, ISO timestamps, enum codes) and NEVER perform server-side translation. The client is solely responsible for formatting currency, dates, and labels according to the active `languagePreference`.

---

## 5. Required Environment Variables (.env.local)

(Configuration variables for Better Auth client secrets, Supabase connection strings, and Imgur API keys are managed here).

- **`DATABASE_URL`** — PostgreSQL connection string consumed by Prisma. For local development, this points to the Supabase CLI Docker instance (`postgresql://postgres:postgres@localhost:54322/postgres`). For staging/production, this points to the Supabase Cloud project connection string (e.g., `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`).
- Better Auth client secrets (`AUTH_GOOGLE_*`, `AUTH_GITHUB_*`) and `BETTER_AUTH_SECRET` — populated in Task 2.2.
- `IMGUR_CLIENT_ID` — populated in Task 5.2.
- See `.env.example` in the repository root for the authoritative placeholder list; `.env.local` is git-ignored per `.rooignore`.

---

## 6. Local Development Database Workflow (Supabase CLI + Docker)

To provide a fast, isolated, and deterministic local development loop without depending on remote infrastructure:

1. **Engine:** The Supabase CLI (installed as a project devDependency) orchestrates a local PostgreSQL instance inside Docker. The developer does not need a cloud account for local schema iteration.
2. **Bootstrap:** Run `npm run supabase:start` (which executes `supabase start`) to provision the local Postgres container. The CLI writes its configuration under the version-controlled `supabase/` directory (created via `supabase init`).
3. **Migration Sync:** Schema migrations are authored in Prisma (`prisma migrate dev --name <change>`) and applied against the local Postgres. The same migration files apply verbatim against the Supabase Cloud project via `prisma migrate deploy`, guaranteeing zero drift between environments.
4. **Reset:** `npm run supabase:stop` tears down the Docker stack; `npm run db:reset` issues `prisma migrate reset` for a clean-slate test state.
5. **Production Parity:** Local Supabase ships the same PostgreSQL major version as Supabase Cloud, ensuring migration compatibility. Supabase Auth/Storage/Realtime features are not exercised locally in MVP1 (Better Auth manages its own OAuth flow); only the Postgres engine is required.
