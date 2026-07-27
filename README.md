# Fintracko
A multi-tenant financial tracking application built with Next.js and React. 
Provides workspace collaboration, financial account management, budget tracking, and onboarding workflows.

## Tech Stack
- Next.js 16
- React 19
- Prisma ORM
- Supabase
- Tailwind CSS
- Zod
- Radix UI components

## Getting Started
### Prerequisites
- Node.js 18+
- npm or yarn
- Git
- Supabase CLI (for local development)

### Setup
1. Clone the repository: `git clone <repo-url>`
2. Navigate to the project directory: `cd fintracko`
3. Install dependencies: `npm install` or `yarn install`
4. Configure environment variables by copying `.env.example` to `.env` and filling in the required values.

## Application Execution
- Development server: `npm run dev`
- Build for production: `npm run build`
- Start production server: `npm start`

## Database & Prisma Migration Management
- Generate Prisma client: `npm run prisma:generate`
- Run migration development workflow: `npm run prisma:migrate`
- Apply migration to database: `npm run prisma:migrate --skip-seed` (or as needed)
- Push schema changes without migration: `npm run prisma:push`
- Deploy migration to production: `npm run prisma:migrate:deploy`
- Reset database (drop and reseed): `npm run prisma:migrate:reset`

## Supabase Management
- Start local Supabase services: `npm run supabase:start` or `npx supabase start`
- Stop Supabase services: `npm run supabase:stop` or `npx supabase stop`
- Check Supabase status: `npm run supabase:status` or `npx supabase status`
- Reset local database: `npx supabase db reset`