/**
 * Unit tests for the auth route group layout.
 *
 * Validates:
 * - The layout renders without throwing.
 * - The Fintracko brand mark and home link are present.
 * - Auth pages are not indexable (robots metadata).
 * - Children are wrapped inside the centered container.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AuthLayout, { metadata } from "./layout";

// ---------------------------------------------------------------------------

describe("AuthLayout — render", () => {
  it("renders without throwing with simple children", () => {
    expect(() =>
      render(
        <AuthLayout>
          <p>Sign-in form</p>
        </AuthLayout>,
      ),
    ).not.toThrow();
  });

  it("renders the Fintracko brand name and home link", () => {
    render(
      <AuthLayout>
        <div />
      </AuthLayout>,
    );
    expect(screen.getByText(/Fintracko/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /fintracko home/i }),
    ).toHaveAttribute("href", "/");
  });

  it("renders children content inside the centered container", () => {
    render(
      <AuthLayout>
        <h1 data-testid="auth-child">Welcome back</h1>
      </AuthLayout>,
    );
    expect(screen.getByTestId("auth-child")).toBeInTheDocument();
  });

  it("does not render the marketing NavBar or Footer text", () => {
    render(
      <AuthLayout>
        <div />
      </AuthLayout>,
    );
    // NavBar exposes a "Get Started" CTA; auth layout should NOT have it.
    expect(screen.queryByText(/get started/i)).toBeNull();
    // Footer exposes "Privacy Policy" / "Terms of Service" links.
    expect(screen.queryByRole("link", { name: /privacy policy/i })).toBeNull();
    expect(
      screen.queryByRole("link", { name: /terms of service/i }),
    ).toBeNull();
  });
});

describe("AuthLayout — metadata", () => {
  it("disables indexing for auth routes", () => {
    expect(metadata.robots).toBeDefined();
    const robots = metadata.robots;
    expect(robots).not.toBeNull();
    if (robots && typeof robots === "object" && "index" in robots) {
      expect(robots.index).toBe(false);
      expect(robots.follow).toBe(false);
    }
  });
});
