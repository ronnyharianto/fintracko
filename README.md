# Fintracko

> **A financial SaaS application for personal finance and budget tracking.**
> Built with Next.js 16 (App Router), Tailwind CSS, shadcn/ui, Better Auth, Prisma 7, and Supabase.

---

## 🚀 Quick Start

### Prerequisites

| Tool                                                              | Min Version | Purpose                   |
| ----------------------------------------------------------------- | ----------- | ------------------------- |
| [Node.js](https://nodejs.org/)                                    | 20 LTS      | Runtime                   |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 24+         | Local Supabase (Postgres) |
| [Git](https://git-scm.com/)                                       | 2.40+       | Version control           |

### 1. Clone & Install

```bash
git clone <repo-url> fintracko
cd fintracko
npm install
```

### 2. Start Local Database (Supabase)

```bash
npm run supabase:start
```

This boots a local **PostgreSQL 17** database via Docker. The first run pulls images (~2 min); subsequent starts take ~10s.

> **💡 What services run?** The MVP only needs Postgres. We've trimmed non-essential Supabase services (realtime, edge functions, storage, analytics) in [`supabase/config.toml`](supabase/config.toml:1). You can inspect everything via **Supabase Studio** at [http://127.0.0.1:54323](http://127.0.0.1:54323).

### 3. Set Up Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` — the default values work for local dev:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"

# Better Auth (Task 2.2) — OAuth-only (Google + GitHub)
BETTER_AUTH_SECRET="generate-with:openssl rand -base64 32"
BETTER_AUTH_URL="http://localhost:3000"
AUTH_GOOGLE_ID="your-google-oauth-client-id"
AUTH_GOOGLE_SECRET="your-google-oauth-client-secret"
AUTH_GITHUB_ID="your-github-oauth-client-id"
AUTH_GITHUB_SECRET="your-github-oauth-client-secret"
```

> **💡 Auth env vars** are required for Task 2.2 (Better Auth Integration). Get Google credentials from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) and GitHub credentials from [GitHub Developer Settings](https://github.com/settings/developers). Configure the OAuth redirect URLs to `{BETTER_AUTH_URL}/api/v1/auth/callback/google` and `.../github`.

### 4. Apply Database Migrations

```bash
npx prisma generate
npx prisma migrate dev
```

### 5. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the app is live.

---

## 📜 Available Scripts

### Development

| Command         | Description                           |
| --------------- | ------------------------------------- |
| `npm run dev`   | Start Next.js dev server (`next dev`) |
| `npm run build` | Production build                      |
| `npm run start` | Start production server               |
| `npm run lint`  | Run ESLint                            |

### Testing

| Command            | Description               |
| ------------------ | ------------------------- |
| `npm run test`     | Run Vitest in watch mode  |
| `npm run test:run` | Run Vitest once (CI mode) |
| `npm run test:ui`  | Open Vitest UI dashboard  |

### Database (Prisma)

| Command                         | Description                              |
| ------------------------------- | ---------------------------------------- |
| `npm run prisma:generate`       | Generate Prisma Client from schema       |
| `npm run prisma:migrate`        | Create & apply a new migration           |
| `npm run prisma:migrate:deploy` | Apply pending migrations (CI/prod)       |
| `npm run prisma:studio`         | Open Prisma Studio (DB browser)          |
| `npm run db:push`               | Push schema directly (no migration file) |
| `npm run db:reset`              | Reset DB and re-run all migrations       |

### Database (Supabase CLI)

| Command                   | Description                       |
| ------------------------- | --------------------------------- |
| `npm run supabase:start`  | Start local Supabase Docker stack |
| `npm run supabase:stop`   | Stop local Supabase services      |
| `npm run supabase:status` | Show running services & URLs      |

---

## 📁 Project Structure

```
fintracko/
├── components.json            # shadcn/ui registry configuration
├── prisma/
│   ├── schema.prisma          # Database schema (source of truth)
│   ├── migrations/            # Auto-generated migration SQL
│   └── config.ts              # Prisma 7 CLI configuration
├── supabase/
│   └── config.toml            # Local Supabase service configuration
├── src/
│   ├── app/                   # Next.js App Router pages & layouts
│   │   ├── layout.tsx         # Root layout (pre-hydration theme script + Toaster provider)
│   │   ├── page.tsx           # Color-enhanced public landing page (renders marketing sections)
│   │   ├── page.test.tsx      # Landing page render tests
│   │   ├── globals.css        # Tailwind v4 + Fintracko teal design tokens (HSL channels, hsl()-wrapped in @theme inline)
│   │   ├── (marketing)/       # Marketing route group (shared NavBar + Footer layout)
│   │   │   ├── layout.tsx        # Marketing layout (NavBar + <main> + Footer)
│   │   │   ├── layout.test.tsx   # Marketing layout render & link contract tests
│   │   │   ├── privacy-policy/
│   │   │   │   ├── page.tsx       # Privacy policy legal page (metadata-driven)
│   │   │   │   └── page.test.tsx  # Privacy page render tests
│   │   │   └── terms-of-service/
│   │   │       ├── page.tsx       # Terms of service legal page (metadata-driven)
│   │   │       └── page.test.tsx  # Terms page render tests
│   │   ├── (auth)/              # Auth route group (no NavBar/Footer; noindex/nofollow)
│   │   │   ├── layout.tsx         # AuthLayout — FintrackoLogo brand link to "/", max-w-sm centered container
│   │   │   ├── layout.test.tsx   # AuthLayout render, brand link & metadata tests (5 tests)
│   │   │   ├── login/
│   │   │   │   ├── page.tsx       # Login page (Card + "Welcome back" + OAuthButtons + register link)
│   │   │   │   └── page.test.tsx # Login page render & metadata tests (6 tests)
│   │   │   └── register/
│   │   │       ├── page.tsx       # Register page (Card + "Create your account" + OAuthButtons + sign-in link)
│   │   │       └── page.test.tsx # Register page render & metadata tests (6 tests)
│   │   ├── (onboarding)/         # ✅ Onboarding route group (Task 3.1/3.2) — noindex/nofollow
│   │   │   ├── layout.tsx         # Centered shell + FintrackoLogo, wrapped in OnboardingGuardWrapper
│   │   │   ├── layout.test.tsx   # Onboarding layout render & metadata tests (5 tests)
│   │   │   └── onboarding/
│   │   │       ├── page.tsx       # Mounts <OnboardingForm />
│   │   │       └── page.test.tsx # Onboarding page render test (1 test)
│   │   ├── (dashboard)/          # ✅ Private dashboard route group (Task 3.1 — guard wired)
│   │   │   ├── layout.tsx         # Wraps children in OnboardingGuardWrapper (session + Profile check)
│   │   │   └── dashboard/
│   │   │       └── page.tsx       # Placeholder dashboard page (business UIs planned Phases 4–7)
│   │   └── api/v1/
│   │       ├── auth/[...better-auth]/
│   │       │   └── route.ts       # Better Auth route handler (explicit async GET/POST → auth.handler)
│   │       └── onboarding/complete/
│   │           ├── route.ts       # ✅ POST onboarding completion (Task 2.3 pipeline → atomic transaction)
│   │           └── route.test.ts  # Onboarding endpoint tests (3 tests)
│   ├── components/
│   │   ├── shared/            # Shared, composed UI used across routes
│   │   │   ├── fintracko-logo.tsx     # SVG wallet + chart-bars logo (light/dark variants)
│   │   │   ├── theme-toggle.tsx      # Accessible light/dark ThemeToggle (role="switch", localStorage)
│   │   │   ├── theme-toggle.test.tsx # ThemeToggle mount & aria tests
│   │   │   ├── auth/                  # Auth UI components
│   │   │   │   ├── oauth-buttons.tsx       # Client component — Google + GitHub sign-in buttons (title? + className? props)
│   │   │   │   └── oauth-buttons.test.tsx # OAuthButtons render, click behaviour & pending state tests (11 tests)
│   │   │   ├── onboarding/                # ✅ Onboarding UI components (Task 3.2)
│   │   │   │   ├── onboarding-form.tsx       # "use client" wizard (bio/DoB/gender/currency/language + gated legal checkboxes)
│   │   │   │   └── onboarding-form.test.tsx # Form render, checkbox enable & validation tests (3 tests)
│   │   │   ├── landing/              # Landing page section components
│   │   │   │   ├── nav-bar.tsx         # Glassmorphism NavBar + ThemeToggle
│   │   │   │   ├── hero-section.tsx   # Hero headline, CTAs, animated blur blobs
│   │   │   │   ├── feature-grid.tsx   # 6-card feature bento grid
│   │   │   │   ├── how-it-works.tsx   # 3-step timeline with gradient connecting line
│   │   │   │   ├── cta-section.tsx    # Bottom call-to-action band
│   │   │   │   └── footer.tsx         # Teal-tinted footer with aligned contact info
│   │   │   └── status-screen.tsx    # Shared success/error/empty status-screen surface
│   │   ├── guards/                  # ✅ Server-component route guards (Task 3.1)
│   │   │   ├── onboarding-guard-wrapper.tsx       # Session + Profile existence → redirect or render children
│   │   │   └── onboarding-guard-wrapper.test.tsx # Guard redirect & render tests (6 tests)
│   │   └── ui/                # shadcn/ui atomic components (button, card, dialog, input, form, label, table, toast)
│   │       └── ui-components.test.tsx  # Component smoke tests
│   ├── features/                  # ✅ Domain logic (Task 3.2 first slice)
│   │   └── onboarding/
│   │       ├── schemas.ts          # GenderEnum/CurrencyEnum/LanguageEnum + CompleteOnboardingSchema (Zod 4)
│   │       ├── schemas.test.ts    # Schema validation tests (15 tests)
│   │       ├── services.ts         # completeOnboarding() — atomic Prisma $transaction (Profile+Workspace+Member)
│   │       └── services.test.ts   # Service transaction tests (5 tests)
│   ├── lib/                   # Shared utilities & singletons
│   │   ├── auth.ts            # Better Auth server instance (prismaAdapter, socialProviders, account linking disabled)
│   │   ├── auth-client.ts     # Better Auth browser client (createAuthClient(), OAuthProvider type)
│   │   ├── auth.test.ts       # Auth config, callbacks, route handler & exports tests (17 tests)
│   │   ├── api/               # ✅ Shared REST API pipeline (Task 2.3)
│   │   │   ├── envelope.ts       # success/failure JSON envelopes + HTTP_STATUS_BY_CODE + timestamp
│   │   │   ├── envelope.test.ts
│   │   │   ├── session.ts        # resolveSession/withSession → AuthContext or UNAUTHORIZED 401
│   │   │   ├── session.test.ts
│   │   │   ├── validate.ts       # readJsonBody/validateBody (Zod) → BAD_REQUEST 400 / VALIDATION_ERROR 422
│   │   │   ├── validate.test.ts
│   │   │   ├── sanitize.ts       # sanitizeString/Array/Object (isomorphic-dompurify, XSS-neutralizing)
│   │   │   ├── sanitize.test.ts
│   │   │   ├── pipeline.ts       # runPipeline/withPipeline orchestrating session → validate → sanitize
│   │   │   └── pipeline.test.ts
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── db.test.ts         # DB contract unit test
│   │   ├── utils.ts           # General utilities (cn, etc.)
│   │   └── utils.test.ts      # Utility unit tests
│   └── test/
│       └── setup.ts           # Vitest setup (jest-dom matchers)
├── generated/
│   └── prisma/                # Generated Prisma Client (git-ignored)
├── docs/                      # Technical documentation
│   ├── architecture/          # ARCHITECTURE.md, API_SPECS.md
│   ├── core/                  # DESIGN_SYSTEM.md, AGENT_RULES.md, PROJECT_STRUCTURE.md
│   └── product/               # PRD_MVP1.md, TASK_ROADMAP.md
├── .env.example               # Environment variable template
├── .env.local                 # Local environment (git-ignored)
├── vitest.config.mts          # Vitest configuration
├── tsconfig.json              # TypeScript configuration
├── next.config.ts             # Next.js configuration
└── package.json               # Dependencies & scripts
```

---

## 🏗️ Architecture Overview

- **Framework**: Next.js 16 with React 19 and the App Router
- **Database**: PostgreSQL 17 via Prisma 7 ORM with `@prisma/adapter-pg` driver adapter
- **Auth**: Better Auth (OAuth-only — Google & GitHub) — see [Authentication](#-authentication) section below. **Phase 2, Task 2.2 ✅ Complete**
- **Styling**: Tailwind CSS 4 + shadcn/ui atomic components
- **Validation**: Zod 4 for request schema validation
- **Testing**: Vitest 4 with React Testing Library, co-located unit tests

Full architecture details: [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md)

---

## 🔧 Development Notes

### Prisma 7 Migration

This project uses **Prisma 7**, which introduced breaking changes:

- The `generator` provider is `"prisma-client"` (not `"prisma-client-js"`)
- The client is emitted to `./generated/prisma/` (git-ignored), not `node_modules`
- Connection URL is supplied via a **driver adapter** (`PrismaPg`), not `datasourceUrl`
- CLI configuration lives in [`prisma.config.ts`](prisma.config.ts:1), not inside `schema.prisma`

### Supabase Local Development

The local Supabase stack runs via **Docker** (managed by the Supabase CLI). The database is provisioned at `127.0.0.1:54322` with credentials `postgres:postgres`. We've disabled non-MVP services to reduce resource usage:

| Service           | Status | Reason                                                     |
| ----------------- | ------ | ---------------------------------------------------------- |
| PostgreSQL (db)   | ✅ On  | Required — the database                                    |
| Studio            | ✅ On  | Useful — DB admin UI at :54323                             |
| API Gateway       | ✅ On  | Required — future Auth/REST calls                          |
| Auth (GoTrue)     | ❌ Off | Not used — Better Auth handles OAuth (Task 2.2)            |
| Realtime          | ❌ Off | WebSockets not in MVP                                      |
| Edge Functions    | ❌ Off | Deno runtime not in MVP                                    |
| Storage / S3      | ❌ Off | File upload not in MVP                                     |
| Analytics         | ❌ Off | Log analysis not needed yet                                |
| Connection Pooler | ❌ Off | PrismaPg handles connections                               |
| Local SMTP        | ✅ On  | Inbucket email testing server (mail capture for local dev) |

### Unit Testing Rules

Per [`docs/core/AGENT_RULES.md`](docs/core/AGENT_RULES.md), all tests must be:

- **Co-located** next to their target files (e.g., `src/lib/db.ts` → `src/lib/db.test.ts`)
- **Explicitly named** `*.test.ts` or `*.test.tsx`
- Run with `npm run test:run` before any task is marked complete

---

## 🔐 Authentication

Better Auth powers OAuth-only sign-in (no email/password). Task 2.2 is complete — 7 source files + 5 co-located test files (44 tests) ship with the integration.

### Server instance — [`src/lib/auth.ts`](src/lib/auth.ts:1)

The `betterAuth({...})` instance binds to Prisma via the `prismaAdapter` (PostgreSQL provider), disables email/password, enables Google + GitHub social providers from env vars, and **disables account linking** so each OAuth provider maps to a distinct user record. It exposes the auth handler at [`basePath: "/api/v1/auth"`](src/lib/auth.ts:34) (consumed by the catch-all route at [`src/app/api/v1/auth/[...better-auth]/route.ts`](src/app/api/v1/auth/[...better-auth]/route.ts:1)) and uses an explicit `modelMapping` to bind Better Auth's internal models to the **12** Prisma tables — including the [`Verification`](prisma/schema.prisma:193) table added by migration `20260715141409_add_better_auth_verification_model`.

```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./db";

export const auth = betterAuth({
  basePath: "/api/v1/auth",
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: false },
  // Map Better Auth internal models → Prisma models explicitly
  // (user→User, account→AuthAccount, session→Session, verification→Verification)
  user: { modelName: "User" },
  account: { modelName: "AuthAccount", accountLinking: { enabled: false } },
  session: { modelName: "session" },
  verification: { modelName: "verification" },
  socialProviders: {
    google: {
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    },
    github: {
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    },
  },
  callbacks: {
    signIn: async ({
      user,
    }: {
      user: { emailVerified: boolean | null | undefined };
    }) => {
      // In production, reject only when the OAuth provider reports emailVerified === false.
      if (user.emailVerified === false) {
        throw new Error("Email is not verified by the OAuth provider.");
      }
      return { user: { emailVerified: user.emailVerified } };
    },
  },
});

export type AuthClient = typeof auth;
```

> **Account linking**: configured as `account.accountLinking.enabled: false` (the v1.x Better Auth key path), **not** the older `advanced.disableAccountLinking: true`.

> **Email verification callback**: production rejects only `emailVerified === false` and passes through `null`/`undefined` (treats them as "unknown"). The test helper in [`src/lib/auth.test.ts`](src/lib/auth.test.ts:112) additionally rejects `null` for unit-test determinism (`should handle null emailVerified as unverified`) and allows `undefined` (`should allow sign-in when emailVerified is undefined`). The `signIn` callback itself lives at [`src/lib/auth.ts:91`](src/lib/auth.ts:91).

### Browser client — [`src/lib/auth-client.ts`](src/lib/auth-client.ts:1)

A **parameterless** `createAuthClient()` (no baseURL — it resolves against the current origin) and the `OAuthProvider` string-union type are exported for client components.

```typescript
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient();
export type OAuthProvider = "google" | "github";
```

### Route handler — [`src/app/api/v1/auth/[...better-auth]/route.ts`](src/app/api/v1/auth/[...better-auth]/route.ts:1)

Explicit `async` named exports delegating to `auth.handler` (not the `export const { GET, POST } = auth` shorthand):

```typescript
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return auth.handler(request);
}

