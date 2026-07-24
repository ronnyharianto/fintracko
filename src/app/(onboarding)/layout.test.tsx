/**
 * Unit tests for the onboarding route group layout.
 *
 * Validates:
 * - The layout renders without throwing.
 * - The Fintracko brand mark and home link are present.
 * - Onboarding pages are not indexable (robots metadata).
 * - Children are wrapped inside the layout container.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import OnboardingLayout, { metadata } from "./layout";

// Mock OnboardingAccessGuardWrapper so tests focus purely on layout structure
vi.mock("@/components/guards/onboarding-access-guard-wrapper", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("OnboardingLayout — render", () => {
  it("renders without throwing with simple children", () => {
    expect(() =>
      render(
        <OnboardingLayout>
          <p>Onboarding wizard content</p>
        </OnboardingLayout>,
      ),
    ).not.toThrow();
  });

  it("renders the Fintracko brand name and home link", () => {
    render(
      <OnboardingLayout>
        <div />
      </OnboardingLayout>,
    );
    expect(screen.getByText(/Fintracko/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /fintracko home/i }),
    ).toHaveAttribute("href", "/");
  });

  it("renders children content inside the layout", () => {
    render(
      <OnboardingLayout>
        <h1 data-testid="onboarding-child">Complete your profile</h1>
      </OnboardingLayout>,
    );
    expect(screen.getByTestId("onboarding-child")).toBeInTheDocument();
  });
});

describe("OnboardingLayout — metadata", () => {
  it("disables indexing for onboarding routes", () => {
    expect(metadata.robots).toBeDefined();
    const robots = metadata.robots;
    expect(robots).not.toBeNull();
    if (robots && typeof robots === "object" && "index" in robots) {
      expect(robots.index).toBe(false);
      expect(robots.follow).toBe(false);
    }
  });

  it("has an onboarding specific title", () => {
    expect(metadata.title).toMatch(/complete your profile|onboarding/i);
  });
});
