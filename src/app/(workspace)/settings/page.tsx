'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

const settingsTabs = [
  { href: '/settings/workspace', label: 'Workspace', icon: Briefcase },
  { href: '/settings/account', label: 'Account', icon: User },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your preferences and workspace settings.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings Sidebar Navigation */}
        <aside className="lg:w-64 shrink-0">
          <nav className="space-y-1 bg-card border border-border rounded-lg p-2">
            {settingsTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted/50 hover:text-primary text-foreground/80'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Settings Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}