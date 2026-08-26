"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCwIcon } from "lucide-react";
import { StatusScreen } from "@/components/shared/status-screen";

/**
 * Global root error boundary.
 *
 * Per the Next.js App Router contract, `error.tsx` MUST be a Client Component
 * (`"use client"`) — it owns its own state and exposes a `reset()` escape hatch
 * that the framework passes in to attempt re-rendering the errored segment.
 *
 * This boundary captures uncaught exceptions thrown by ANY Server/Client Component
 * below the root `layout.tsx` (excluding the layout itself). When an error lands
 * we render the landing-consistent [`StatusScreen`](src/components/shared/status-screen.tsx)
 * shell with a friendly message and dual CTAs: a primary "Back to Home"
 * and a secondary "Try Again" that invokes `reset()`.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled route error:", error);
  }, [error]);

  return (
    <StatusScreen
      badge={
        <>
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Something went wrong
        </>
      }
      title="A transaction hiccupped"
      description="An unexpected error occurred while rendering this page. Your data is safe — try again, or head back home. If the problem persists, refreshing the page usually resolves it."
    >
      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-linear-to-r from-primary to-accent px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/40 transition-all hover:shadow-xl hover:shadow-primary/50 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-px"
        >
          Back to Home
        </Link>
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-background/80 px-8 text-base font-semibold text-foreground shadow-sm backdrop-blur transition-all hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <RotateCwIcon className="h-4 w-4" aria-hidden="true" />
          Try Again
        </button>
      </div>
    </StatusScreen>
  );
}