export async function POST(request: NextRequest) {
  return auth.handler(request);
}
```

### Auth UI — [`src/components/shared/auth/oauth-buttons.tsx`](src/components/shared/auth/oauth-buttons.tsx:1)

A `"use client"` component rendering Google + GitHub buttons. Accepts optional `title?` and `className?` props, imports `OAuthProvider` from `@/lib/auth-client`, and guards against double-submit with a per-provider `pendingProvider` state that disables **both** buttons while a `signIn.social()` call is in-flight (`callbackURL = window.location.origin + "/onboarding"`). The state resets on both resolve and reject, allowing retry.

### Auth route group — `src/app/(auth)/`

- **[`layout.tsx`](<src/app/(auth)/layout.tsx:1>)** — `AuthLayout` renders only a `FintrackoLogo` brand link to `/` (aria-label "Fintracko home") inside a `max-w-sm` centered container. **No NavBar / Footer.** Exports `metadata.robots = { index: false, follow: false }` so auth routes are noindex/nofollow.
- **[`login/page.tsx`](<src/app/(auth)/login/page.tsx:1>)** — Card with `CardTitle` + `<h1>` "Welcome back", a `CardDescription`, the `<OAuthButtons />` client component, and a footer link "Create one" → `/register`.
- **[`register/page.tsx`](<src/app/(auth)/register/page.tsx:1>)** — Card with "Create your account", `CardDescription`, `<OAuthButtons />`, and a footer link "Sign in" → `/login`.

### Required environment variables

| Variable                                | Purpose                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`                    | Session signing secret (generate with `openssl rand -base64 32`)                 |
| `BETTER_AUTH_URL`                       | App base URL used to build OAuth callback URLs (`http://localhost:3000` locally) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth client credentials                                                  |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth client credentials                                                  |

