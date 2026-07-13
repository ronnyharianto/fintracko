# Fintracko

> **A financial SaaS application for personal finance and budget tracking.**
> Built with Next.js 16 (App Router), Tailwind CSS, shadcn/ui, Better Auth, Prisma 7, and Supabase.

---

## 🚀 Quick Start

### Prerequisites

| Tool | Min Version | Purpose |
|------|-------------|---------|
| [Node.js](https://nodejs.org/) | 20 LTS | Runtime |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 24+ | Local Supabase (Postgres) |
| [Git](https://git-scm.com/) | 2.40+ | Version control |

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
```

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

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

### Testing

| Command | Description |
|---------|-------------|
| `npm run test` | Run Vitest in watch mode |
| `npm run test:run` | Run Vitest once (CI mode) |
| `npm run test:ui` | Open Vitest UI dashboard |

### Database (Prisma)

| Command | Description |
|---------|-------------|
| `npm run prisma:generate` | Generate Prisma Client from schema |
| `npm run prisma:migrate` | Create & apply a new migration |
| `npm run prisma:migrate:deploy` | Apply pending migrations (CI/prod) |
| `npm run prisma:studio` | Open Prisma Studio (DB browser) |
| `npm run db:push` | Push schema directly (no migration file) |
| `npm run db:reset` | Reset DB and re-run all migrations |

### Database (Supabase CLI)

| Command | Description |
|---------|-------------|
| `npm run supabase:start` | Start local Supabase Docker stack |
| `npm run supabase:stop` | Stop local Supabase services |
| `npm run supabase:status` | Show running services & URLs |

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
│   │   ├── layout.tsx         # Root layout (+ Toaster provider)
│   │   ├── page.tsx           # Public landing page
│   │   └── globals.css        # Tailwind v4 + Fintracko teal design tokens (HSL)
│   ├── components/
│   │   └── ui/                # shadcn/ui atomic components (button, card, dialog, input, form, label, table, toast)
│   │       └── ui-components.test.tsx  # Component smoke tests
│   ├── lib/                   # Shared utilities & singletons
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
- **Auth**: Better Auth (OAuth-only — Google & GitHub, Phase 2)
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

| Service | Status | Reason |
|---------|--------|--------|
| PostgreSQL (db) | ✅ On | Required — the database |
| Studio | ✅ On | Useful — DB admin UI at :54323 |
| API Gateway | ✅ On | Required — future Auth/REST calls |
| Auth (GoTrue) | ✅ On | Required — Phase 2 OAuth |
| Realtime | ❌ Off | WebSockets not in MVP |
| Edge Functions | ❌ Off | Deno runtime not in MVP |
| Storage / S3 | ❌ Off | File upload not in MVP |
| Analytics | ❌ Off | Log analysis not needed yet |
| Connection Pooler | ❌ Off | PrismaPg handles connections |

### Unit Testing Rules

Per [`docs/core/AGENT_RULES.md`](docs/core/AGENT_RULES.md), all tests must be:
- **Co-located** next to their target files (e.g., `src/lib/db.ts` → `src/lib/db.test.ts`)
- **Explicitly named** `*.test.ts` or `*.test.tsx`
- Run with `npm run test:run` before any task is marked complete

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [`docs/product/PRD_MVP1.md`](docs/product/PRD_MVP1.md) | Product requirements & data models |
| [`docs/product/TASK_ROADMAP.md`](docs/product/TASK_ROADMAP.md) | Implementation task checklist |
| [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md) | System architecture & design |
| [`docs/architecture/API_SPECS.md`](docs/architecture/API_SPECS.md) | REST API contract specifications |
| [`docs/core/AGENT_RULES.md`](docs/core/AGENT_RULES.md) | AI agent development rules |
| [`docs/core/DESIGN_SYSTEM.md`](docs/core/DESIGN_SYSTEM.md) | Design tokens & visual guidelines |
| [`docs/core/PROJECT_STRUCTURE.md`](docs/core/PROJECT_STRUCTURE.md) | Directory structure & module layout |

---

## 📝 License

[Specify license here]

---

*Last updated: Phase 1 (Project Initialization) — Task 1.4 complete*