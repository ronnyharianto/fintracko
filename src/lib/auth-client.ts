/**
 * Better Auth front-end client.
 *
 * This module exposes a browser-safe, type-safe client used by Client
 * Components (e.g. the `/login` and `/register` pages) to trigger OAuth
 * sign-in flows against the Better Auth route handler mounted at
 * `/api/v1/auth/[...better-auth]`.
 *
 * It is deliberately separated from `src/lib/auth.ts`, which imports
 * `@/lib/db` (a server-only Prisma client) and cannot be bundled into the
 * browser. Per docs/core/AGENT_RULES.md §2, server-only concerns must not
 * leak into Client Components — `createAuthClient` from `better-auth/client`
 * performs only fetch calls and is safe to ship to the browser.
 *
 * Configuration:
 *   - `baseURL` is omitted so Better Auth resolves the origin to
 *     `window.location.origin` in the browser.
 *   - `basePath` MUST mirror `auth.basePath` in `src/lib/auth.ts` and the
 *     mounted route handler (`src/app/api/v1/auth/[...better-auth]`).
 *     Better Auth's default is "/api/auth", but this project serves the
 *     handler under the versioned "/api/v1/auth" path. Without this the
 *     client would POST to `/api/auth/sign-in/social` and 404.
 */
 
import { createAuthClient } from "better-auth/client";

/**
 * Auth client instance for use in Client Components.
 *
 * Usage:
 * ```tsx
 * "use client";
 * import { authClient } from "@/lib/auth-client";
 *
 * await authClient.signIn.social({ provider: "google" });
 * ```
 *
 * Available methods (selected):
 *   - `signIn.social({ provider })` — initiate an OAuth sign-in with Google or GitHub
 *   - `signIn.email({ email, password })`  — development-only credential sign-in
 *   - `signUp.email({ name, email, password })` — development-only account creation
 *   - `signOut()`                   — invalidate the current session and clear the cookie
 *   - `getSession()`                — fetch the active session (or null)
 *   - `updateUser({ name })`        — persist profile changes (used by the account settings page)
 *
 * The `email` methods only succeed while the server runs in development
 * (`emailAndPassword.enabled` in `src/lib/auth.ts`). In production Better Auth
 * rejects them and the form that calls them is not rendered.
 */
export const authClient = createAuthClient({
  basePath: "/api/v1/auth",
});

/**
 * Convenience alias for the union of OAuth providers enabled in
 * `src/lib/auth.ts` (google | github). Pages import this to constrain
 * the `provider` argument passed to `authClient.signIn.social`.
 */
export type OAuthProvider = "google" | "github";
