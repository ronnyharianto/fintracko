# Project Structure Blueprint - Fintracko

To maintain clean modularity, strict multi-tenancy isolation, database integrity, and robust automated test coverage, the application must strictly adhere to the following directory layout. Arbitrary top-level structures are prohibited.

## Root Directory Layout
```text
fintracko/
├── .gitignore             # Git ignore file
├── .env.local             # Local environment variables (do not commit)
├── next.config.mjs        # Next.js configuration
├── package.json           # Dependencies and test scripts
├── prisma/                # Database migrations and ORM schema
│   └── schema.prisma
├── public/                # Static assets (logos, icons)
├── src/                   # Main application source code
│   ├── app/               # Next.js App Router (Routing layer)
│   ├── components/        # Reusable UI components
│   ├── features/          # Domain-driven core business logic
│   ├── lib/               # Shared utilities, clients, and configurations
│   ├── types/             # Global TypeScript type definitions
│   └── proxy.ts           # Next.js edge-network session validation layer
├── vitest.config.ts       # Vitest unit testing configuration
├── package.json           # Project dependency configuration map
└── tsconfig.json          # TypeScript configuration
```

---

## 2. Detailed Directory Breakdown

### 2.1 src/app/ (Routing & Interactivity Boundary Layout)

This layer manages HTTP request endpoints and page structural renders. All security pipeline logic executes here before business mutations are called.

* src/app/layout.tsx - Root layout initializing design themes, Better Auth session providers, and global notification toast contexts.
* src/app/page.tsx - Public marketing landing page optimized for search engine optimization (SEO).
* src/app/(auth)/ - Route group containing dedicated paths for OAuth validation entry points like /login and /register.
* src/app/(marketing)/ - Static layout paths enforcing legal accessibility compliance like /privacy-policy and /terms-of-service.
* src/app/(onboarding)/ - Step-by-step wizard route group (/onboarding) to create the initial user profile record and the first active workspace.
* src/app/(dashboard)/ - Private core application layout bound strictly to the OnboardingGuardWrapper component.
  * src/app/(dashboard)/workspaces/ - Workspace orchestration switcher and management page.
  * src/app/(dashboard)/dashboard/ - Main analytical dashboard.
  * src/app/(dashboard)/transactions/ - Ledger management.
  * src/app/(dashboard)/budgets/ - Interface dedicated to assigning spending threshold limits.
* src/app/api/v1/ - Hardened REST API Route Handlers providing unified success/failure envelopes.
  * src/app/api/v1/auth/[...better-auth]/route.ts - Native handler managing identity states for Better Auth.
  * src/app/api/v1/workspaces/route.ts - Creates workspaces and seeds default categories.
  * src/app/api/v1/workspaces/invite/route.ts - Generates workspace member invitations.
  * src/app/api/v1/accounts/route.ts - Instantiates specific financial asset nodes.
  * src/app/api/v1/transactions/route.ts - Processes ledger changes inside isolated transactions.
  * src/app/api/v1/budgets/route.ts - Modifies category threshold spending rules.
  * src/app/api/v1/analytics/dashboard/route.ts - Compiles mathematical reporting matrices.

### 2.2 src/features/ (Domain Logic & Processing Layer)

To prevent fragmented code distribution, all validations, database updates, and data filters are grouped cleanly by domain module.

```text
src/features/
├── workspaces/
│   ├── actions/         # Server Actions (e.g., createWorkspace, inviteMember)
│   ├── components/      # Reusable UI components for this module
│   ├── schemas/         # Zod schemas for input validation
│   └── services/        # Direct Prisma DB query abstractions
├── accounts/
├── transactions/
├── budgets/
└── analytics/
```

* src/features/workspaces/ - Templates for setup constants, compound ownership filters, and schema fields.
* src/features/accounts/ - Calculators for net asset totals based on initialBalance and netTransactionSum.
* src/features/transactions/ - Atomic ledger rules enforcing strict math rules inside database procedures.
* src/features/budgets/ - Systems to compute remaining allocations for Level 2 sub-categories.
* src/features/analytics/ - Multi-month aggregations using precise database formatting tools.

### 2.3 src/components/ (Presentation & Interface Layer)

UI components are clearly divided by responsibility to isolate logic from generic markup designs.

* src/components/ui/ - Atomic visual design components built via shadcn/ui such as button.tsx, dialog.tsx, and table.tsx. Code injection here remains generic; business states must never be parsed inside these files.
* src/components/shared/ - Complex layout structures utilized by multiple private screens such as sidebar.tsx, navbar.tsx, and workspace-picker.tsx.
* src/components/guards/ - Pure server wrapper blocks like OnboardingGuardWrapper.tsx that implicitly check profile database records before displaying child views.

### 2.4 src/lib/ (Infrastructure & Constants)

* src/lib/db.ts - Singleton script managing connection instances for the Prisma database client.
* src/lib/auth.ts - Base initialization setup for Better Auth bindings.
* src/lib/utils.ts - Fast formatting helpers managing utility style operations like Tailwind class merges.

---

## 3. Co-located Automated Unit Testing

All quality control scripts written for Vitest must reside directly next to their target implementation using the explicit naming pattern *.test.ts or *.test.tsx.

Example Path Map:
* src/features/transactions/create-transaction.ts
* src/features/transactions/create-transaction.test.ts

This ensures high coverage tracking, immediate isolation of unexpected breaks, and maintains clean modular exports across the application codebase.