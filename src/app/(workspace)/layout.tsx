/**
 * Dashboard Layout.
 *
 * This layout wraps all private dashboard pages with the OnboardingGuardWrapper,
 * which ensures users have completed onboarding before accessing any dashboard
 * content.
 *
 * Private core application layout bound strictly to
 * the OnboardingGuardWrapper component
 */

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import OnboardingGuardWrapper from '@/components/guards/onboarding-guard-wrapper';
import Sidebar from '@/components/shared/workspace/sidebar';
import { TopBar } from '@/components/shared/workspace/top-bar';
import { SidebarProvider } from '@/components/shared/workspace/sidebar';
import { WorkspaceProvider } from '@/components/shared/workspace/workspace-context';

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Workspace app pages are private; keep them out of search indexes.
 * Individual child pages inherit this via layout metadata precedence.
 */
export const metadata: Metadata = {
  title: {
    absolute: 'Dashboard — Fintracko',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <OnboardingGuardWrapper>
      <WorkspaceProvider>
        <SidebarProvider>
          <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
            <TopBar />
            <div className="flex flex-1 min-h-0">
              <Sidebar />
              <main className="flex-1 overflow-y-auto px-6 pb-6 pt-20 lg:ml-64">{children}</main>
            </div>
          </div>
        </SidebarProvider>
      </WorkspaceProvider>
    </OnboardingGuardWrapper>
  );
}
