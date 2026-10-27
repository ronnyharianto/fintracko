"use client";

import { Layers } from "lucide-react";
import { GroupingToggle } from "@/components/shared/grouping-toggle";

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
    <GroupingToggle
      grouped={grouped}
      label="Group by category"
      activeLabel="Grouped by category"
      icon={Layers}
      onChange={onChange}
    />
  );
}
