"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GroupingToggleProps {
  grouped: boolean;
  label: string;
  activeLabel: string;
  icon: LucideIcon;
  onChange: (grouped: boolean) => void;
}

export function GroupingToggle({
  grouped,
  label,
  activeLabel,
  icon: Icon,
  onChange,
}: GroupingToggleProps) {
  return (
    <Button
      variant={grouped ? "secondary" : "outline"}
      size="sm"
      className="h-9 w-9 shrink-0"
      aria-label={label}
      aria-pressed={grouped}
      title={grouped ? activeLabel : label}
      onClick={() => onChange(!grouped)}
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );
}
