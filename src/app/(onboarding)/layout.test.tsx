/**
 * Unit tests for the onboarding route group layout.
 *
 * Validates:
 * - The layout renders without throwing.
 * - The Fintracko brand mark and home link are present.
 * - Onboarding pages are not indexable (robots metadata).
 * - Children are wrapped inside the layout container.
 *
 * The real [`OnboardingGuardWrapper`](src/components/guards/onboarding-guard-wrapper.tsx)
 * is an *async* Server Component that performs a redirect side-effect; rendering it
 * synchronously inside `@testing-library/react` returns a Promise that `render()`
 * cannot await, so we stub it with a passthrough fragment so the structural layout
 * (brand mark + home link + children container) can be asserted deterministically.
 */
import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import OnboardingLayout, { metadata } from "./layout";

// Mock the real guard path (NOT a stale "access-guard" — that file never existed).
vi.mock("@/components/guards/onboarding-guard-wrapper", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
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

  it("does NOT render the marketing NavBar 'Get Started' CTA (distraction-free shell)", () => {
    render(
      <OnboardingLayout>
        <div />
      </OnboardingLayout>,
    );
    expect(screen.queryByText(/get started/i)).toBeNull();
    // Neither the Footer nor NavBar legal links appear here.
    expect(screen.queryByRole("link", { name: /privacy policy/i })).toBeNull();
    expect(
      screen.queryByRole("link", { name: /terms of service/i }),
    ).toBeNull();
  });

  it("wraps children inside a fixed-width container (max-w-lg and up)", () => {
    render(
      <OnboardingLayout>
        <span data-testid="ob-child">x</span>
      </OnboardingLayout>,
    );
    const child = screen.getByTestId("ob-child");
    // The wrapper div uses max-w-lg md:max-w-xl lg:max-w-2xl; we assert the
    // child's closest block ancestor carries one of those max-width tokens.
    const wrapper = child.parentElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.className).toMatch(/max-w-(lg|xl|2xl)/);
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
