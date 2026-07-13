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
        "relative overflow-hidden bg-gradient-to-b from-primary/10 via-accent/5 to-background py-24 sm:py-28 lg:py-36",
        className,
      )}
    >
      {/* Vibrant gradient blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary/30 via-accent/20 to-transparent blur-3xl" />
        <div className="absolute -right-20 top-1/4 h-[350px] w-[350px] animate-pulse rounded-full bg-emerald-400/20 blur-3xl [animation-duration:4s]" />
        <div className="absolute -left-20 bottom-0 h-[400px] w-[400px] animate-pulse rounded-full bg-teal-500/15 blur-3xl [animation-duration:6s]" />
      </div>

      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary shadow-sm shadow-primary/10">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Now 100% Free Forever
        </div>

        {/* Headline */}
        <h1 className="text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Take Control of Your{" "}
          <span className="bg-gradient-to-r from-primary via-teal-500 to-emerald-500 bg-clip-text text-transparent">
            Financial Future
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
          Fintracko helps individuals and small teams track income, expenses,
          and budgets across multiple collaborative workspaces — all in one
          intuitive, secure platform.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-accent px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/40 transition-all hover:shadow-xl hover:shadow-primary/50 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-px"
          >
            Get Started Free
          </Link>
          <Link
            href="/#features"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-primary/20 bg-background/80 px-8 text-base font-semibold text-foreground backdrop-blur shadow-sm transition-all hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Explore Features
          </Link>
        </div>

        {/* Trust stats bar */}
        <div className="mx-auto mt-14 flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-muted-foreground">
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