> OAuth redirect URLs must be set to `{BETTER_AUTH_URL}/api/v1/auth/callback/google` and `{BETTER_AUTH_URL}/api/v1/auth/callback/github` in the Google / GitHub developer consoles.

### Client usage example

```typescript
"use client";
import { authClient } from "@/lib/auth-client";

// Get the current session on the client (returns { data: session | null, error }).
const { data: session, error } = await authClient.getSession();
```

> The browser client uses `authClient.getSession()` — there is no `authClient.session()` method.

### Test coverage (44 tests across 5 files)

| Test file                                                                                                  | Tests | Covers                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`src/lib/auth.test.ts`](src/lib/auth.test.ts:1)                                                           | 17    | Auth instance structure, socialProviders env wiring, email verification `signIn` callback (`false` rejected, `null` rejected in helper, `true`/`undefined` allowed), GET/POST route handler exports, account-linking disabled, postgresql provider, `AuthClient` type export |
| [`src/components/shared/auth/oauth-buttons.test.tsx`](src/components/shared/auth/oauth-buttons.test.tsx:1) | 10    | Both buttons rendered, default labels, `title` prop shown/omitted, `signIn.social` called with `google`/`github`, `pendingProvider` disables both buttons + shows "Redirecting…", re-enable on resolve, reset on reject                                                      |
| [`src/app/(auth)/layout.test.tsx`](<src/app/(auth)/layout.test.tsx:1>)                                     | 5     | Renders without throwing, renders Fintracko brand + home link, renders children, no NavBar/Footer, `robots.index === false`                                                                                                                                                  |
| [`src/app/(auth)/login/page.test.tsx`](<src/app/(auth)/login/page.test.tsx:1>)                             | 6     | "Welcome back" heading, OAuthButtons rendered, register link → `/register`, indexing disabled + correct title/description metadata                                                                                                                                           |
| [`src/app/(auth)/register/page.test.tsx`](<src/app/(auth)/register/page.test.tsx:1>)                       | 6     | "Create your account" heading, OAuthButtons rendered, sign-in link → `/login`, indexing disabled + correct title/description metadata                                                                                                                                        |

