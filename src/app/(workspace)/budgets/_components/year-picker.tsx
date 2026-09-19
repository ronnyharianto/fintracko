"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const YEARS_BACK = 5;
const YEARS_FORWARD = 5;

interface YearPickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Earliest selectable year, for pickers bounded by another selection. */
  minYear?: number;
}

/**
 * Year-only picker. Browsers expose no native year input (`type="month"` is the
 * finest granularity), so this renders a bounded year dropdown instead. The
 * current selection is always included, even when it falls outside the default
 * window, so editing an older budget keeps its year selectable.
 */
export function YearPicker({ id, value, onChange, minYear }: YearPickerProps) {
  const currentYear = new Date().getFullYear();
  const selectedYear = Number(value);
  const hasSelection = Number.isInteger(selectedYear) && selectedYear > 0;

  const first = Math.min(
    minYear === undefined
      ? currentYear - YEARS_BACK
      : Math.max(currentYear - YEARS_BACK, minYear),
    hasSelection ? selectedYear : currentYear,
  );
  const last = Math.max(
    currentYear + YEARS_FORWARD,
    hasSelection ? selectedYear : currentYear,
  );

  const years: number[] = [];
  for (let year = last; year >= first; year -= 1) {
    years.push(year);
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Select year" />
      </SelectTrigger>
      <SelectContent>
        {years.map((year) => (
          <SelectItem key={year} value={String(year)}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
