/**
 * Onboarding Guard Wrapper Server Component.
 *
 * Implements the "Onboarding & Auth Guard" from ARCHITECTURE.md §3:
 *   - Retrieves the current active session via Better Auth server session helper
 *   - If no session exists, performs server-side redirect to /account
 *   - Queries database for Profile record linked to authenticated userId
 *   - If no Profile exists, redirects to /onboarding
 *   - If Profile exists but no workspace, redirects to /onboarding/workspace
 *   - If Profile exists and has workspace, renders children normally
 *
 * This is a Server Component (no 'use client') that wraps all private
 * dashboard pages at the layout level (src/app/(workspace)/layout.tsx).
 */

import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getOnboardingState } from "@/features/onboarding/guards";

interface OnboardingGuardWrapperProps {
  children: ReactNode;
}

/**
 * Onboarding Guard Wrapper Component.
 *
 * This Server Component performs the following guard logic:
 * 1. Retrieve the current active session via Better Auth
 * 2. If no session → redirect to /account
 * 3. Query database for Profile record linked to userId
 * 4. If no Profile → redirect to /onboarding
 * 5. If Profile exists but no workspace → redirect to /onboarding/workspace
 * 6. If Profile exists and has workspace → render children
 *
 * @param children - The child components to render if guard passes
 */
export default async function OnboardingGuardWrapper({
  children,
}: OnboardingGuardWrapperProps) {
  const { session, profile, workspace } = await getOnboardingState();

  if (!session) {
    redirect("/account");
  }

  // If no Profile exists, user has not completed onboarding
  if (!profile) {
    redirect("/onboarding");
  }

  // If no workspace, redirect to workspace setup
  if (!workspace) {
    redirect("/onboarding/workspace");
  }

  // Profile exists and has workspace — render children normally
  return <>{children}</>;
}
