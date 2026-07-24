# Fintracko

A financial SaaS application for personal finance and budget tracking.

---

## 🧱 About / Built With

Fintracko is a personal finance and budget-tracking SaaS built on a modern, type-safe TypeScript stack. It uses Next.js App Router with server components and route groups, a PostgreSQL database accessed through Prisma, and OAuth-only authentication.

- **Framework**: Next.js 16 (App Router) with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: PostgreSQL 17 (local via Supabase) with Prisma 7 ORM
- **Auth**: Better Auth (OAuth-only — Google & GitHub)
- **Validation**: Zod 4
- **Testing**: Vitest 4 + React Testing Library

---

## 🚀 Getting Started

| Prerequisite                                                      | Purpose                   |
| ----------------------------------------------------------------- | ------------------------- |
| [Node.js](https://nodejs.org/) 20 LTS                             | Runtime                   |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Local Supabase (Postgres) |
| [Git](https://git-scm.com/)                                       | Version control           |

1. **Clone & install**

   ```bash
   git clone <repo-url> fintracko
   cd fintracko
   npm install
   ```

2. **Start local database**

   ```bash
   npm run supabase:start
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env.local
   ```

   Defaults work for local dev. For OAuth, add Google and GitHub credentials and set `BETTER_AUTH_SECRET` via `openssl rand -base64 32`:
   - Google: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - GitHub: [GitHub Developer Settings](https://github.com/settings/developers)
   - Redirect URLs: `{BETTER_AUTH_URL}/api/v1/auth/callback/{google,github}`

4. **Apply database migrations**

   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) — the app is live.

---

## 📜 Available Scripts

### Development

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start Next.js dev server |
| `npm run build` | Production build         |
| `npm run start` | Start production server  |
| `npm run lint`  | Run ESLint               |

### Testing

| Command            | Description              |
| ------------------ | ------------------------ |
| `npm run test`     | Run Vitest in watch mode |
| `npm run test:run` | Run Vitest once (CI)     |
| `npm run test:ui`  | Open Vitest UI dashboard |

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
├── prisma/                # Schema (source of truth) + migrations
├── supabase/              # Local Supabase service config
├── src/
│   ├── app/               # Next.js App Router pages & layouts
│   │   ├── (marketing)/   # Marketing route group (NavBar + Footer)
│   │   ├── (auth)/        # Auth route group (login, register)
│   │   ├── (onboarding)/  # Onboarding wizard route group
│   │   ├── (dashboard)/   # Private dashboard route group
│   │   └── api/v1/        # REST API route handlers
│   ├── components/
│   │   ├── shared/        # Composed UI (auth, onboarding, landing)
│   │   ├── guards/        # Server-component route guards
│   │   └── ui/            # shadcn/ui atomic components
│   ├── features/          # Domain logic (schemas + services)
│   ├── lib/               # Shared utilities (auth, db, API pipeline)
│   └── test/              # Vitest setup
├── generated/             # Generated Prisma Client (git-ignored)
├── docs/                  # Technical documentation
├── .env.example           # Environment variable template
├── prisma.config.ts       # Prisma 7 CLI configuration
├── vitest.config.mts      # Vitest configuration
├── tsconfig.json          # TypeScript configuration
└── next.config.ts         # Next.js configuration
```

---

## 📚 Documentation

Full documentation lives in [`docs/`](docs/):

| Document                                                                   | Purpose                              |
| -------------------------------------------------------------------------- | ------------------------------------ |
| [`docs/product/PRD_MVP1.md`](docs/product/PRD_MVP1.md)                     | Product requirements & data models   |
| [`docs/product/TASK_ROADMAP.md`](docs/product/TASK_ROADMAP.md)             | Implementation task checklist        |
| [`docs/product/IMPLEMENTATION_LOG.md`](docs/product/IMPLEMENTATION_LOG.md) | Implementation history & resolutions |
| [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md)   | System architecture & design         |
| [`docs/architecture/API_SPECS.md`](docs/architecture/API_SPECS.md)         | REST API contract specifications     |
| [`docs/core/AGENT_RULES.md`](docs/core/AGENT_RULES.md)                     | AI agent development rules           |
| [`docs/core/DESIGN_SYSTEM.md`](docs/core/DESIGN_SYSTEM.md)                 | Design tokens & visual guidelines    |
| [`docs/core/PROJECT_STRUCTURE.md`](docs/core/PROJECT_STRUCTURE.md)         | Directory structure & module layout  |
