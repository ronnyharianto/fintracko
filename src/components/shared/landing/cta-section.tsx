import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Landing page bottom CTA — color-enhanced.
 *
 * Full-width section with a bold multi-stop gradient banner card
 * (primary → emerald → accent). Decorative floating shapes add
 * depth. Dual CTAs and a social-proof tagline.
 */
export function CtaSection({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "relative overflow-hidden bg-background py-20 lg:py-28",
        className,
      )}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary via-emerald-500 to-accent px-6 py-16 text-center shadow-2xl shadow-primary/25 sm:px-12 lg:py-20">
          {/* Floating shapes */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <div className="absolute -left-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-10 -right-10 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
            <div className="absolute right-1/4 top-1/4 h-24 w-24 animate-pulse rounded-full bg-white/10 blur-xl [animation-duration:5s]" />
          </div>

          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl lg:text-5xl">
              Ready to Simplify Your Finances?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/85">
              Join thousands of users who trust Fintracko to keep their personal
              and business finances organized — completely free.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary-foreground px-10 text-base font-semibold text-primary shadow-lg transition-all hover:bg-primary-foreground/90 hover:shadow-xl active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/50 focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              >
                Start Tracking Now
              </Link>
              <Link
                href="/#how-it-works"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-primary-foreground/40 px-8 text-base font-medium text-primary-foreground/90 transition-all hover:bg-white/15"
              >
                Learn More &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
