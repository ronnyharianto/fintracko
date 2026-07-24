import type { Metadata } from "next";
import Link from "next/link";
import { FintrackoLogo } from "@/components/shared/fintracko-logo";

/**
 * Onboarding route group layout.
 *
 * Wraps the onboarding wizard screen with a minimal, distraction-free shell
 * centered on the Fintracko brand mark. Similar to the (auth) layout, there
 * is no NavBar or Footer here — the goal is to guide the user through
 * completing their profile setup.
 *
 * Per ARCHITECTURE.md §3: This layout is used for the onboarding wizard
 * that users are redirected to when they have not yet completed onboarding.
 */
export default function OnboardingLayout({
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
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

/**
 * SEO metadata for onboarding pages. These routes are not meant to be indexed.
 */
export const metadata: Metadata = {
  title: "Fintracko — Complete your profile",
  robots: {
    index: false,
    follow: false,
  },
};
