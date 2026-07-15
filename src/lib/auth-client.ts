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
 *   - `baseURL` points at the Better Auth route handler origin. In the
 *     browser it defaults to the current origin, so we omit it and let
 *     Better Auth resolve relative to `window.location.origin`.
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
 *   - `signOut()`                   — invalidate the current session and clear the cookie
 *   - `getSession()`                — fetch the active session (or null)
 */
export const authClient = createAuthClient();

/**
 * Convenience alias for the union of OAuth providers enabled in
 * `src/lib/auth.ts` (google | github). Pages import this to constrain
 * the `provider` argument passed to `authClient.signIn.social`.
 */
export type OAuthProvider = "google" | "github";
