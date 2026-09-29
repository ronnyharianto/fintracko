"use client";

import React, {
  useState,
  useEffect,
  useContext,
  createContext,
  useRef,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings,
  Home,
  Banknote,
  Tag,
  CreditCard,
  PiggyBank,
  BarChart3,
  ChevronDown,
  User,
  Briefcase,
} from "lucide-react";
import { WorkspaceSwitcher } from "@/components/shared/workspace/workspace-switcher";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: Home,
    isActive: (p: string) => p === "/" || p === "/dashboard",
  },
  {
    href: "/transactions",
    label: "Transactions",
    icon: CreditCard,
    isActive: (p: string) => p === "/transactions",
  },
  {
    href: "/accounts",
    label: "Accounts",
    icon: Banknote,
    isActive: (p: string) => p === "/accounts",
  },
  {
    href: "/categories",
    label: "Categories",
    icon: Tag,
    isActive: (p: string) => p === "/categories",
  },
  {
    href: "/budgets",
    label: "Budgets",
    icon: PiggyBank,
    isActive: (p: string) => p === "/budgets",
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: BarChart3,
    isActive: (p: string) => p === "/analytics",
  },
];

const settingsChildren = [
  { href: "/settings/account", label: "Account", icon: User },
  { href: "/settings/workspace", label: "Workspace", icon: Briefcase },
];

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
    throw new Error("useSidebarContext must be used within a SidebarProvider");
  }
  return context;
}

function NavLink({
  item,
  pathname,
  onClick,
}: {
  item: {
    href: string;
    label: string;
    icon: typeof Settings;
    isActive: (p: string) => boolean;
  };
  pathname: string;
  onClick: () => void;
}) {
  const active = item.isActive(pathname);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`
        flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
        ${
          active
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted/50 hover:text-primary text-foreground/80"
        }
      `}
    >
      <Icon className="mr-3 h-4 w-4" />
      {item.label}
    </Link>
  );
}

function SettingsNavItem({
  pathname,
  onClick,
}: {
  pathname: string;
  onClick: () => void;
}) {
  const isSettings = pathname.startsWith("/settings");
  const [expanded, setExpanded] = useState(isSettings);
  const prevIsSettings = useRef(isSettings);

  useEffect(() => {
    if (isSettings && !prevIsSettings.current) {
      setExpanded(true);
    } else if (!isSettings && prevIsSettings.current) {
      setExpanded(false);
    }
    prevIsSettings.current = isSettings;
  }, [isSettings]);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`
          flex items-center w-full px-3 py-2 rounded-md text-sm font-medium transition-colors
          ${
            isSettings
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted/50 hover:text-primary text-foreground/80"
          }
        `}
      >
        <Settings className="mr-3 h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Settings</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-muted pl-3">
          {settingsChildren.map((child) => {
            const active = pathname.startsWith(child.href);
            const Icon = child.icon;
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onClick}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors
                  ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/50 hover:text-primary text-foreground/80"
                  }
                `}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
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
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
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
          w-64 bg-card text-foreground border-r border-muted flex flex-col
          fixed top-16 bottom-0 left-0 z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        aria-label="Main navigation"
      >
        {/* Workspace Switcher (mobile only) */}
        <div className="px-3 pt-4 lg:hidden">
          <WorkspaceSwitcher />
        </div>

        <nav className="mt-4 px-3 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              onClick={handleLinkClick}
            />
          ))}

          {/* Settings at bottom */}
          <div className="border-t border-muted mt-4 pt-4">
            <SettingsNavItem pathname={pathname} onClick={handleLinkClick} />
          </div>
        </nav>
      </aside>
    </>
  );
}
