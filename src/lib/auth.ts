/**
 * Better Auth configuration.
 *
 * Implements OAuth-first authentication with Google and GitHub providers.
 * Per docs/architecture/ARCHITECTURE.md §4.1 security requirements:
 *   - Reject OAuth payloads unless `email_verified` is explicitly true.
 *   - Account linking is disabled to prevent unsafe merges.
 *
 * Email/password credentials are enabled ONLY when
 * `process.env.NODE_ENV === "development"` (see `isDevelopment` below). In
 * production the credential endpoints stay disabled, so the deployed app
 * remains OAuth-only. This is a developer convenience for local testing, not
 * a production sign-in method.
 */

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./db";
import { requireEnv } from "./env";

/**
 * True only when the app runs under the Next.js development server. Evaluated
 * at module load so the Better Auth instance (built once per process) freezes
 * the correct credential policy.
 */
const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Better Auth `signIn` callback.
 *
 * Extracted as a named export so the exact behaviour (reject unless
 * `emailVerified === true`) lives in one place and stays independently verifiable
 * without spinning up Better Auth or a database.
 *
 * Google and GitHub OAuth payloads include an `email_verified` flag. We reject
 * any sign-in attempt where the provider did not explicitly verify the email.
 * Missing verification data is rejected rather than treated as verified.
 *
 * The one exception is a development credential sign-in: local email/password
 * accounts are never email-verified (no mailer is configured), so when
 * `isDevelopment` is true we accept `providerId === "credential"` without the
 * flag. Every OAuth provider still requires `emailVerified === true`, in every
 * environment.
 *
 * @throws Error("Email is not verified by the OAuth provider.") when an OAuth
 *   provider did not verify the email and the sign-in is not an accepted
 *   development credential sign-in.
 */
export async function signInCallback({
  user,
  account,
}: {
  user: { emailVerified: boolean | null | undefined };
  account?: { providerId?: string | null } | null;
}): Promise<{ user: { emailVerified: boolean | null | undefined } }> {
  const isDevCredentialSignIn =
    isDevelopment && account?.providerId === "credential";

  if (!isDevCredentialSignIn && user.emailVerified !== true) {
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
 *   - Account linking (disableAccountLinking: true)
 *   - Email/password authentication in production (`enabled: isDevelopment`,
 *     so the credential endpoints are refused unless running locally)
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
  // Developer convenience only: local email/password sign-up/sign-in. When
  // NODE_ENV is not "development" this is false, so Better Auth rejects the
  // credential endpoints and the app stays OAuth-only in production.
  emailAndPassword: {
    enabled: isDevelopment,
    // No mailer exists for local credential accounts; requiring verification
    // would make dev sign-up unusable.
    requireEmailVerification: false,
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
