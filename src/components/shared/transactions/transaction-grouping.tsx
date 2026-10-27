"use client";

import { CalendarRange } from "lucide-react";
import { GroupingToggle } from "@/components/shared/grouping-toggle";

interface TransactionGroupingProps {
  grouped: boolean;
  onChange: (grouped: boolean) => void;
}

/**
 * Toggles day sections in the transaction list.
 *
 * Icon-only so the search field and the sort control still fit on one row at
 * narrow widths, which is why the label is exposed to assistive tech and as a
 * hover title rather than drawn. aria-pressed carries the on/off state.
 */
export function TransactionGrouping({
  grouped,
  onChange,
}: TransactionGroupingProps) {
  return (
    <GroupingToggle
      grouped={grouped}
      label="Group by day"
      activeLabel="Grouped by day"
      icon={CalendarRange}
      onChange={onChange}
    />
  );
}
