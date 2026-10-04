# Fintracko

A multi-tenant financial tracking application built with Next.js and React.
Provides workspace collaboration, financial account management, budget tracking, and onboarding workflows.

## Tech Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- TypeScript (strict mode)
- Prisma ORM 7 (PostgreSQL, multi-schema `ft_auth` / `ft_core`)
- Neon (PostgreSQL hosting in production) + local dev via Supabase CLI
- Better Auth (OAuth-only: Google + GitHub)
- Tailwind CSS 4
- Zod v4
- Radix UI components (shadcn-style `src/components/ui/`)
- Vercel (deployment target)

## Features

- **OAuth-only authentication** — Google + GitHub sign-in; unverified emails are rejected, account linking disabled; HttpOnly session cookies.
- **Mandatory onboarding** — profile setup with explicit Terms of Service and Privacy Policy acceptance before the first workspace.
- **Multi-workspace collaboration** — invite collaborators by email (OWNER / COLLABORATOR roles), workspace switching, per-workspace currency.
- **Financial accounts** — checking, savings, cash, credit card, digital wallet, investment; archive/unarchive instead of delete; balance = `initialBalance + netTransactionSum` maintained with atomic updates.
- **Two-level categories** — category → sub-category with workspace templates (Personal Finance, Family Finance, Small Business) and archive support.
- **Transactions** — income / expense / transfer with account direction invariants, tags, payee/payer, and Imgur-backed receipt image upload.
- **Recurring budgets** — monthly or yearly budgets over a date range with open-ended support, overlap prevention, and utilization tracking.
- **Dashboard & analytics** — top budgets nearing exhaustion, expense breakdown chart, and 6-month balance trend.
- **SEO-ready public site** — landing page, FAQ, legal pages, sitemap, robots.txt, OpenGraph images, and JSON-LD structured data.

## Getting Started

### Prerequisites

- Node.js 20.9+ (required by Next.js 16)
- npm
- Git
- Supabase CLI (for local development only)
- Docker (required by the Supabase CLI)

### Setup

1. Clone the repository: `git clone <repo-url>`
2. Navigate to the project directory: `cd fintracko`
3. Install dependencies: `npm install`
4. Configure environment variables: copy `.env.example` to `.env.local` and fill in the required values (see the table below).
5. Start local Supabase: `npm run supabase:start`
6. Generate the Prisma client and set up the database: `npm run prisma:generate && npm run db:push`
7. Start the dev server: `npm run dev` and open http://localhost:3000

### Environment Variables

All variables are documented inline in `.env.example`.

