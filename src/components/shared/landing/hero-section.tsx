import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Landing page hero — color-enhanced.
 *
 * Bold gradient headline, dual CTAs with glow shadows, vibrant
 * animated gradient blobs in teal/emerald, and a trust-indicator
 * stat bar. The section background uses a subtle teal wash.
 *
 * @remarks Pure Server Component.
 */
export function HeroSection({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "relative overflow-hidden bg-linear-to-b from-primary/10 via-accent/5 to-background py-10 sm:py-16 lg:py-20",
        className,
      )}
    >
      <div className="mx-auto max-w-4xl text-center px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary shadow-sm shadow-primary/10">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Start Tracking in Seconds
        </div>

        {/* Headline — carries the primary long-tail keywords (budget
            tracker / expense tracker) for search visibility. */}
        <h1 className="text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          The Budget &amp; Expense Tracker for{" "}
          <span className="bg-linear-to-r from-primary via-teal-500 to-emerald-500 bg-clip-text text-transparent">
            Shared Finances
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
          Fintracko helps individuals, families, and small teams track income,
          expenses, and budgets across multiple collaborative workspaces — all
          in one intuitive, secure platform.
        </p>

        {/* CTAs */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row my-10">
          <Link
            href="/account"
            className="inline-flex min-w-60 h-12 items-center justify-center rounded-xl bg-linear-to-r from-primary to-accent px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/40 transition-all hover:shadow-xl hover:shadow-primary/50 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-px"
          >
            Start Now
          </Link>
          <Link
            href="/#features"
            className="inline-flex min-w-60 h-12 items-center justify-center rounded-xl border border-primary/20 bg-background/80 px-8 text-base font-semibold text-foreground backdrop-blur shadow-sm transition-all hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Explore Features
          </Link>
        </div>

        {/* Trust stats bar */}
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            OAuth-Secured
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Real-Time Collaboration
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-teal-500" />
            Precision Budgeting
          </div>
        </div>
      </div>
    </section>
  );
}
