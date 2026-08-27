/**
 * Onboarding Wizard Page.
 *
 * This page is displayed when a user has not yet completed onboarding
 * (no Profile record exists). It collects mandatory user settings and
 * creates the initial Profile and first Workspace.
 *
 * Users are redirected here by the OnboardingGuardWrapper
 * when they attempt to access workspace pages without completing onboarding.
 */

import { OnboardingForm } from "@/components/shared/onboarding/onboarding-form";
import { redirect } from "next/navigation";
import { getOnboardingState } from "@/features/onboarding/guards";

export default async function OnboardingPage() {
  const { profile, workspace } = await getOnboardingState();

  if (workspace) {
    redirect("/dashboard");
  }

  if (profile) {
    redirect("/onboarding/workspace");
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <OnboardingForm />
    </div>
  );
}
