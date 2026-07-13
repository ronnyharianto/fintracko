/**
 * Unit tests for the marketing route group layout.
 *
 * Updated for the redesigned NavBar / Footer (new button labels,
 * FintrackoLogo integration).
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MarketingLayout from "./layout";

// ---------------------------------------------------------------------------
// Render tests
// ---------------------------------------------------------------------------
describe("MarketingLayout — render", () => {
  it("renders without throwing with simple children", () => {
    expect(() =>
      render(
        <MarketingLayout>
          <p>Test Content</p>
        </MarketingLayout>,
      ),
    ).not.toThrow();
  });

  it("renders children content inside the layout", () => {
    render(
      <MarketingLayout>
        <h1>Legal Page Title</h1>
      </MarketingLayout>,
    );
    expect(
      screen.getByRole("heading", { name: /legal page title/i }),
    ).toBeInTheDocument();
  });

  it("renders the navigation bar 'Get Started' CTA", () => {
    render(
      <MarketingLayout>
        <div />
      </MarketingLayout>,
    );
    const getStarted = screen.getAllByRole("link", { name: /get started/i });
    expect(getStarted.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the Fintracko brand in the footer", () => {
    render(
      <MarketingLayout>
        <div />
      </MarketingLayout>,
    );
    const brands = screen.getAllByText("Fintracko");
    expect(brands.length).toBeGreaterThanOrEqual(1);
  });

  it("renders footer legal links targeting the correct URLs", () => {
    render(
      <MarketingLayout>
        <div />
      </MarketingLayout>,
    );
    expect(
      screen.getByRole("link", { name: /privacy policy/i }),
    ).toHaveAttribute("href", "/privacy-policy");
    expect(
      screen.getByRole("link", { name: /terms of service/i }),
    ).toHaveAttribute("href", "/terms-of-service");
  });

  it("wraps children inside a <main> element", () => {
    render(
      <MarketingLayout>
        <span data-testid="child">hello</span>
      </MarketingLayout>,
    );
    const main = document.querySelector("main");
    expect(main).not.toBeNull();
    expect(main?.contains(screen.getByTestId("child"))).toBe(true);
  });
});