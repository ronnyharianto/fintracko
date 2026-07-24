/**
 * Unit tests for OnboardingForm component.
 *
 * Tests cover:
 *   - Rendering all form fields (Bio, Date of Birth, Gender, Currency, Language, Checkboxes, Submit button)
 *   - Checkboxes initially disabled until terms/privacy links are read/clicked
 *   - Form validation when submitting without accepting terms/privacy
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

  it("should render all form fields correctly with disabled checkboxes initially", () => {
    render(<OnboardingForm />);

    expect(screen.getByLabelText(/bio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gender/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/currency preference/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/language preference/i)).toBeInTheDocument();

    const termsCheckbox = screen.getByLabelText(
      /i already read, acknowledge and accept the.*terms of service/i,
    );
    const privacyCheckbox = screen.getByLabelText(
      /i already read, acknowledge and accept the.*privacy policy/i,
    );

    expect(termsCheckbox).toBeInTheDocument();
    expect(termsCheckbox).toBeDisabled();

    expect(privacyCheckbox).toBeInTheDocument();
    expect(privacyCheckbox).toBeDisabled();

    expect(
      screen.getByRole("button", { name: /complete setup/i }),
    ).toBeInTheDocument();
  });

  it("should enable checkboxes when terms and privacy links are clicked", () => {
    render(<OnboardingForm />);

    const termsLink = screen.getByRole("link", { name: /terms of service/i });
    const privacyLink = screen.getByRole("link", { name: /privacy policy/i });

    fireEvent.click(termsLink);
    fireEvent.click(privacyLink);

    const termsCheckbox = screen.getByLabelText(
      /i already read, acknowledge and accept the.*terms of service/i,
    );
    const privacyCheckbox = screen.getByLabelText(
      /i already read, acknowledge and accept the.*privacy policy/i,
    );

    expect(termsCheckbox).toBeEnabled();
    expect(privacyCheckbox).toBeEnabled();
  });

  it("should show error toast if terms or privacy are not accepted", async () => {
    const { toast } = await import("sonner");
    const { container } = render(<OnboardingForm />);

    // Click links to enable checkboxes
    fireEvent.click(screen.getByRole("link", { name: /terms of service/i }));
    fireEvent.click(screen.getByRole("link", { name: /privacy policy/i }));

    // Submit form directly via submit event to test validation handler
    const form = container.querySelector("form")!;
    fireEvent.submit(form);

    expect(toast.error).toHaveBeenCalledWith(
      "You must accept the Terms of Service and Privacy Policy.",
    );
  });
});
