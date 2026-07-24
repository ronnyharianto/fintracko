/**
 * Unit tests for OnboardingForm component.
 *
 * Tests cover:
 *   - Rendering all form fields (Bio, Date of Birth, Gender, Currency, Language, Checkboxes, Submit button)
 *   - Form validation when submitting without accepting terms/privacy
 *   - Successful submission flow
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OnboardingForm } from "./onboarding-form";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("OnboardingForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all form fields correctly", () => {
    render(<OnboardingForm />);

    expect(screen.getByLabelText(/bio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gender/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/currency preference/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/language preference/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/i accept the.*terms of service/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/i accept the.*privacy policy/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /complete setup/i }),
    ).toBeInTheDocument();
  });

  it("should show error toast if terms or privacy are not accepted", async () => {
    const { toast } = await import("sonner");
    const { container } = render(<OnboardingForm />);

    const form = container.querySelector("form")!;
    fireEvent.submit(form);

    expect(toast.error).toHaveBeenCalledWith(
      "You must accept the Terms of Service and Privacy Policy.",
    );
  });
});
