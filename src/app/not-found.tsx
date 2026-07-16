import type { Metadata } from "next";
import Link from "next/link";
import { StatusScreen } from "@/components/shared/status-screen";

/**
 * Global 404 (Not Found) page.
 *
 * Rendered by the App Router whenever no route matches the requested path.
 * Mirrors the landing-page hero through the [`StatusScreen`](src/components/shared/status-screen.tsx)
 * shell — same teal gradient wash, animated blobs, and gradient-clipped
 * headline — so a missed URL still feels like part of the product.
 *
 * @remarks Pure Server Component. `not-found.tsx` may export `metadata`
 * (unlike `error.tsx`), which we use here to keep the 404 out of the index
 * while keeping the existing `<title>` templated by the root layout.
 */
export const metadata: Metadata = {
  title: "Page Not Found — Fintracko",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <StatusScreen
      badge={
        <>
          <span className="h-2 w-2 rounded-full bg-primary" />
          404
        </>
      }
      title="Lost in the ledger"
      description="We couldn't find the page you're looking for. It may have been moved, renamed, or never existed. Let's get you back to safe ground."
    >
      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-linear-to-r from-primary to-accent px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/40 transition-all hover:shadow-xl hover:shadow-primary/50 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-px"
        >
          Back to Home
        </Link>
        <Link
          href="/#features"
          className="inline-flex h-12 items-center justify-center rounded-xl border border-primary/20 bg-background/80 px-8 text-base font-semibold text-foreground shadow-sm backdrop-blur transition-all hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Explore Features
        </Link>
      </div>
    </StatusScreen>
  );
}
