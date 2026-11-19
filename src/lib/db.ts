/**
 * Prisma database client singleton.
 *
 * This module hosts the singleton script managing connection instances for
 * the Prisma database client.
 *
 * Prisma 7 contract note:
 *   In Prisma 7 the client is no longer auto-installed into
 *   `node_modules/@prisma/client` — instead, `prisma generate` emits the
 *   client source into the path declared by `generator.output` in
 *   `prisma/schema.prisma` (here: `./generated/prisma`). We import the
 *   `PrismaClient` symbol from that location and supply a `PrismaPg` driver
 *   adapter (from `@prisma/adapter-pg`) that carries the runtime
 *   `DATABASE_URL` at instantiation; the schema file no longer holds it.
 *
 * Singleton rationale:
 *   Next.js dev mode (and Serverless functions) can re-import modules on every
 *   request or hot-reload. Instantiating a new `PrismaClient` each time would
 *   exhaust the database connection pool within seconds. We therefore cache
 *   the client on `globalThis` outside of production, so the same instance is
 *   reused across reloads without leaking handles.
 *
 * Usage in Route Handlers / feature services:
 *   ```ts
 *   import { db } from "@/lib/db";
 *   const workspace = await db.workspace.findUnique({ where: { id } });
 *   ```
 */
// Prisma 7 ships the client source into the path declared by
// `generator.output` in `prisma/schema.prisma` (here: `./generated/prisma`).
// We import the `PrismaClient` symbol from that location rather than from
// the bare `@prisma/client` package, which no longer re-exports it directly.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { requireEnv } from "./env";

// Augment the global namespace so TypeScript recognises our cached client.
// Declared here (and not in a separate `*.d.ts`) to keep the singleton logic
// and its type contract co-located.
declare global {
  var __prismaClient: PrismaClient | undefined;
}

/**
 * Lazily-instantiated Prisma Client. Reused across HMR reloads in dev via the
 * `__prismaClient` cache on `globalThis`.
 *
 * Outside production we log `warn` and `error`; production only logs `error`
 * to avoid noisy stdout on Vercel. Prisma `query` logs include the bound
 * parameters (transaction amounts, payees, descriptions, account names and
 * email addresses), so they are never enabled by `NODE_ENV` alone: an operator
 * must set `LOG_PRISMA_QUERIES=1`, and the flag is ignored in production.
 *
 * The `adapter` (PrismaPg driver adapter) carries the runtime connection
 * string — this mirrors what `prisma.config.ts` provides to the CLI at
 * build time. Prisma 7 no longer accepts `datasourceUrl` directly.
 */
// R3: fail fast with a clear message when DATABASE_URL is missing, instead
// of letting the driver throw an opaque connection error at first use.
const adapter = new PrismaPg({
  connectionString: requireEnv("DATABASE_URL"),
});

const isProduction = process.env.NODE_ENV === "production";

// Opt-in only: query logs embed bound financial and personal parameters, so a
// shared dev or staging environment must not emit them merely because it runs
// with NODE_ENV !== "production".
const logPrismaQueries =
  !isProduction && process.env.LOG_PRISMA_QUERIES === "1";

const db: PrismaClient =
  globalThis.__prismaClient ??
  new PrismaClient({
    adapter,
    log: logPrismaQueries
      ? ["query", "warn", "error"]
      : isProduction
        ? ["error"]
        : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prismaClient = db;
}

export { db };
