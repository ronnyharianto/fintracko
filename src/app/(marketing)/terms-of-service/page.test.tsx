/**
 * Unit tests for the Terms of Service page.
 *
 * Validates:
 * - The page renders without throwing.
 * - Essential section headings are present.
 * - SEO metadata is properly exported.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TermsOfServicePage, { metadata } from "./page";

// ---------------------------------------------------------------------------
// Render tests
// ---------------------------------------------------------------------------
describe("TermsOfServicePage — render", () => {
  it("renders without throwing", () => {
    expect(() => render(<TermsOfServicePage />)).not.toThrow();
  });

  it("renders the main title 'Terms of Service' as h1", () => {
    render(<TermsOfServicePage />);
    expect(
      screen.getByRole("heading", { name: /terms of service/i, level: 1 }),
    ).toBeInTheDocument();
  });

  it("renders the last updated date", () => {
    render(<TermsOfServicePage />);
    expect(screen.getByText(/last updated/i)).toBeInTheDocument();
  });

  it("renders at least 10 section headings (covering major topics)", () => {
    render(<TermsOfServicePage />);
    const h2Elements = screen.getAllByRole("heading", { level: 2 });
    expect(h2Elements.length).toBeGreaterThanOrEqual(10);
  });

  it("renders the Acceptance of Terms section", () => {
    render(<TermsOfServicePage />);
    expect(screen.getByText(/1\. Acceptance of Terms/i)).toBeInTheDocument();
  });

  it("renders the Eligibility section with age requirement", () => {
    render(<TermsOfServicePage />);
    expect(screen.getByText(/2\. Eligibility/i)).toBeInTheDocument();
    expect(screen.getByText(/at least 13 years/i)).toBeInTheDocument();
  });

  it("renders the Acceptable Use Policy section", () => {
    render(<TermsOfServicePage />);
    expect(
      screen.getByText(/4\. Acceptable Use Policy/i),
    ).toBeInTheDocument();
  });

  it("renders the Limitation of Liability section", () => {
    render(<TermsOfServicePage />);
    expect(
      screen.getByText(/8\. Limitation of Liability/i),
    ).toBeInTheDocument();
  });

  it("renders the Governing Law section referencing Indonesia", () => {
    render(<TermsOfServicePage />);
    expect(screen.getByText(/11\. Governing Law/i)).toBeInTheDocument();
    expect(screen.getByText(/Republic of Indonesia/i)).toBeInTheDocument();
  });

  it("renders the Contact section with email", () => {
    render(<TermsOfServicePage />);
    expect(screen.getByText(/12\. Contact/i)).toBeInTheDocument();
    expect(screen.getByText(/support@fintracko\.app/i)).toBeInTheDocument();
  });

  it("renders an <address> element", () => {
    render(<TermsOfServicePage />);
    const addressEl = document.querySelector("address");
    expect(addressEl).not.toBeNull();
  });

  it("renders an unordered list for Acceptable Use items", () => {
    render(<TermsOfServicePage />);
    const listItems = screen.getAllByRole("listitem");
    // Acceptable use provides 6 bullet points + limitations
    expect(listItems.length).toBeGreaterThanOrEqual(6);
  });

  it("does not contain any links (static legal page)", () => {
    render(<TermsOfServicePage />);
    const links = screen.queryAllByRole("link");
    expect(links.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// SEO Metadata
// ---------------------------------------------------------------------------
describe("TermsOfServicePage — metadata", () => {
  it("exports metadata with correct title", () => {
    expect(metadata.title).toMatch(/terms of service/i);
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