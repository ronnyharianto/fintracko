"use client";

import { useSyncExternalStore } from "react";

/**
 * Detects a narrow (phone/tablet) viewport at the `lg` breakpoint, where
 * multi-column layouts collapse to one column.
 *
 * SSR-safe: the server snapshot is always `false`, so the server HTML renders
 * the desktop variant and the client reconciles to the real viewport on
 * hydration without a mismatch. Charts use this to switch to a phone-sized
 * scale and to plot fewer points.
 */

const MOBILE_QUERY = "(max-width: 1023px)";

function subscribeToMobile(callback: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribeToMobile,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
}
