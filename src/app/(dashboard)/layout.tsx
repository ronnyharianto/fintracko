/**
 * Dashboard Layout.
 *
 * This layout wraps all private dashboard pages with the OnboardingGuardWrapper,
 * which ensures users have completed onboarding before accessing any dashboard
 * content.
 *
 * Per ARCHITECTURE.md §3:
 *   - Authentication and onboarding status checks are implemented via a React
 *     Server Component layout wrapper instead of global Next.js Middleware
 *   - The guard performs database verification for Profile existence
 *
 * Per PROJECT_STRUCTURE.md §2.1:
 *   - src/app/(dashboard)/ - Private core application layout bound strictly to
 *     the OnboardingGuardWrapper component
 */

import type { ReactNode } from "react";
import OnboardingGuardWrapper from "@/components/guards/onboarding-guard-wrapper";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <OnboardingGuardWrapper>{children}</OnboardingGuardWrapper>;
}
