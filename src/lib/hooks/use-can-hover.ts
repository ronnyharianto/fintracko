"use client";

import { useSyncExternalStore } from "react";

/**
 * Detects whether the device has a real pointer (`hover: hover`).
 *
 * Touch devices fire emulated `mouseenter`/`focus` events around a tap, so
 * interactive components must treat pointer and touch input differently to keep
 * a tap from immediately dismissing what it just opened. The server snapshot
 * assumes a pointer, so SSR HTML renders the hover-capable variant.
 */

const HOVER_QUERY = "(hover: hover)";

function subscribeToHover(callback: () => void) {
  const query = window.matchMedia(HOVER_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function useCanHover(): boolean {
  return useSyncExternalStore(
    subscribeToHover,
    () => window.matchMedia(HOVER_QUERY).matches,
    () => true,
  );
}
