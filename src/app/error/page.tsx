"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { StatusScreen } from "@/components/shared/status-screen";

/**
 * Dedicated auth-error landing page (`/error`).
 *
 * When a Better Auth OAuth flow fails server-side (e.g. an
 * `account_not_linked` error because account linking is disabled and the
 * email already belongs to an account signed up through a different
 * provider — see `src/lib/auth.ts`), Better Auth redirects the browser
 * back to the `errorCallbackURL` configured on the client
 * `signIn.social()` call (`src/components/shared/auth/oauth-buttons.tsx`),
 * appending `?error=<code>` (and optionally `?error_description=`).
 *
 * Historically the failure redirected to the success `callbackURL`
 * (`/onboarding`), which 404-routed/soft-redirected to the marketing
 * homepage with the raw `?error=account_not_linked` query string left
 * dangling and no user-facing feedback. Routing failures here instead
 * lets us show a friendly, actionable message via
 * [`StatusScreen`](src/components/shared/status-screen.tsx).
 *
 * @remarks Client Component because `useSearchParams()` is a client hook
 * and requires reading the URL at render time. This file does NOT replace
 * `src/app/error.tsx` (the App Router error boundary) — the two coexist:
 * this route is a *navigational* destination, the boundary catches
 * *thrown* render errors.
 */

/**
 * Maps known Better Auth `?error=` codes to a friendly title + description.
 *
 * `account_not_linked` — the canonical OAuth identity-mismatch case.
 * Other codes (e.g. `access_denied`, `oauth_provider_error`) fall back to
 * a generic message so we never leak provider internals to the end user.
 */
const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  account_not_linked: {
    title: "Account already exists",
    description:
      "This email is already connected to a different sign-in method. Please sign in using the provider you originally registered with (Google or GitHub), or contact support if you believe this is a mistake.",
  },
};

function resolveError(code: string | null) {
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }
  return {
    title: "Sign-in didn't complete",
    description:
      "We couldn't finish signing you in. The sign-in window may have been closed early, or the provider refused the request. Try again, or head back home if you'd like to start over.",
  };
}

export default function AuthErrorPage() {
  // `useSearchParams` must be read inside a Suspense boundary so this route
  // can be statically rendered — without it, `next build` fails with the
  // `missing-suspense-with-csr-bailout` error.
  return (
    <Suspense fallback={null}>
      <AuthErrorContent />
    </Suspense>
  );
}

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("error");
  const { title, description } = resolveError(code);

  return (
    <StatusScreen
      badge={
        <>
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Sign-in problem
        </>
      }
      title={title}
      description={description}
    >
      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link
          href="/account"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-linear-to-r from-primary to-accent px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/40 transition-all hover:shadow-xl hover:shadow-primary/50 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-px"
        >
          Try signing in again
        </Link>
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-xl border border-primary/20 bg-background/80 px-8 text-base font-semibold text-foreground shadow-sm backdrop-blur transition-all hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Back to Home
        </Link>
      </div>
    </StatusScreen>
  );
}
