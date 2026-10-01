"use client";

import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
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
  const pendingFocusCaretOffset = useRef<number | null>(null);
  const [isFocused, setIsFocused] = useState(false);

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

  useLayoutEffect(() => {
    const input = inputRef.current;
    const charactersBeforeCursor = pendingFocusCaretOffset.current;
    if (!isFocused || charactersBeforeCursor === null || !input) return;

    pendingFocusCaretOffset.current = null;
    const cursorPosition = Math.min(charactersBeforeCursor, input.value.length);
    input.setSelectionRange(cursorPosition, cursorPosition);
  }, [isFocused]);

  const handleFocus = useCallback(() => {
    const input = inputRef.current;
    if (input) {
      pendingFocusCaretOffset.current = input.value
        .slice(0, input.selectionStart ?? 0)
        .replace(/[^0-9.\-]/g, "").length;
    }
    setIsFocused(true);
  }, []);

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

      onChange(cleaned);
    },
    [onChange, decimalPlaces],
  );

  const handleBlur = useCallback(() => {
    setIsFocused(false);

    // Normalize "123." to "123" and ".5" to "0.5" on blur
    if (value && value !== "-" && value !== ".") {
      const normalized = value.replace(/\.$/, "").replace(/^\./, "0.");
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
      value={isFocused ? value : formatDisplay(value)}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    />
  );
}
