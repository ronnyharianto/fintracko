/**
 * Better Auth configuration.
 *
 * Implements OAuth-only authentication (no password login) with Google and
 * GitHub providers. Per docs/architecture/ARCHITECTURE.md §4.1 security
 * requirements:
 *   - Explicitly reject OAuth payloads where `email_verified` is false.
 *   - Account linking is disabled to prevent unsafe merges.
 */

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./db";
import { requireEnv } from "./env";

/**
 * Better Auth `signIn` callback.
 *
 * Extracted as a named export so the exact behaviour (reject
 * `emailVerified === false`, pass through every other value including
 * `null`/`undefined`) lives in one place and stays independently verifiable
 * without spinning up Better Auth or a database.
 *
 * Google and GitHub OAuth payloads include an `email_verified` flag. We reject
 * any sign-in attempt where the email has not been verified by the provider,
 * as unverified emails could belong to any user who can receive mail at that
 * address. `null` / `undefined` are passed through unchanged: a missing flag
 * is treated as "provider did not assert" rather than a hard reject, matching
 * Better Auth's own contract for callers that legitimately omit the field.
 *
 * @throws Error("Email is not verified by the OAuth provider.") when
 *   `user.emailVerified === false`.
 */
export async function signInCallback({
  user,
}: {
  user: { emailVerified: boolean | null | undefined };
}): Promise<{ user: { emailVerified: boolean | null | undefined } }> {
  if (user.emailVerified === false) {
    throw new Error("Email is not verified by the OAuth provider.");
  }
  return {
    user: {
      emailVerified: user.emailVerified,
    },
  };
}

/**
 * Better Auth instance configured for OAuth-only authentication.
 *
 * Features enabled:
 *   - OAuth sign-in via Google and GitHub
 *   - Session cookie management (HttpOnly, secure in production)
 *   - Account and session storage via Prisma adapter
 *
 * Features explicitly disabled:
 *   - Password authentication (emailAndPassword: false)
 *   - Account linking (disableAccountLinking: true)
 */
export const auth = betterAuth({
  // Base path matches the Next.js route handler at
  // src/app/api/v1/auth/[...better-auth]/route.ts. Both the server and
  // the browser client MUST use the same basePath so that sign-in requests
  // and OAuth callback URLs resolve to the mounted handler. The default
  // is "/api/auth", which would 404 against the project's versioned
  // /api/v1/auth/* handler.
  basePath: "/api/v1/auth",
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  // B7: derive trusted origins from BETTER_AUTH_URL instead of a hardcoded
  // localhost literal — in production the app origin must match the deployed
  // host or OAuth callback / session validation can break.
  trustedOrigins: [requireEnv("BETTER_AUTH_URL")],
  // R3: validate the cookie-signing secret explicitly so a missing value
  // fails fast with a clear message instead of a cryptic Better Auth error.
  secret: requireEnv("BETTER_AUTH_SECRET"),
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    google: {
      clientId: requireEnv("AUTH_GOOGLE_ID"),
      clientSecret: requireEnv("AUTH_GOOGLE_SECRET"),
    },
    github: {
      clientId: requireEnv("AUTH_GITHUB_ID"),
      clientSecret: requireEnv("AUTH_GITHUB_SECRET"),
    },
  },
  // ---- Database model mapping (Task 2.2) -------------------------------------
  // Better Auth's Prisma adapter expects four core tables named
  // `user` / `account` / `session` / `verification` by default. This project
  // uses different physical table names:
  //   - `User` (same name, mapped here for clarity)
  //   - `AuthAccount` (renamed to avoid the financial `Account` table
  //     collision — see ARCHITECTURE.md §AuthAccount; the schema comment
  //     calls this "modelMapping wired during Task 2.2", which this block now
  //     actually does)
  //   - `Session` (same name)
  //   - `Verification` (new table backing Better Auth's `verification` model)
  // Without `modelName` on each entry, the adapter queried the default
  // names — e.g. `account` does not exist (it is `AuthAccount`), and
  // `verification` had no backing table at all, producing
  // "Model verification does not exist in the database" during OAuth sign-in.
  user: {
    modelName: "User",
  },
  session: {
    modelName: "Session",
  },
  account: {
    modelName: "AuthAccount",
    accountLinking: {
      enabled: false,
    },
  },
  verification: {
    modelName: "Verification",
  },
  // ------------------------------------------------------------------
  callbacks: {
    /**
     * Enforce email verification for OAuth sign-ins.
     *
     * Delegates to {@link signInCallback} so the exact same logic lives in
     * one place. Keeping the function hoisted out of the `betterAuth({...})`
     * literal avoids a stale duplicate that could drift from the real
     * configured behavior.
     */
    signIn: signInCallback,
  },
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
});

