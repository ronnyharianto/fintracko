import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Reusable full-screen status screen used by the Next.js special-route files
 * (`loading.tsx`, `not-found.tsx`, `error.tsx`).
 *
 * Visually identical to the landing-page hero ([`HeroSection`](src/components/shared/landing/hero-section.tsx)):
 * it reuses the same teal/emerald gradient wash, the animated blur blobs, the
 * brand badge pill, the gradient-clipped headline, and the dual-styled CTA so
 * that transient states (loading, 404, runtime error) feel native to the
 * product rather than a generic Next.js fallback.
 *
 * Slots:
 * - `badge`        – small pill above the headline (e.g. "404", "Error", "Loading")
 * - `title`        – the bold gradient headline (string is auto-styled; or pass `titleNode`)
 * - `titleNode`    – alternative to `title` for inline-styled headline fragments
 * - `description`  – the friendly supporting message
 * - `children`      – arbitrary content rendered below the description (e.g. a
 *                    spinner, a retry button). When omitted, a single primary
 *                    "Back to Home" CTA is rendered for a consistent escape hatch.
 *
 * @remarks Pure server-safe presentational component. The error boundary,
 * which needs interactivity, lives in `src/app/error.tsx` and simply wraps
 * this component inside a `"use client"` file while passing its own `children`.
 */
export function StatusScreen({
  badge,
  title,
  titleNode,
  description,
  children,
  className,
}: {
  badge?: React.ReactNode;
  title?: string;
  titleNode?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden bg-linear-to-b from-primary/10 via-accent/5 to-background py-24 sm:py-28 lg:py-36",
        className,
      )}
    >
      {/* Vibrant gradient blobs — mirrored from HeroSection for design parity */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-0 h-150 w-200 -translate-x-1/2 rounded-full bg-linear-to-br from-primary/30 via-accent/20 to-transparent blur-3xl" />
        <div className="absolute -right-20 top-1/4 h-87.5 w-87.5 animate-pulse rounded-full bg-emerald-400/20 blur-3xl [animation-duration:4s]" />
        <div className="absolute -left-20 bottom-0 h-100 w-100 animate-pulse rounded-full bg-teal-500/15 blur-3xl [animation-duration:6s]" />
      </div>

      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        {/* Badge pill */}
        {badge ? (
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary shadow-sm shadow-primary/10">
            {badge}
          </div>
        ) : null}

        {/* Headline */}
        {titleNode ? (
          <h1 className="text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {titleNode}
          </h1>
        ) : (
          <h1 className="text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            <span className="bg-linear-to-r from-primary via-teal-500 to-emerald-500 bg-clip-text text-transparent">
              {title}
            </span>
          </h1>
        )}

        {/* Description */}
        {description ? (
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
            {description}
          </p>
        ) : null}

        {/* Action area — default to "Back to Home" CTA when nothing is passed */}
        {children ?? (
          <Link
            href="/"
            className="mt-10 inline-flex h-12 items-center justify-center rounded-xl bg-linear-to-r from-primary to-accent px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/40 transition-all hover:shadow-xl hover:shadow-primary/50 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-px"
          >
            Back to Home
          </Link>
        )}
      </div>
    </section>
  );
}
