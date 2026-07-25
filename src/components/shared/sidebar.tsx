'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FintrackoLogo } from './fintracko-logo';
import { useWorkspace } from './workspace-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Home,
  Briefcase,
  Banknote,
  CreditCard,
  PiggyBank,
  BarChart3,
} from 'lucide-react';

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: Home,
    isActive: (p: string) => p === '/' || p === '/dashboard',
  },
  {
    href: '/workspaces',
    label: 'Workspaces',
    icon: Briefcase,
    isActive: (p: string) => p === '/workspaces',
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

export default function Sidebar() {
  const pathname = usePathname();
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId, isLoading } =
    useWorkspace();

  const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId);

  return (
    <aside className="shrink-0 w-64 bg-card text-foreground border-r border-muted flex flex-col">
      <div className="flex items-center p-4 border-b border-muted">
        <FintrackoLogo className="h-8 w-8" />
        <span className="ml-3 text-xl font-semibold">Fintracko</span>
      </div>

      {/* Workspace Selector at the top of the menu list */}
      <div className="p-4 border-b border-muted">
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Active Workspace
        </label>
        {isLoading ? (
          <div className="text-xs text-muted-foreground animate-pulse py-2">
            Loading workspaces...
          </div>
        ) : workspaces.length === 0 ? (
          <div className="text-xs text-muted-foreground py-1">
            No workspace found
          </div>
        ) : (
          <Select
            value={activeWorkspaceId || ''}
            onValueChange={(val) => setActiveWorkspaceId(val)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select workspace">
                {activeWorkspace
                  ? `${activeWorkspace.name} (${activeWorkspace.role.toLowerCase()})`
                  : 'Select workspace'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {workspaces.map((ws) => (
                <SelectItem key={ws.id} value={ws.id}>
                  {ws.name} ({ws.role.toLowerCase()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <nav className="mt-4 px-3 space-y-1 flex-1">
        {navItems.map((item) => {
          const active = item.isActive(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
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
      </nav>
    </aside>
  );
}