Deeper design notes: [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md:1) (§ Better Auth + Verification table) and [`docs/product/TASK_ROADMAP.md`](docs/product/TASK_ROADMAP.md:1) (Task 2.2 resolution) — Better Auth integration reference. Status: **✅ Complete**.

---

---

## 🧭 Onboarding & Dashboard (Phase 3)

Phase 3 ships the implicit-onboarding guard and the first-time wizard flow. **Status: Tasks 3.1 & 3.2 complete.**

### Onboarding guard — [`src/components/guards/onboarding-guard-wrapper.tsx`](src/components/guards/onboarding-guard-wrapper.tsx:1)

A React Server Component (no `'use client'`) wired into both [`src/app/(dashboard)/layout.tsx`](<src/app/(dashboard)/layout.tsx:1>) and [`src/app/(onboarding)/layout.tsx`](<src/app/(onboarding)/layout.tsx:1>). It reads request headers, then **lazily** resolves the Better Auth singleton and the Prisma singleton via dynamic `import()` (small module graph, Prisma-free tests). The guard flow:

1. `auth.api.getSession({ headers })` — no session (or no `user.id`) → `redirect("/login")`.
2. `db.profile.findUnique({ where: { userId } })` — no `Profile` → `redirect("/onboarding")`.
3. `Profile` exists → renders `children` via a `<>{children}</>` fragment.

