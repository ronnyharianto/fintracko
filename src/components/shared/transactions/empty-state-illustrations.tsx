"use client";

import { Wallet, CalendarDays } from "lucide-react";

interface EmptyStateProps {
  icon: "no-transactions" | "no-period";
  className?: string;
}

export function EmptyStateIllustration({ icon, className = "" }: EmptyStateProps) {
  if (icon === "no-transactions") {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        {/* Wallet with coins illustration */}
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-muted-foreground"
        >
          {/* Wallet body */}
          <rect
            x="12"
            y="20"
            width="56"
            height="40"
            rx="4"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
          />
          {/* Wallet fold line */}
          <line
            x1="12"
            y1="32"
            x2="68"
            y2="32"
            stroke="currentColor"
            strokeWidth="2"
            opacity="0.4"
          />
          {/* Wallet flap */}
          <path
            d="M12 20 L40 8 L68 20"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Coins peeking out */}
          <circle cx="32" cy="18" r="5" stroke="currentColor" strokeWidth="2" fill="none" />
          <circle cx="42" cy="15" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
          <circle cx="48" cy="20" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
          {/* Money symbol inside wallet */}
          <line x1="22" y1="44" x2="22" y2="52" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="22" y1="48" x2="34" y2="48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="34" y1="44" x2="34" y2="52" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (icon === "no-period") {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        {/* Calendar with empty dates illustration */}
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-muted-foreground"
        >
          {/* Calendar body */}
          <rect
            x="10"
            y="18"
            width="60"
            height="52"
            rx="4"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
          />
          {/* Calendar header */}
          <rect
            x="10"
            y="18"
            width="60"
            height="14"
            rx="4"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
          />
          <rect
            x="10"
            y="28"
            width="60"
            height="4"
            fill="currentColor"
            opacity="0.3"
          />
          {/* Calendar rings */}
          <circle cx="24" cy="18" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
          <circle cx="56" cy="18" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
          {/* Empty calendar grid */}
          <g opacity="0.4">
            {/* Row 1 - empty cells */}
            <rect x="18" y="36" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <rect x="32" y="36" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <rect x="46" y="36" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
            {/* Row 2 - empty cells */}
            <rect x="18" y="46" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <rect x="32" y="46" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <rect x="46" y="46" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </g>
          {/* Empty state indicator */}
          <circle cx="40" cy="58" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="3 3" />
        </svg>
      </div>
    );
  }

  return null;
}

export function EmptyStateEmoji({ icon }: EmptyStateProps) {
  if (icon === "no-transactions") {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Wallet className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (icon === "no-period") {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <CalendarDays className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return null;
}
