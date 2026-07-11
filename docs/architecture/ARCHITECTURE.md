# Engineering Architecture & Database Schema - Fintracko

## 1. Tech Stack (Production Ready - $0 Cost Infrastructure)

* **Framework:** Next.js (App Router) deployed on Vercel (Free Tier).
* **Styling:** Tailwind CSS (Utility-first CSS, processed at build-time).
* **UI Components:** shadcn/ui (Radix UI primitives + Tailwind, directly injected into the source code for maximum customizability and Server Components compatibility).
* **Database:** PostgreSQL hosted on Supabase (Free Tier, 500MB Baseline + Realtime capability).
* **Authentication:** Better Auth leveraging Google & GitHub OAuth.
    * **Security Enforcement:** Explicitly reject OAuth payloads if `email_verified` is false. Do NOT use unsafe global account linking.
* **Database Access:** Prisma ORM for schema-first modeling and type-safe queries.
* **Testing Framework:** Vitest + React Testing Library (Chosen for ultra-fast ESM performance, native TypeScript support, and seamless Next.js testing integration).

---

## 2. Database Schema Design (Prisma-Compliant)

### User Table
Tracks authenticated users.
* **id:** String (UUID, Primary Key)
* **email:** String (Unique Key, Indexed for login lookups)
* **name:** String
* **image:** String (Nullable)
* **createdAt:** DateTime (Indexed for chronological sorting)

