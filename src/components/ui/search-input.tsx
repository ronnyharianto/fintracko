"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name; also the fallback when no placeholder is given. */
  ariaLabel: string;
  placeholder?: string;
  className?: string;
}

/** Search field with a leading icon, shared by the workspace list pages. */
export function SearchInput({
  value,
  onChange,
  ariaLabel,
  placeholder,
  className,
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        aria-label={ariaLabel}
        placeholder={placeholder ?? ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8 pr-4 text-sm"
      />
    </div>
  );
}
