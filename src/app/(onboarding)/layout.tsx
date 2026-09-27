import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FintrackoLogo } from "@/components/shared/fintracko-logo";
import { getOnboardingSession } from "@/features/onboarding/guards";

/**
 * Onboarding route group layout with authentication and shared page shell.
 *
 * Guard logic:
 *   1. No session → redirect to /account
 *   2. Route-specific pages enforce the current onboarding step
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getOnboardingSession();

  // If no session exists, redirect to account page
  if (!session || !session.user?.id) {
    redirect("/account");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-background px-4 py-12 overflow-y-auto">
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
      <div className="w-full max-w-lg md:max-w-xl lg:max-w-2xl">{children}</div>
    </div>
  );
}

/**
 * SEO metadata for onboarding pages. These routes are not meant to be indexed.
 */
export const metadata: Metadata = {
  title: "Complete your profile",
  robots: {
    index: false,
    follow: false,
  },
};
