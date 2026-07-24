/**
 * Unit tests for the public marketing landing page (src/app/page.tsx).
 *
 * Updated for the redesigned landing page (bento feature grid, gradient
 * hero, timeline how-it-works, new NavBar button labels).
 *
 * Per AGENT_RULES §4, co-located beside the page component.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingPage, { metadata } from "./page";

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// ---------------------------------------------------------------------------
// Render smoke test
// ---------------------------------------------------------------------------
describe("LandingPage — render", () => {
  it("renders without throwing", () => {
    expect(() => render(<LandingPage />)).not.toThrow();
  });

  it("renders the navigation bar with 'Get Started' CTA pointing to /login", () => {
    render(<LandingPage />);
    const getStartedLinks = screen.getAllByRole("link", {
      name: /get started/i,
    });
    expect(getStartedLinks.length).toBeGreaterThanOrEqual(1);
    const allGoToLogin = getStartedLinks.every(
      (el) => el.getAttribute("href") === "/login",
    );
    expect(allGoToLogin).toBe(true);
  });

  it("renders the hero headline as h1", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", {
        name: /Take Control of Your Financial Future/i,
        level: 1,
      }),
    ).toBeInTheDocument();
  });

  it("renders the 'Get Started Free' hero CTA pointing to /login", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("link", { name: /get started free/i }),
    ).toHaveAttribute("href", "/login");
  });

  it("renders the 'Explore Features' hero CTA pointing to /#features", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("link", { name: /explore features/i }),
    ).toHaveAttribute("href", "/#features");
  });
});

// ---------------------------------------------------------------------------
// Feature grid section
// ---------------------------------------------------------------------------
describe("LandingPage — feature grid", () => {
  it("renders the feature grid heading", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", {
        name: /Everything You Need to Stay on Top/i,
        level: 2,
      }),
    ).toBeInTheDocument();
  });

  it("renders all 6 feature card titles", () => {
    render(<LandingPage />);
    const titles = [
      "Multi-Workspace Management",
      "Real-Time Collaboration",
      "Smart Transaction Ledger",
      "Precision Budgeting",
      "Insightful Analytics",
      "Bank-Grade Security",
    ];
    titles.forEach((t) => {
      const matches = screen.getAllByText(t);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ---------------------------------------------------------------------------
// How It Works section
// ---------------------------------------------------------------------------
describe("LandingPage — how it works", () => {
  it("renders the section heading", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", {
        name: /Get Started in Three Simple Steps/i,
        level: 2,
      }),
    ).toBeInTheDocument();
  });

  it("renders all 3 step titles", () => {
    render(<LandingPage />);
    expect(screen.getByText("Sign Up & Onboard")).toBeInTheDocument();
    expect(screen.getByText("Configure Your Workspace")).toBeInTheDocument();
    expect(screen.getByText("Track, Budget & Grow")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// CTA section
// ---------------------------------------------------------------------------
describe("LandingPage — CTA section", () => {
  it("renders the bottom CTA heading", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", {
        name: /Ready to Simplify Your Finances\?/i,
        level: 2,
      }),
    ).toBeInTheDocument();
  });

  it("renders the 'Start Tracking Now' CTA link targeting /login", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("link", { name: /start tracking now/i }),
    ).toHaveAttribute("href", "/login");
  });
});

// ---------------------------------------------------------------------------
// Footer section
// ---------------------------------------------------------------------------
describe("LandingPage — footer", () => {
  it("renders the Fintracko brand inside the footer", () => {
    render(<LandingPage />);
    const brandTexts = screen.getAllByText("Fintracko");
    expect(brandTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("renders privacy policy footer link targeting /privacy-policy", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("link", { name: /privacy policy/i }),
    ).toHaveAttribute("href", "/privacy-policy");
  });

  it("renders terms of service footer link targeting /terms-of-service", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("link", { name: /terms of service/i }),
    ).toHaveAttribute("href", "/terms-of-service");
  });

  it("renders copyright text with current year", () => {
    render(<LandingPage />);
    const year = new Date().getFullYear().toString();
    expect(
      screen.getByText(new RegExp(`©\\s*${year}\\s+Fintracko`)),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// SEO Metadata
// ---------------------------------------------------------------------------
describe("LandingPage — metadata", () => {
  it("exports a metadata object with a string title", () => {
    expect(metadata).toBeDefined();
    expect(typeof metadata.title).toBe("string");
  });

  it("SEO title includes Fintracko brand", () => {
    expect(metadata.title).toMatch(/Fintracko/i);
  });

  it("has a non-empty description longer than 50 chars", () => {
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description as string).length).toBeGreaterThan(50);
  });

  it("has openGraph metadata with siteName", () => {
    expect(metadata.openGraph).toBeDefined();
    if (metadata.openGraph && typeof metadata.openGraph !== "string") {
      expect(metadata.openGraph.siteName).toBe("Fintracko");
    }
  });

  it("robots allow index + follow", () => {
    expect(metadata.robots).toBeDefined();
    const robots = metadata.robots;
    expect(robots).not.toBeNull();
    if (robots && typeof robots === "object" && "index" in robots) {
      expect(robots.index).toBe(true);
      expect(robots.follow).toBe(true);
    }
  });
});