### Onboarding wizard — [`src/components/shared/onboarding/onboarding-form.tsx`](src/components/shared/onboarding/onboarding-form.tsx:1)

A `"use client"` card-driven wizard collecting `bio` (optional), `dateOfBirth`, `gender`, `currencyPreference`, `languagePreference`, plus two legal checkboxes that stay **disabled** until the user clicks the `/terms-of-service` / `/privacy-policy` links (gated-read UX). On submit it converts the date to ISO, `POST`s to `/api/v1/onboarding/complete`, surfaces `sonner` toasts, and hard-redirects to `/dashboard` on success.

### Onboarding endpoint — [`src/app/api/v1/onboarding/complete/route.ts`](src/app/api/v1/onboarding/complete/route.ts:1)

`POST /api/v1/onboarding/complete` reuses the Task 2.3 pipeline (`withSession` → `validateBody` → `sanitizeObject`) over [`CompleteOnboardingSchema`](src/features/onboarding/schemas.ts:1), then calls [`completeOnboarding()`](src/features/onboarding/services.ts:1) — a single Prisma `$transaction` that atomically creates the `Profile`, the first `Workspace` ("My Workspace", `ownerId = userId`), and a `WorkspaceMember` row with `role: "OWNER"`.

- Request payload: `{ bio?, dateOfBirth(ISO), gender, currencyPreference, languagePreference }`.
- Response envelope (`200`): `{ profile: { id, bio, currencyPreference, languagePreference }, workspace: { id, name } }`.
- A second completion attempt for the same user throws inside the transaction (the `Profile.userId` `@unique` constraint); the handler collapses this into `failure("INTERNAL_SERVER_ERROR", …)`.

