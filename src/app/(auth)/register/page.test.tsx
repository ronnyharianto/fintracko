/**
 * Unit tests for the register page.
 *
 * The page renders an OAuthButtons client component (mocked here to keep
 * the test deterministic) plus a link back to the login page.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RegisterPage, { metadata } from "./page";

// Mock the interactive OAuth buttons so no Better Auth client logic runs.
vi.mock("@/components/shared/auth/oauth-buttons", () => ({
  OAuthButtons: () => (
    <div data-testid="oauth-buttons-stub">OAuth buttons</div>
  ),
}));

describe("RegisterPage — render", () => {
  it("renders without throwing", () => {
    expect(() => render(<RegisterPage />)).not.toThrow();
  });

  it("renders the 'Create your account' heading", () => {
    render(<RegisterPage />);
    expect(
      screen.getByRole("heading", { name: /create your account/i }),
    ).toBeInTheDocument();
  });

  it("renders the OAuth buttons client component", () => {
    render(<RegisterPage />);
    expect(screen.getByTestId("oauth-buttons-stub")).toBeInTheDocument();
  });

  it("renders a sign-in link pointing to /login", () => {
    render(<RegisterPage />);
    const link = screen.getByRole("link", { name: /sign in/i });
    expect(link).toHaveAttribute("href", "/login");
  });
});

describe("RegisterPage — metadata", () => {
  it("disables indexing for the register route", () => {
    expect(metadata.robots).toBeDefined();
    const robots = metadata.robots;
    expect(robots).not.toBeNull();
    if (robots && typeof robots === "object" && "index" in robots) {
      expect(robots.index).toBe(false);
      expect(robots.follow).toBe(false);
    }
  });

  it("has an account-creation specific title", () => {
    expect(metadata.title).toMatch(/create account|sign up/i);
  });
});
