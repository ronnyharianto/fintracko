"use client";

import { Button } from "@/components/ui/button";
import { Layers } from "lucide-react";

interface BudgetGroupingProps {
  grouped: boolean;
  onChange: (grouped: boolean) => void;
}

/**
 * Toggles parent-category sections in the budget list.
 *
 * Icon-only to keep the filter row to a single line at narrow widths, which is
 * why the label is exposed to assistive tech and as a hover title rather than
 * drawn. aria-pressed carries the on/off state.
 */
export function BudgetGrouping({ grouped, onChange }: BudgetGroupingProps) {
  return (
    <Button
      variant={grouped ? "secondary" : "outline"}
      size="sm"
      className="h-9 w-9 shrink-0"
      aria-label="Group by category"
      aria-pressed={grouped}
      title={grouped ? "Grouped by category" : "Group by category"}
      onClick={() => onChange(!grouped)}
    >
      <Layers className="h-3.5 w-3.5" />
    </Button>
  );
}
