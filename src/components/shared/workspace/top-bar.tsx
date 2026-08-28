'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { FintrackoLogo } from '@/components/shared/fintracko-logo';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { WorkspaceSwitcher } from './workspace-switcher';
import { UserMenu } from './user-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSidebarContext } from '@/components/shared/workspace/sidebar';

export function TopBar() {
  const { isOpen, setIsOpen } = useSidebarContext();

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full h-16 border-b border-muted bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60",
        "flex items-center justify-between px-4 lg:px-6"
      )}
    >
      {/* Left side: Menu button + Logo + Workspace Switcher */}
      <div className="flex items-center gap-4 w-full lg:w-auto">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <FintrackoLogo className="h-8 w-8" />
          <span className="hidden text-xl font-semibold lg:inline">Fintracko</span>
        </Link>

        {/* Workspace Switcher (Desktop only, on mobile it's in sidebar) */}
        <div className="hidden lg:flex items-center">
          <WorkspaceSwitcher />
        </div>
      </div>

      {/* Right side: Theme toggle + User menu */}
      <div className="flex items-center gap-2 lg:gap-4">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}