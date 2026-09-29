"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { FintrackoLogo } from "@/components/shared/fintracko-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { authClient } from "@/lib/auth-client";
import { useSession } from "@/components/shared/auth/session-provider";

/**
 * Public landing page navigation bar — color-enhanced.
 *
 * Glass-morphism header with a subtle teal-tinted backdrop, the
 * FintrackoLogo, desktop nav links, and dual CTA buttons or dashboard link.
 *
 * @remarks Client Component.
 */
const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#faq", label: "FAQ" },
] as const;

export function NavBar({ className }: { className?: string }) {
  const { user } = useSession();
  const isAuthenticated = Boolean(user?.id);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-primary/15 bg-linear-to-r from-primary/5 via-accent/5 to-primary/5 backdrop-blur-md supports-backdrop-filter:bg-background/60",
        className,
      )}
    >
      {/* Row never wraps; the wordmark yields on very narrow screens so the
          fixed-size buttons keep a single-line height (no clipped labels). */}
      <div className="mx-auto flex h-16 max-w-7xl flex-nowrap items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2 rounded-lg p-1 transition-all hover:opacity-80"
        >
          <FintrackoLogo className="h-8 w-8 shrink-0 transition-transform group-hover:scale-105" />
          <span className="hidden min-[420px]:inline text-xl font-bold tracking-tight text-foreground">
            Fintracko
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle className="shrink-0" />
          <span className="hidden h-5 w-px shrink-0 bg-border sm:inline-block" />
          {isAuthenticated ? (
            <>
              <Link
                href="/transactions"
                className="inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-linear-to-r from-primary to-accent px-3 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/30 transition-all hover:shadow-md hover:shadow-primary/40 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-5"
              >
                Go to App
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await authClient.signOut();
                  window.location.href = "/account";
                }}
                className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-md px-2.5 text-sm font-medium text-foreground transition-colors hover:text-primary sm:px-4"
              >
                Log Out
              </button>
            </>
          ) : (
            <Link
              href="/account"
              className="inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-linear-to-r from-primary to-accent px-4 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/30 transition-all hover:shadow-md hover:shadow-primary/40 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-5"
            >
              Get Started
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
