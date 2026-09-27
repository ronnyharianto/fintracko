import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

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
        "relative overflow-hidden bg-background py-10 lg:py-20",
        className,
      )}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary via-emerald-500 to-accent px-6 py-16 text-center shadow-2xl shadow-primary/25 sm:px-12 lg:py-20">
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl lg:text-5xl">
              Ready to Simplify Your Finances?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/85">
              Join thousands of users who trust Fintracko to keep their personal
              and business finances organized — sign up in seconds.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/account"
                className="inline-flex h-12 min-w-60 items-center justify-center rounded-xl bg-primary-foreground px-8 text-base font-semibold text-primary shadow-lg transition-all hover:bg-primary-foreground/90 hover:shadow-xl active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/50 focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              >
                Start Tracking Now
              </Link>
              <Link
                href="/#how-it-works"
                className="inline-flex h-12 min-w-60 items-center justify-center gap-2 rounded-xl border border-primary-foreground/40 px-8 text-base font-medium text-primary-foreground/90 transition-all hover:bg-white/15"
              >
                Learn More
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
