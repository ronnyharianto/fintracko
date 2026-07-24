/**
 * Onboarding Wizard Page.
 *
 * This page is displayed when a user has not yet completed onboarding
 * (no Profile record exists). It collects mandatory user settings and
 * creates the initial Profile and first Workspace.
 *
 * Per ARCHITECTURE.md §3: Users are redirected here by the OnboardingGuardWrapper
 * when they attempt to access dashboard pages without completing onboarding.
 */

import { OnboardingForm } from "@/components/shared/onboarding/onboarding-form";

export default function OnboardingPage() {
  return (
    <div className="flex flex-col items-center justify-center">
      <OnboardingForm />
    </div>
  );
}
