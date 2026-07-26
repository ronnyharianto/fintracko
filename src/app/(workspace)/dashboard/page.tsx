/**
 * Dashboard Page.
 *
 * This page is displayed when a user has completed onboarding
 * and is ready to use the application.
 *
 * Per ARCHITECTURE.md §3: Users are redirected here by the OnboardingGuardWrapper
 * when they attempt to access dashboard pages without completing onboarding.
 */

export default function DashboardPage() {
  return (
    <div className="flex flex-col items-center justify-center">
      <h1>Dashboard</h1>
    </div>
  );
}
