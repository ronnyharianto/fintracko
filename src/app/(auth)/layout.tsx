import type { Metadata } from "next";
import Link from "next/link";
import { FintrackoLogo } from "@/components/shared/fintracko-logo";

/**
 * Auth route group layout.
 *
 * Wraps all authentication screens (`/login`, `/register`) with a
 * minimal, distraction-free shell centered on the Fintracko brand
 * mark. Unlike the `(marketing)` layout, there is no NavBar or Footer
 * here — the goal is to funnel the visitor toward the OAuth
 * sign-in/register action and nothing else (per the OAuth-only auth
 * model defined in `src/lib/auth.ts`).
 *
 * @remarks Per docs/core/AGENT_RULES.md §11, this layout is a Server
 * Component by default; no client interactivity is required.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2"
        aria-label="Fintracko home"
      >
        <FintrackoLogo className="h-8 w-8" />
        <span className="text-xl font-semibold tracking-tight text-foreground">
          Fintracko
        </span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

/**
 * SEO metadata shared by all auth pages. These routes are not meant to
 * be indexed — they are conversion entry points, not content.
 */
export const metadata: Metadata = {
  title: "Fintracko — Sign in",
  robots: {
    index: false,
    follow: false,
  },
};