| Variable                                  | Purpose                                                                                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                            | Application runtime connection (local Supabase default provided; use Neon's pooled connection string in Vercel)                                                           |
| `DIRECT_URL`                              | Optional Prisma CLI connection for migrations and schema changes; use Neon's direct, non-pooled connection string in production. Falls back to `DATABASE_URL` when unset. |
| `BETTER_AUTH_SECRET`                      | Random 32+ char secret signing session cookies (`openssl rand -base64 32`)                                                                                                |
| `BETTER_AUTH_URL`                         | App origin used for OAuth callback URLs                                                                                                                                   |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`   | Google OAuth credentials                                                                                                                                                  |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`   | GitHub OAuth credentials                                                                                                                                                  |
| `IMGUR_CLIENT_ID`                         | Imgur API client id for receipt image uploads                                                                                                                             |
| `NEXT_PUBLIC_APP_URL`                     | Optional. Public site origin for SEO surfaces; falls back to Vercel's `VERCEL_PROJECT_PRODUCTION_URL`, then localhost                                                     |
| `NEXT_PUBLIC_INVITATION_POLL_INTERVAL_MS` | Optional. Invitation polling interval (default 30000)                                                                                                                     |

## Application Execution

- Development server: `npm run dev`
- Build for production: `npm run build`
- Start production server: `npm start`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`

## Database & Prisma Migration Management

The Prisma client is generated into `generated/prisma` (git-ignored), so run `npm run prisma:generate` after cloning or after any schema change.

- Generate Prisma client: `npm run prisma:generate`
- Run migration development workflow: `npm run prisma:migrate`
- Apply migrations to a database: `npm run prisma:migrate:deploy`
- Push schema changes without migration: `npm run prisma:push` (alias `npm run db:push`)
- Reset database (drop and reseed): `npm run db:reset`
- Inspect data: `npm run prisma:studio`

## Supabase Management (local development only)

- Start local Supabase services: `npm run supabase:start` or `npx supabase start`
- Stop Supabase services: `npm run supabase:stop` or `npx supabase stop`
- Check Supabase status: `npm run supabase:status` or `npx supabase status`
- Reset local database: `npx supabase db reset`

## Seeding Test Data (local development only)

For manual testing of large transaction volumes (e.g. verifying the transaction
list and Summary when a month has more rows than one page), a dev-only script
inserts random transactions into a workspace.

```bash
node --env-file=.env node_modules/jiti/lib/jiti-cli.mjs scripts/seed-transactions.ts
```

- Inserts 150 transactions for the current month, each dated on a random day of
  the month, then recomputes every account's `netTransactionSum` from the ledger
  so the `initialBalance + netTransactionSum` invariant stays exact.
- Default target is the "Personal" workspace; override it with
  `SEED_WORKSPACE_ID`.
- Options (set the env vars before `node`): `SEED_COUNT` (default 150),
  `SEED_WORKSPACE_ID`, and `SEED_RESET=1` to delete previously seeded rows (they
  are tagged `seed`) before inserting.
- Requires local Supabase to be running (`npm run supabase:start`).
- Re-running without `SEED_RESET=1` adds another batch (150 more rows).
- `scripts/verify-seed.ts` re-checks the seeded month through the same paged
  query the app uses.

> **Do not run this against production.** The script has no environment guard
> and writes to whichever database `DATABASE_URL` points at.

## Deployment (Vercel + Neon)

The application deploys to Vercel with Neon as the production PostgreSQL host.

### 1. Create the Neon database

1. Create a project at https://neon.tech (free tier is sufficient to start).
2. Set `DATABASE_URL` to the **pooled** connection string (the host contains
   `-pooler`). Vercel serverless functions use this endpoint to avoid exhausting
   Neon's direct connection limit.
3. Set `DIRECT_URL` to Neon's **direct** connection string (no `-pooler`) in your
   local `.env.local`, then run `npm run prisma:migrate:deploy`. Prisma migrations
   use advisory locks and should not run through Neon's transaction pooler. This
   creates the `ft_auth` and `ft_core` schemas. `DIRECT_URL` is optional in Vercel
   unless Prisma CLI commands are run there.

### 2. Configure Vercel environment variables

| Variable                                | Value                                                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                          | Neon **pooled** connection string                                                                     |
| `DIRECT_URL`                            | Not required for application runtime; use Neon **direct** connection locally when applying migrations |
| `BETTER_AUTH_SECRET`                    | New random 32+ char secret (`openssl rand -base64 32`) — do not reuse the dev secret                  |
| `BETTER_AUTH_URL`                       | Production origin, e.g. `https://your-app.vercel.app`                                                 |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth credentials                                                                              |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth credentials                                                                              |
| `IMGUR_CLIENT_ID`                       | Imgur API client id                                                                                   |
| `NEXT_PUBLIC_APP_URL`                   | Optional; set explicitly once a custom domain is connected                                            |

### 3. Update the OAuth redirect URIs

In the Google Cloud Console and GitHub OAuth app settings, add the production
callback URLs:

- Google (Authorized redirect URIs): `https://<your-domain>/api/v1/auth/callback/google`
- GitHub (Authorization callback URL): `https://<your-domain>/api/v1/auth/callback/github`

### 4. Deploy

Push to the branch connected to Vercel. `npm install` triggers `prisma generate`
automatically via the `postinstall` script, so the git-ignored
`generated/prisma` client is regenerated on every fresh build. No further
build configuration is required. Apply schema migrations separately with
`DIRECT_URL` before deploying code that depends on them.

### Known operational notes

- **Neon cold starts** — the free tier autosuspends idle compute; the first
  request after inactivity has extra latency.
- **Imgur receipts** — uploaded receipt images are public URLs on Imgur's free
  tier; plan a migration to private storage if this becomes a requirement.
- **Upload rate limiting** — configure a Vercel Firewall rate-limit rule for
  `POST /api/v1/upload` before public launch. The route requires an authenticated
  session, but app-instance memory is not a reliable rate-limit store on Vercel.

## Project Structure

- `src/app/` — Next.js App Router routes; API route handlers under `src/app/api/v1/` are thin transport adapters
- `src/features/<domain>/` — business rules: Zod schemas, services, domain errors, hooks
- `src/components/` — shared UI; shadcn primitives in `src/components/ui/`, landing sections in `src/components/shared/landing/`
- `src/lib/` — infrastructure: `db.ts` (Prisma singleton), `auth.ts` (Better Auth), `api/` (request pipeline, response envelope, sanitization), `site.ts` (SEO config)
- `prisma/schema.prisma` — data model source of truth (13 models across `ft_auth` and `ft_core` schemas)
- `generated/prisma/` — generated Prisma client (git-ignored; regenerate after clone)
- `docs/product/PRD_MVP1.md` — product requirements for MVP 1
