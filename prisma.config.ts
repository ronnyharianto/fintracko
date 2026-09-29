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

import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: [".env.local", ".env"] });

export default defineConfig({
  // Path to the Prisma schema (source-of-truth data contract).
  schema: "prisma/schema.prisma",

  // Where generated SQL migrations land after `prisma migrate dev`.
  migrations: {
    path: "prisma/migrations",
  },

  // Use the direct endpoint for Prisma CLI operations when configured.
  // Runtime application connections use DATABASE_URL in src/lib/db.ts.
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
