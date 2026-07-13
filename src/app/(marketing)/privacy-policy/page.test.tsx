/**
 * Unit tests for the Privacy Policy page.
 *
 * Validates:
 * - The page renders without throwing.
 * - Essential section headings are present.
 * - SEO metadata is properly exported.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivacyPolicyPage, { metadata } from "./page";

// ---------------------------------------------------------------------------
// Render tests
// ---------------------------------------------------------------------------
describe("PrivacyPolicyPage — render", () => {
  it("renders without throwing", () => {
    expect(() => render(<PrivacyPolicyPage />)).not.toThrow();
  });

  it("renders the main title 'Privacy Policy' as h1", () => {
    render(<PrivacyPolicyPage />);
    expect(
      screen.getByRole("heading", { name: /privacy policy/i, level: 1 }),
    ).toBeInTheDocument();
  });

  it("renders the last updated date", () => {
    render(<PrivacyPolicyPage />);
    const elements = screen.getAllByText(/last updated/i);
    expect(elements.length).toBeGreaterThanOrEqual(1);
    expect(elements[0]).toBeInTheDocument();
  });

  it("renders at least 8 section headings (covering major topics)", () => {
    render(<PrivacyPolicyPage />);
    const h2Elements = screen.getAllByRole("heading", { level: 2 });
    expect(h2Elements.length).toBeGreaterThanOrEqual(8);
  });

  it("renders the Introduction section", () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByText(/1\. Introduction/i)).toBeInTheDocument();
  });

  it("renders the Information We Collect section", () => {
    render(<PrivacyPolicyPage />);
    expect(
      screen.getByText(/2\. Information We Collect/i),
    ).toBeInTheDocument();
  });

  it("renders the Data Storage & Third-Party Services section", () => {
    render(<PrivacyPolicyPage />);
    expect(
      screen.getByText(/4\. Data Storage & Third-Party Services/i),
    ).toBeInTheDocument();
  });

  it("renders the Cookies section", () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByText(/5\. Cookies & Tracking/i)).toBeInTheDocument();
  });

  it("renders the Contact section with email", () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByText(/10\. Contact Us/i)).toBeInTheDocument();
    expect(screen.getByText(/support@fintracko\.app/i)).toBeInTheDocument();
  });

  it("renders an <address> element", () => {
    render(<PrivacyPolicyPage />);
    const addressEl = document.querySelector("address");
    expect(addressEl).not.toBeNull();
  });

  it("does not contain any links (static legal page)", () => {
    render(<PrivacyPolicyPage />);
    const links = screen.queryAllByRole("link");
    expect(links.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// SEO Metadata
// ---------------------------------------------------------------------------
describe("PrivacyPolicyPage — metadata", () => {
  it("exports metadata with correct title", () => {
    expect(metadata.title).toMatch(/privacy policy/i);
    expect(metadata.title).toMatch(/Fintracko/i);
  });

  it("has a non-empty description", () => {
    expect(metadata.description).toBeDefined();
    expect((metadata.description as string).length).toBeGreaterThan(40);
  });

  it("allows indexing but not following (robots index, nofollow)", () => {
    expect(metadata.robots).toBeDefined();
    const robots = metadata.robots;
    expect(robots).not.toBeNull();
    if (robots && typeof robots === "object" && "index" in robots) {
      expect(robots.index).toBe(true);
      expect(robots.follow).toBe(false);
    }
  });
});