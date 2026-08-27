/**
 * Workspace Setup Page (Step 2 of Onboarding).
 *
 * Displayed after the user completes their profile setup. Collects
 * workspace name and template selection, then creates the first workspace
 * with seeded categories from the chosen template.
 *
 * Guarded by the (onboarding) layout which ensures:
 *   - User has an active session
 *   - User has completed profile setup (Profile exists)
 *   - User does NOT yet have a workspace
 *
 * @remarks Server Component. The interactive WorkspaceSetupForm is a
 * Client Component imported below.
 */

import { WorkspaceSetupForm } from "@/components/shared/onboarding/workspace-setup-form";
import { getOnboardingState } from "@/features/onboarding/guards";
import { redirect } from "next/navigation";

export default async function WorkspaceSetupPage() {
  const { profile, workspace } = await getOnboardingState();

  if (workspace) {
    redirect("/dashboard");
  }

  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <WorkspaceSetupForm />
    </div>
  );
}
