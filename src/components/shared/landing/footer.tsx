import Link from "next/link";
import { cn } from "@/lib/utils";
import { FintrackoLogo } from "@/components/shared/fintracko-logo";

/**
 * Public site footer — color-enhanced.
 *
 * Uses a teal-tinted surface, gradient top accent line, the
 * FintrackoLogo, grouped link columns, and legal links. There is
 * deliberately no contact section — re-add one only once a real,
 * monitored channel exists (never render an unreachable address).
 */
export function Footer({ className }: { className?: string }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "relative border-t border-primary/15 bg-linear-to-b from-primary/5 to-muted/30",
        className,
      )}
    >
      {/* Gradient top accent */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-transparent via-primary to-transparent"
      />

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
          {/* Branding */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 rounded-lg p-1 transition-all hover:opacity-80"
            >
              <FintrackoLogo className="h-8 w-8" />
              <span className="text-xl font-bold tracking-tight text-foreground">
                Fintracko
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Smart financial tracking for individuals and small teams.
              Collaborative, secure, and simple to use.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">
              Product
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/#features"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/#how-it-works"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link
                  href="/#faq"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/account"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">
              Legal
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-of-service"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom */}
        <div className="mt-12 border-t border-border pt-6">
          <p className="text-center text-xs text-muted-foreground">
            &copy; {currentYear} Fintracko. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
