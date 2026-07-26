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

import type { ReactNode } from 'react';
import OnboardingGuardWrapper from '@/components/guards/onboarding-guard-wrapper';
import Sidebar from '@/components/shared/sidebar';
import { TopBar } from '@/components/shared/workspace/top-bar';
import { SidebarProvider } from '@/components/shared/sidebar';
import { WorkspaceProvider } from '@/components/shared/workspace-context';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <OnboardingGuardWrapper>
      <WorkspaceProvider>
        <SidebarProvider>
          <div className="min-h-screen bg-background text-foreground">
            <TopBar />
            <div className="flex flex-1 lg:pt-0">
              <Sidebar />
              <main className="flex-1 p-6 lg:ml-64">{children}</main>
            </div>
          </div>
        </SidebarProvider>
      </WorkspaceProvider>
    </OnboardingGuardWrapper>
  );
}
