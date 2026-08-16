'use client';

import React, { useState, useEffect, useContext, createContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Home, Banknote, CreditCard, PiggyBank, BarChart3 } from 'lucide-react';

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: Home,
    isActive: (p: string) => p === '/' || p === '/dashboard',
  },
  {
    href: '/accounts',
    label: 'Accounts',
    icon: Banknote,
    isActive: (p: string) => p === '/accounts',
  },
  {
    href: '/transactions',
    label: 'Transactions',
    icon: CreditCard,
    isActive: (p: string) => p === '/transactions',
  },
  {
    href: '/budgets',
    label: 'Budgets',
    icon: PiggyBank,
    isActive: (p: string) => p === '/budgets',
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: BarChart3,
    isActive: (p: string) => p === '/analytics',
  },
];

const settingsItem = {
  href: '/settings/workspace',
  label: 'Settings',
  icon: Settings,
  isActive: (p: string) => p.startsWith('/settings'),
};

// Context for sharing sidebar state between TopBar and Sidebar
const SidebarContext = createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
} | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebarContext must be used within a SidebarProvider');
  }
  return context;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { isOpen, setIsOpen } = useSidebarContext();

  // Close sidebar when clicking a link on mobile
  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  // Handle escape key to close sidebar
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, setIsOpen]);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          shrink-0 w-64 bg-card text-foreground border-r border-muted flex flex-col
          lg:fixed lg:top-16 lg:bottom-0 lg:left-0 lg:z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        aria-label="Main navigation"
      >
          <nav className="mt-4 px-3 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = item.isActive(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={`
                  flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted/50 hover:text-primary text-foreground/80'
                  }
                `}
              >
                <Icon className="mr-3 h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          {/* Settings at bottom */}
          <div className="border-t border-muted mt-4 pt-4">
            {(() => {
              const item = settingsItem;
              const active = item.isActive(pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`
                    flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted/50 hover:text-primary text-foreground/80'
                    }
                  `}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.label}
                </Link>
              );
            })()}
          </div>
        </nav>
      </aside>
    </>
  );
}
