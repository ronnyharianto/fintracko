"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * ThemeToggle — a light/dark mode switch button.
 *
 * Reads the persisted theme from `localStorage` (key `"theme"`), falling back
 * to `"dark"` as the application default. The toggle applies the `.dark` class
 * to the document root (`<html>`) so Tailwind's `dark:` variant picks up the
 * dark design tokens defined in `globals.css`.
 *
 * The pre-hydration theme is established by the inline script in
 * `RootLayout` (see `layout.tsx`), which prevents a flash of unstyled content
 * before this client component mounts. This component therefore only needs to
 * sync its internal state to whatever class is already on `<html>`.
 *
 * @remarks Client Component ("use client") — toggles are inherently interactive.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  // Sync local state with whatever the pre-hydration script established.
  useEffect(() => {
    const current =
      document.documentElement.classList.contains("dark") ? "dark" : "light";
    setTheme(current as "light" | "dark");
    setMounted(true);
  }, []);

  function applyTheme(next: "light" | "dark") {
    const root = document.documentElement;
    if (next === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem("theme", next);
    } catch {
      // localStorage may be unavailable (private mode); ignore gracefully.
    }
    setTheme(next);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => applyTheme(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary/20 bg-background/60 text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        // Avoid hydration mismatch flash: render neutral icon until mounted.
        !mounted && "opacity-0",
        className,
      )}
    >
      {mounted && isDark ? (
        // Moon (dark active — click to go light)
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        // Sun (light active — click to go dark)
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      )}
    </button>
  );
}
