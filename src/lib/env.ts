/**
 * Environment variable validation helpers (R3).
 *
 * Server startup/config modules (`src/lib/db.ts`, `src/lib/auth.ts`) use
 * {@link requireEnv} instead of `process.env.X!` non-null assertions so a
 * missing variable fails fast with a clear message — rather than surfacing
 * later as an obscure Prisma/Better Auth connection error. The full variable
 * list lives in `.env.example` (the committed template).
 */

/**
 * Read a required environment variable, throwing a descriptive error when it
 * is missing or blank.
 *
 * @param name — variable name as documented in `.env.example`.
 * @throws Error when the variable is unset or empty.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        'Set it in .env.local (see .env.example) before starting the server.'
    );
  }
  return value;
}
