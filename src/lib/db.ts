/**
 * Prisma database client singleton.
 *
 * Per docs/core/PROJECT_STRUCTURE.md §2.4, this module hosts the singleton
 * script managing connection instances for the Prisma database client.
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
 *   exhaust the Supabase connection pool within seconds. We therefore cache
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
 * In development we surface `query` logs to ease debugging of generated SQL;
 * production only logs `error` to avoid noisy stdout on Vercel.
 *
 * The `adapter` (PrismaPg driver adapter) carries the runtime connection
 * string — this mirrors what `prisma.config.ts` provides to the CLI at
 * build time. Prisma 7 no longer accepts `datasourceUrl` directly.
 */
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const db: PrismaClient =
  globalThis.__prismaClient ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prismaClient = db;
}

export { db };
