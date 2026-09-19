"use client";

import { Button } from "@/components/ui/button";
import { CalendarRange } from "lucide-react";

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
    <Button
      variant={grouped ? "secondary" : "outline"}
      size="sm"
      className="h-9 w-9 shrink-0"
      aria-label="Group by day"
      aria-pressed={grouped}
      title={grouped ? "Grouped by day" : "Group by day"}
      onClick={() => onChange(!grouped)}
    >
      <CalendarRange className="h-3.5 w-3.5" />
    </Button>
  );
}
