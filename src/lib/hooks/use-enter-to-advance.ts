"use client";

import { type KeyboardEvent, useCallback, useRef } from "react";

/**
 * Fields the entry chain walks, in DOM order. Radix Select renders its trigger
 * as `<button role="combobox">`, so the dropdowns are part of the chain while
 * plain buttons (type toggle, Cancel, Submit) are not.
 */
const ADVANCEABLE_FIELDS =
  'input:not([type="hidden"]):not([type="file"]), textarea, [role="combobox"]';

function getAdvanceableFields(form: HTMLElement): HTMLElement[] {
  return Array.from(
    form.querySelectorAll<HTMLElement>(ADVANCEABLE_FIELDS),
  ).filter((field) => !field.hasAttribute("disabled"));
}

function isDropdownTrigger(field: HTMLElement): boolean {
  return field.getAttribute("role") === "combobox";
}

/**
 * Opens a Radix Select whose trigger has focus. Radix opens its listbox from
 * the trigger's own Enter/Space/ArrowDown handling and keeps that open state
 * internal, so the chain drives it the way a keyboard user would instead of
 * duplicating the state in every dialog.
 */
function openDropdown(trigger: HTMLElement) {
  // A dropdown that is already open would be toggled shut by another Enter.
  if (trigger.getAttribute("aria-expanded") === "true") return;

  trigger.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    }),
  );
}

/**
 * Moves focus to the field after `from` within its form, and opens it when it
 * is a dropdown, so one choice hands off to the next. Returns the field that
 * took focus, or null when `from` is the last field.
 */
export function focusAndOpenNextField(
  from: HTMLElement | null,
): HTMLElement | null {
  const form = from?.closest("form");
  if (!from || !form) return null;

  const fields = getAdvanceableFields(form);
  const index = fields.indexOf(from);
  const next = index >= 0 ? fields[index + 1] : undefined;
  if (!next) return null;

  next.focus();
  if (isDropdownTrigger(next)) openDropdown(next);
  return next;
}

/**
 * Returns a keydown handler for a `<form>` that moves focus to the next field
 * when Enter is pressed, opening the dropdown it lands on, so entering a
 * transaction from a phone, tablet, or desktop keyboard does not submit a
 * half-filled form.
 *
 * Enter on a select trigger still opens that dropdown on its own, and on the
 * last field the handler stays out of the way so the browser's implicit submit
 * runs.
 */
export function useEnterToAdvance() {
  return useCallback((event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter") return;
    if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
    // An IME uses Enter to commit its candidate list.
    if (event.nativeEvent.isComposing) return;

    const target = event.target as HTMLElement;
    // Only text-like fields advance: Enter activates a button and opens a
    // select natively, which the user still expects from those controls.
    if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") return;

    // Without a next field, let the implicit submit through.
    if (focusAndOpenNextField(target)) event.preventDefault();
  }, []);
}

/**
 * Hands the entry chain to the next field after a dropdown selection, so
 * choosing a category moves on to its subcategory, then the account, then the
 * payee.
 *
 * The hand-off runs from the content's `onCloseAutoFocus` rather than from
 * `onValueChange`: Radix unmounts the listbox after closing it and takes focus
 * back to the trigger there, which would undo a hand-off made earlier.
 * Preventing that default keeps focus on the field the hand-off chooses, while
 * closing a dropdown without choosing anything (Escape) keeps Radix's own
 * behaviour.
 *
 * ```tsx
 * const handoff = useSelectHandoff();
 *
 * <Select onValueChange={(value) => { setValue(value); handoff.handOffFrom(triggerRef.current); }}>
 *   <SelectTrigger ref={triggerRef} />
 *   <SelectContent onCloseAutoFocus={handoff.handleCloseAutoFocus} />
 * </Select>
 * ```
 */
export function useSelectHandoff() {
  const pendingRef = useRef<HTMLElement | null>(null);

  const handOffFrom = useCallback((trigger: HTMLElement | null) => {
    if (trigger) pendingRef.current = trigger;
  }, []);

  const handleCloseAutoFocus = useCallback((event: Event) => {
    const from = pendingRef.current;
    if (!from) return;
    pendingRef.current = null;

    event.preventDefault();
    if (from.isConnected) focusAndOpenNextField(from);
  }, []);

  return { handOffFrom, handleCloseAutoFocus };
}
