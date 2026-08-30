"use client";

import React, { useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DEFAULT_LOCALE =
  typeof navigator !== "undefined" ? navigator.language : "en-US";
const MAX_DECIMAL_PLACES = 2;

interface CurrencyInputProps extends Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "onChange"
> {
  /** Numeric value as a string (e.g. "1234.56"). Empty string for zero/blank. */
  value: string;
  /** Callback with the raw numeric string (e.g. "1234.56"). */
  onChange: (value: string) => void;
  /** Locale for number formatting. Defaults to the browser's regional settings. */
  locale?: string;
  /** Maximum decimal places allowed. Defaults to 2. */
  decimalPlaces?: number;
}

/**
 * Formatted currency input that displays thousand separators while
 * storing the raw numeric value.
 *
 * Usage:
 * ```tsx
 * const [amount, setAmount] = useState("");
 * <CurrencyInput value={amount} onChange={setAmount} />
 * ```
 *
 * The `value` prop is always the unformatted numeric string — safe
 * for API submission without any parsing step.
 */
export function CurrencyInput({
  value,
  onChange,
  locale = DEFAULT_LOCALE,
  decimalPlaces = MAX_DECIMAL_PLACES,
  className,
  ...props
}: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<{ start: number | null; end: number | null }>({
    start: null,
    end: null,
  });

  const formatDisplay = useCallback(
    (raw: string): string => {
      if (!raw) return "";

      const negative = raw.startsWith("-");
      const abs = negative ? raw.slice(1) : raw;

      const [intPart, decPart] = abs.split(".");
      const formattedInt = Number(intPart || "0").toLocaleString(locale);

      if (decPart === undefined) {
        return negative ? `-${formattedInt}` : formattedInt;
      }

      const trimmedDec = decPart.slice(0, decimalPlaces);
      return `${negative ? "-" : ""}${formattedInt}.${trimmedDec}`;
    },
    [locale, decimalPlaces],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;

      // Allow empty input
      if (!raw) {
        onChange("");
        return;
      }

      // Strip everything except digits, decimal point, and leading minus
      let cleaned = raw.replace(/[^0-9.\-]/g, "");

      // Only allow one decimal point
      const parts = cleaned.split(".");
      if (parts.length > 2) {
        cleaned = parts[0] + "." + parts.slice(1).join("");
      }

      // Enforce decimal places limit
      if (parts.length === 2 && parts[1].length > decimalPlaces) {
        cleaned = parts[0] + "." + parts[1].slice(0, decimalPlaces);
      }

      // Validate the result is a valid number (or partial number)
      // Allow: "-", "-0", "0.", "123.", "123.45" etc.
      if (cleaned && !/^-?\d*\.?\d*$/.test(cleaned)) {
        return;
      }

      // Save cursor position relative to numeric characters
      const cursorPos = e.target.selectionStart ?? cleaned.length;
      selectionRef.current = { start: cursorPos, end: cursorPos };

      onChange(cleaned);

      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        if (inputRef.current) {
          const displayValue = inputRef.current.value;
          const numericBeforeCursor = displayValue
            .slice(0, cursorPos)
            .replace(/[^0-9.\-]/g, "").length;
          const newPos = Math.min(numericBeforeCursor, displayValue.length);
          inputRef.current.setSelectionRange(newPos, newPos);
        }
      });
    },
    [onChange, decimalPlaces],
  );

  const handleBlur = useCallback(() => {
    // Normalize "123." to "123" and ".5" to "0.5" on blur
    if (value && value !== "-" && value !== ".") {
      const normalized = value.replace(/\.$/, "").replace(/^(\.?)/, "0$1");
      if (normalized !== value) {
        onChange(normalized);
      }
    }
  }, [value, onChange]);

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      className={cn("tabular-nums", className)}
      value={formatDisplay(value)}
      onChange={handleChange}
      onBlur={handleBlur}
      {...props}
    />
  );
}
