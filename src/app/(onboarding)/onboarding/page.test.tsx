/**
 * Unit tests for onboarding page.
 *
 * Tests cover:
 *   - Page rendering
 *   - OnboardingForm component integration
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import OnboardingPage from "./page";

// Mock the OnboardingForm component
vi.mock("@/components/shared/onboarding/onboarding-form", () => ({
  OnboardingForm: () => (
    <div data-testid="onboarding-form">Onboarding Form</div>
  ),
}));

describe("Onboarding Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the onboarding form", () => {
    render(<OnboardingPage />);
    expect(screen.getByTestId("onboarding-form")).toBeInTheDocument();
  });
});
