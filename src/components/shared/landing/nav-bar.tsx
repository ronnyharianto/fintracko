"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { FintrackoLogo } from "@/components/shared/fintracko-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { authClient } from "@/lib/auth-client";

/**
 * Public landing page navigation bar — color-enhanced.
 *
 * Glass-morphism header with a subtle teal-tinted backdrop, the
 * FintrackoLogo, desktop nav links, and dual CTA buttons or dashboard link.
 *
 * @remarks Client Component.
 */
export function NavBar({ className }: { className?: string }) {
  const [session, setSession] = useState<{ user?: { id?: string } } | null>(
    null,
  );

  useEffect(() => {
    authClient
      .getSession()
      .then((res) => {
        if (res?.data) {
          setSession(res.data);
        }
      })
      .catch(() => {
        setSession(null);
      });
  }, []);

  const isAuthenticated = Boolean(session?.user?.id);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-primary/15 bg-linear-to-r from-primary/5 via-accent/5 to-primary/5 backdrop-blur-md supports-backdrop-filter:bg-background/60",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-lg p-1 transition-all hover:opacity-80"
        >
          <FintrackoLogo className="h-8 w-8 transition-transform group-hover:scale-105" />
          <span className="text-xl font-bold tracking-tight text-foreground">
            Fintracko
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Features
          </Link>
          <Link
            href="/#how-it-works"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            How It Works
          </Link>
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span className="hidden h-5 w-px bg-border sm:inline-block" />
          {isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                className="inline-flex h-9 items-center justify-center rounded-md bg-linear-to-r from-primary to-accent px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/30 transition-all hover:shadow-md hover:shadow-primary/40 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await authClient.signOut();
                  window.location.href = "/login";
                }}
                className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-foreground transition-colors hover:text-primary"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden h-9 items-center rounded-md px-4 text-sm font-medium text-foreground transition-colors hover:text-primary sm:inline-flex"
              >
                Log In
              </Link>
              <Link
                href="/login"
                className="inline-flex h-9 items-center justify-center rounded-md bg-linear-to-r from-primary to-accent px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/30 transition-all hover:shadow-md hover:shadow-primary/40 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
