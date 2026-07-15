/**
 * Unit tests for the login page.
 *
 * The page renders an OAuthButtons client component (mocked here to keep
 * the test deterministic) plus a link to the register page for conversion.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LoginPage, { metadata } from "./page";

// Mock the interactive OAuth buttons so no Better Auth client logic runs.
vi.mock("@/components/shared/auth/oauth-buttons", () => ({
  OAuthButtons: () => (
    <div data-testid="oauth-buttons-stub">OAuth buttons</div>
  ),
}));

describe("LoginPage — render", () => {
  it("renders without throwing", () => {
    expect(() => render(<LoginPage />)).not.toThrow();
  });

  it("renders the 'Welcome back' heading", () => {
    render(<LoginPage />);
    expect(
      screen.getByRole("heading", { name: /welcome back/i }),
    ).toBeInTheDocument();
  });

  it("renders the OAuth buttons client component", () => {
    render(<LoginPage />);
    expect(screen.getByTestId("oauth-buttons-stub")).toBeInTheDocument();
  });

  it("renders a register link pointing to /register", () => {
    render(<LoginPage />);
    const link = screen.getByRole("link", { name: /create one/i });
    expect(link).toHaveAttribute("href", "/register");
  });
});

describe("LoginPage — metadata", () => {
  it("disables indexing for the login route", () => {
    expect(metadata.robots).toBeDefined();
    const robots = metadata.robots;
    expect(robots).not.toBeNull();
    if (robots && typeof robots === "object" && "index" in robots) {
      expect(robots.index).toBe(false);
      expect(robots.follow).toBe(false);
    }
  });

  it("has a sign-in specific title", () => {
    expect(metadata.title).toMatch(/sign in/i);
  });
});
