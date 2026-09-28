// ============================================================================
// Fintracko — Prisma Configuration (Prisma 7 contract)
// ============================================================================
// Prisma 7 removed support for the `url` property inside `datasource {}` blocks
// of `prisma/schema.prisma`. The connection URL must now be supplied to the
// Prisma CLI through this `prisma.config.ts` file (loaded by every `prisma *`
// command via `defineConfig`). The Prisma *Client* itself receives the URL at
// runtime via its constructor in `src/lib/db.ts`.
//
// Why dotenv? `process.env.DATABASE_URL` is only populated in dev if `.env`
// (or `.env.local` is symlinked) is loaded. In production (Vercel / Neon
// Cloud), `dotenv/config` is a no-op because Vercel injects env vars at boot.
// ============================================================================

import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  // Path to the Prisma schema (source-of-truth data contract).
  schema: "prisma/schema.prisma",

  // Where generated SQL migrations land after `prisma migrate dev`.
  migrations: {
    path: "prisma/migrations",
  },

  // The runtime datasource URL consumed by every `prisma *` CLI command
  // (migrate, db push, studio, ...). For local dev this points to the
  // Supabase CLI Docker instance; for production it points to the Neon
  // Cloud project (use the pooled connection string on Vercel). Both are
  // supplied via the same `DATABASE_URL` env var.
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