Full contract: [`docs/architecture/API_SPECS.md`](docs/architecture/API_SPECS.md:1) §3.0. Resolution notes: [`docs/product/IMPLEMENTATION_LOG.md`](docs/product/IMPLEMENTATION_LOG.md:1) → Tasks 3.1 & 3.2.

### Dashboard — [`src/app/(dashboard)/dashboard/page.tsx`](<src/app/(dashboard)/dashboard/page.tsx:1>)

A placeholder page rendering a "Dashboard" heading, gated by the `OnboardingGuardWrapper` mounted in [`src/app/(dashboard)/layout.tsx`](<src/app/(dashboard)/layout.tsx:1>). Business dashboard UIs (workspaces, transactions, budgets, analytics) are planned for Phases 4–7.

---

## 📚 Documentation

| Document                                                                 | Purpose                             |
| ------------------------------------------------------------------------ | ----------------------------------- |
| [`docs/product/PRD_MVP1.md`](docs/product/PRD_MVP1.md)                   | Product requirements & data models  |
| [`docs/product/TASK_ROADMAP.md`](docs/product/TASK_ROADMAP.md)           | Implementation task checklist       |
| [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md) | System architecture & design        |
| [`docs/architecture/API_SPECS.md`](docs/architecture/API_SPECS.md)       | REST API contract specifications    |
| [`docs/core/AGENT_RULES.md`](docs/core/AGENT_RULES.md)                   | AI agent development rules          |
| [`docs/core/DESIGN_SYSTEM.md`](docs/core/DESIGN_SYSTEM.md)               | Design tokens & visual guidelines   |
| [`docs/core/PROJECT_STRUCTURE.md`](docs/core/PROJECT_STRUCTURE.md)       | Directory structure & module layout |

---

## 📝 License

[Specify license here]

---

_Last updated: Phase 3 (Implicit Onboarding & Multi-Tenancy Framework) — Tasks 3.1 & 3.2 complete. Phase 1–2 recap: project initialization, design system, Better Auth integration (OAuth Google + GitHub, `basePath: /api/v1/auth`, explicit Prisma `modelMapping` incl. `Verification` table, account linking disabled, email verification callback), and the Task 2.3 REST envelope + security pipeline (`src/lib/api/`). Phase 3 adds the `OnboardingGuardWrapper` Server Component, the `(onboarding)/(dashboard)` route groups, the `/api/v1/onboarding/complete` endpoint, and the first `src/features/onboarding/` slice (Zod schemas + atomic `completeOnboarding()` service). The initial migration is `20260716222200_init` (12 models). Total suite now 234 tests across 23 files. Remaining for this phase: Task 3.3 (workspace templates) & 3.4 (collaborator invites); Phases 4–7 (accounts, transactions, budgets, analytics) are planned._
