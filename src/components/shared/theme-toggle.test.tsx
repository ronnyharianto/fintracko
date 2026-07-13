/**
 * Unit tests for the ThemeToggle client component.
 *
 * The component reads the existing `.dark` class on <html> (placed by the
 * pre-hydration script in layout.tsx) on mount, then toggles that class and
 * persists the choice to `localStorage` when clicked. These tests cover the
 * initial-sync behaviour, the click-toggle behaviour, the switch role, and
 * the localStorage persistence.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ThemeToggle } from "./theme-toggle";

function htmlHasDark() {
  return document.documentElement.classList.contains("dark");
}

beforeEach(() => {
  // Start from a clean slate before each test.
  document.documentElement.classList.remove("dark");
  window.localStorage.clear();
});

afterEach(() => {
  document.documentElement.classList.remove("dark");
  window.localStorage.clear();
});

describe("ThemeToggle — render", () => {
  it("renders a switch button with an accessible role", () => {
    render(<ThemeToggle />);
    const sw = screen.getByRole("switch");
    expect(sw).toBeInTheDocument();
    expect(sw.tagName).toBe("BUTTON");
  });
});

describe("ThemeToggle — initial dark mount (app default)", () => {
  beforeEach(() => {
    // Simulate the pre-hydration script which adds `.dark` by default.
    document.documentElement.classList.add("dark");
  });

  it("syncs to the dark state when <html> already has the .dark class", () => {
    render(<ThemeToggle />);
    const sw = screen.getByRole("switch");
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(htmlHasDark()).toBe(true);
  });
});

describe("ThemeToggle — click toggling", () => {
  beforeEach(() => {
    document.documentElement.classList.add("dark");
  });

  it("on click from dark → light: removes .dark class and persists 'light'", () => {
    render(<ThemeToggle />);
    const sw = screen.getByRole("switch");

    act(() => {
      fireEvent.click(sw);
    });

    expect(htmlHasDark()).toBe(false);
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(window.localStorage.getItem("theme")).toBe("light");
  });

  it("on second click from light → dark: re-adds .dark and persists 'dark'", () => {
    render(<ThemeToggle />);
    const sw = screen.getByRole("switch");

    act(() => {
      fireEvent.click(sw); // dark -> light
    });
    act(() => {
      fireEvent.click(sw); // light -> dark
    });

    expect(htmlHasDark()).toBe(true);
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(window.localStorage.getItem("theme")).toBe("dark");
  });
});

describe("ThemeToggle — initial light mount", () => {
  beforeEach(() => {
    // Simulate the pre-hydration script honouring an explicit light pick.
    document.documentElement.classList.remove("dark");
  });

  it("syncs to light state when <html> does not have .dark", () => {
    render(<ThemeToggle />);
    const sw = screen.getByRole("switch");
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(htmlHasDark()).toBe(false);
  });
});
