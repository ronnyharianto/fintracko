"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient, type OAuthProvider } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * OAuthButtons — renders Continue with Google / GitHub sign-in buttons.
 *
 * Used by the `/login` and `/register` pages (the `(auth)` route group)
 * to trigger OAuth flows via the Better Auth front-end client
 * (`src/lib/auth-client.ts`). Each button calls
 * `authClient.signIn.social({ provider })`, which redirects the browser
 * to the provider's consent screen; Better Auth then completes the
 * callback against `/api/v1/auth/[...better-auth]`.
 *
 * Per `src/lib/auth.ts`, password authentication is disabled, so OAuth
 * is the only sign-in mechanism. Account linking is also disabled, so
 * an existing account cannot be silently merged across providers.
 *
 * @remarks Client Component ("use client") — required for the onClick
 * handlers and per-button loading/pending state.
 */
export function OAuthButtons({
  /** Optional heading shown above the buttons. */
  title,
  className,
}: {
  title?: string;
  className?: string;
}) {
  // Tracks which provider (if any) is mid-redirect so we can show a
  // pending state on exactly one button and disable the sibling.
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(
    null,
  );

  async function handleSignIn(provider: OAuthProvider) {
    // Avoid double-submit while a redirect is already in flight.
    if (pendingProvider !== null) return;
    setPendingProvider(provider);
    try {
      const { error } = await authClient.signIn.social({
        provider,
        // Return the user to the page they came from after the OAuth
        // round-trip, if a callback URL is available on `window`.
        callbackURL:
          typeof window !== "undefined"
            ? window.location.origin + "/onboarding"
            : undefined,
      });

      if (error) {
        toast.warning(
          error.message ?? "Failed to proceed further with authentication",
        );
      }
    } catch {
      toast.error("An unexpected error occurred during authentication");
      // Catch any errors that might occur during the sign-in process
      // and ensure we clear the pending state
    } finally {
      // Ensure we always clear the pending state, even on success or error
      // This prevents the button from being stuck in a loading state
      setPendingProvider(null);
    }
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {title ? (
        <p className="text-center text-sm text-muted-foreground">{title}</p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={pendingProvider !== null}
        onClick={() => handleSignIn("google")}
        data-testid="oauth-google"
      >
        <GoogleIcon />
        {pendingProvider === "google" ? "Redirecting…" : "Continue with Google"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={pendingProvider !== null}
        onClick={() => handleSignIn("github")}
        data-testid="oauth-github"
      >
        <GitHubIcon />
        {pendingProvider === "github" ? "Redirecting…" : "Continue with GitHub"}
      </Button>
    </div>
  );
}

/**
 * Inline Google "G" logo SVG (monochrome-friendly official multi-color).
 * Sized via the parent button's `[&_svg]:size-4` shorthand.
 */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

/**
 * Inline GitHub mark (monochrome; inherits currentColor for dark mode).
 */
function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.28 0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
    </svg>
  );
}