### Profile Table
Stores comprehensive user profile details. The presence of a record in this table implicitly indicates that the user has successfully completed the onboarding process.
* **id:** String (UUID, Primary Key)
* **userId:** String (Unique Key, Foreign Key -> User.id, On Delete Cascade)
* **phoneNumber:** String (Nullable)
* **company:** String (Nullable)
* **bio:** String (Nullable)
* **dateOfBirth:** DateTime (Nullable)
* **gender:** String (Nullable) (Enum: "MALE", "FEMALE", "OTHER")
* **currencyPreference:** String (Default: "USD", e.g., "IDR", "USD", "EUR")
* **languagePreference:** String (Default: "en", e.g., "en", "id", "es". Stores the user's preferred UI display language code for client-side internationalization resolution.)
* **createdAt:** DateTime
* **updatedAt:** DateTime

### Workspace Table
The root boundary for multi-tenancy isolation.
* **id:** String (UUID, Primary Key)
* **name:** String
* **createdAt:** DateTime
* **ownerId:** String (Foreign Key -> User.id, Indexed for quick lookup of owned workspaces)

### WorkspaceMember Table
Handles collaboration access control.
* **id:** String (UUID, Primary Key)
* **workspaceId:** String (Foreign Key -> Workspace.id, On Delete Cascade, Indexed)
* **userId:** String (Foreign Key -> User.id, On Delete Cascade, Indexed)
* **role:** String (Enum: "OWNER", "COLLABORATOR")
* **Compound Unique Key:** [workspaceId, userId] (Ensures a user is only added once per workspace)

### Account Table
Tracks financial nodes (e.g., Bank, Cash) with explicit initial balance decoupling and delta tracking.
* **id:** String (UUID, Primary Key)
* **workspaceId:** String (Foreign Key -> Workspace.id, On Delete Cascade, Indexed)
* **name:** String
* **initialBalance:** Decimal (Precision: 18, Scale: 4. Editable by user for adjustments).
* **netTransactionSum:** Decimal (Precision: 18, Scale: 4. Automatically adjusted on every transaction mutation. Represents the total delta accumulated from all transactions associated with this account).
* **createdAt:** DateTime
* **updatedAt:** DateTime (Tracks the most recent adjustment to the account configuration or balance delta.)
    * *Formula:* `Final Balance = initialBalance + netTransactionSum`.
* **Compound Unique Key:** [workspaceId, name] (Prevents duplicate account names in the same workspace)

### Category Table (Level 1)
Parent classification for transactions.
* **id:** String (UUID, Primary Key)
* **workspaceId:** String (Foreign Key -> Workspace.id, On Delete Cascade, Indexed)
* **name:** String
* **type:** String (Enum: "INCOME", "EXPENSE", "TRANSFER", Indexed for filtering)
* **createdAt:** DateTime
* **updatedAt:** DateTime

### SubCategory Table (Level 2)
Detailed classification for transactions and budget targets.
* **id:** String (UUID, Primary Key)
* **workspaceId:** String (Foreign Key -> Workspace.id, On Delete Cascade, Indexed)
* **categoryId:** String (Foreign Key -> Category.id, On Delete Cascade, Indexed)
* **name:** String
* **createdAt:** DateTime
* **updatedAt:** DateTime

### Budget Table
Enforces spending limits strictly on Level 2 sub-categories.
* **id:** String (UUID, Primary Key)
* **workspaceId:** String (Foreign Key -> Workspace.id, On Delete Cascade, Indexed)
* **subCategoryId:** String (Foreign Key -> SubCategory.id, Indexed)
* **amount:** Decimal (Precision: 18, Scale: 4)
* **interval:** String (Enum: "MONTHLY", "YEARLY")
* **Compound Unique Key:** [subCategoryId, interval] (Ensures only one active budget per interval for a specific sub-category)
* **createdAt:** DateTime
* **updatedAt:** DateTime (Tracks threshold adjustments for audit traceability.)

### Transaction Table
Core ledger for financial mutations.
* **id:** String (UUID, Primary Key)
* **workspaceId:** String (Foreign Key -> Workspace.id, On Delete Cascade, Indexed)
* **type:** String (Enum: "INCOME", "EXPENSE", "TRANSFER", Indexed)
* **amount:** Decimal (Precision: 18, Scale: 4)
* **subCategoryId:** String (Foreign Key -> SubCategory.id, Indexed)
* **date:** DateTime (Indexed for time-series aggregation and reporting)
* **sourceAccountId:** String (Nullable, Foreign Key -> Account.id, Indexed, mandatory for Expense/Transfer)
* **destinationAccountId:** String (Nullable, Foreign Key -> Account.id, Indexed, mandatory for Income/Transfer)
* **description:** String (Nullable)
* **payeePayer:** String (Nullable, Indexed for autocomplete text search)
* **tags:** String[] (Array of strings, optionally indexed using GIN in PostgreSQL for array searches)
* **attachmentUrl:** String (Nullable, references external Imgur URLs)
* **createdAt:** DateTime
* **updatedAt:** DateTime (Critical for financial audit trails; the application will prefer immutable ledger append reversal patterns where possible, but any direct PUT/PATCH mutation must stamp this field.)

---

## 3. Core Architectural Safeguards & Guards

* **Onboarding & Auth Guard (Server Component Layout Wrapper):**
    * Instead of using global Next.js Middleware which runs on the Edge runtime (limiting database connection direct querying), authentication and onboarding status checks are implemented via a React Server Component layout wrapper wrapping the children of all non-public pages (e.g., `(dashboard)/layout.tsx`).
    * **Guard Logic Flow:**
        1. Retrieve the current active session via Better Auth server session helper. If no session exists, instantly perform a server-side redirect (`redirect('/login')`).
        2. Query the database to check for the existence of a `Profile` record linked to the authenticated `userId`.
        3. If the `Profile` record **does not exist**, the user is classified as "Not Onboarded" and is immediately server-side redirected to `/onboarding`.
        4. If the `Profile` record exists, the component renders the layout `children` normally.
* **API-First Architecture (RESTful Route Handlers):**
    * All data mutations and retrievals MUST utilize standard REST APIs via Next.js Route Handlers (`app/api/...`) instead of Server Actions to ensure modular decoupling and effortless extensibility for future platforms (e.g., MVP 2 Mobile App).
    * **API Security Protocol:** All endpoints require strict Session validation (Better Auth tokens), rate limiting implementation, request payload validation using Zod schemas, and strict CORS configuration restricting external domain access.
* **Query Hardening (Anti-IDOR):** Every database query within the Route Handlers MUST look up records using BOTH the specific resource ID and the validated active `workspaceId` derived from the session membership check to prevent Insecure Direct Object Reference vulnerabilities.
* **Atomic Balance Updates:** Balance updates must follow strict mathematical invariants within a Prisma `$transaction` block. Any transaction creation, deletion, or adjustment must modify the `netTransactionSum` of the associated `Account`. The `initialBalance` remains separate and is only touched when the user explicitly modifies the account settings.
* **Financial Precision:** All financial mutations and calculations MUST use database `Decimal(18,4)` fields to eliminate JavaScript floating-point rounding errors.
* **Database Transaction:** All financial mutations and calculations MUST be wrapped in a Prisma `$transaction` block to ensure atomicity and consistency.

---

## 4. Feature-Specific Architecture Designs

### Workspace Templates Storage
* **Constant-Based Storage:** Workspace Templates (e.g., *Personal Finance Starter*, *SME/Business Template*) are explicitly stored as static TypeScript constants inside the application codebase (e.g., `constants/workspace-templates.ts`) instead of being stored in the database.
* **Execution Logic:** When a user initiates workspace creation during onboarding or configuration, the backend reads the structural object from the static file and performs a high-performance bulk insert (`createMany`) into the `Category` and `SubCategory` tables for that specific workspace ID. This completely eliminates unnecessary database read-overhead and allows painless structural updates via standard Git version control.

### Autocomplete Architecture for Optional Fields
To provide real-time autocomplete inputs for optional parameters like `payeePayer` and `tags` without overloading the database tier:
* **Database Optimization:** The `payeePayer` field is indexed to facilitate high-speed `DISTINCT` keyword scan queries.
* **Debounced API Fetching:** The frontend input field implements a strict `debounce` handler (e.g., 300ms window delay). The application will only trigger a `GET /api/v1/workspaces/[workspaceId]/autocomplete?field=payeePayer&query=xyz` request after the user pauses typing.
* **Client-Side Caching:** Fetched suggestions are cached in memory on the client side using a state synchronization library (e.g., TanStack Query / SWR) with a short Time-To-Live (TTL) configuration to drastically minimize redundant network rounds.

### Internationalization (i18n) Architecture
Fintracko respects the per-user `languagePreference` stored on the `Profile` table to deliver a localized experience.
* **Preference Source of Truth:** The `languagePreference` field (default `"en"`) is collected during mandatory onboarding and is editable via Profile Management. Supported language codes initially include `en` (English) and `id` (Bahasa Indonesia), with the list extensible as new translations are contributed.
* **Translation Catalog Storage:** Translation message catalogs MUST be stored as static JSON files inside the application codebase (e.g., `src/locales/{lang}/common.json`, `src/locales/{lang}/dashboard.json`) — never in the database — to preserve build-time optimization and version-controlled rollback capability.
* **Client-Side Resolution:** The application resolves the active language on route segment mount inside the `(dashboard)` and `(onboarding)` route groups. The resolved `languagePreference` is passed into the Next.js `locale` context, hydrating a lightweight i18n client (e.g., `next-intl` or equivalent) bound globally via the root layout session provider.
* **Server Component Compliance:** All user-facing strings rendered inside Server Components MUST be wrapped via the i18n message accessor (e.g., `t('key')`) — hardcoded English fallbacks are prohibited on private authenticated screens.
* **Backend Independence:** REST API Route Handlers return locale-independent data contracts (string-serialized decimals, ISO timestamps, enum codes) and NEVER perform server-side translation. The client is solely responsible for formatting currency, dates, and labels according to the active `languagePreference`.

---

## 5. Required Environment Variables (.env.local)
(Configuration variables for Better Auth client secrets, Supabase connection strings, and Imgur API keys are managed here).