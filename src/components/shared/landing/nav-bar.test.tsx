/**
 * Unit tests for NavBar component session states.
 *
 * Co-located beside src/components/shared/landing/nav-bar.tsx.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NavBar } from "./nav-bar";
import { authClient } from "@/lib/auth-client";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    getSession: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("NavBar — session state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'Log In' and 'Get Started' CTAs when unauthenticated", async () => {
    vi.mocked(authClient.getSession).mockResolvedValue({
      data: null,
    } as never);

    render(<NavBar />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /log in/i })).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /get started/i }),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("link", { name: /dashboard/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /log out/i }),
    ).not.toBeInTheDocument();
  });

  it("renders 'Dashboard' link and 'Log Out' button when authenticated", async () => {
    vi.mocked(authClient.getSession).mockResolvedValue({
      data: {
        user: { id: "test-user-id" },
      },
    } as never);

    render(<NavBar />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
        "href",
        "/dashboard",
      );
      expect(
        screen.getByRole("button", { name: /log out/i }),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("link", { name: /get started/i }),
    ).not.toBeInTheDocument();
  });
});
