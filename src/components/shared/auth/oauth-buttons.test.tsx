/**
 * Unit tests for the OAuthButtons client component.
 *
 * The button handlers call `authClient.signIn.social({ provider })` from
 * `src/lib/auth-client.ts`. To keep these tests fast and deterministic we
 * mock the `@/lib/auth-client` module so `signIn.social` is a spy,
 * preventing any real network/redirect behaviour.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// Mock the auth client BEFORE importing the component under test.
const signInSocialMock = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      social: (...args: unknown[]) => signInSocialMock(...args),
    },
  },
  // Re-export the type union for the component's imports to compile.
}));

import { OAuthButtons } from "./oauth-buttons";

describe("OAuthButtons — render", () => {
  beforeEach(() => {
    signInSocialMock.mockClear();
    signInSocialMock.mockResolvedValue(undefined);
  });

  it("renders both Google and GitHub continue buttons", () => {
    render(<OAuthButtons />);
    expect(
      screen.getByTestId("oauth-google"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("oauth-github"),
    ).toBeInTheDocument();
  });

  it("renders the Google button with correct default label", () => {
    render(<OAuthButtons />);
    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  it("renders the GitHub button with correct default label", () => {
    render(<OAuthButtons />);
    expect(
      screen.getByRole("button", { name: /continue with github/i }),
    ).toBeInTheDocument();
  });

  it("renders an optional title heading when provided", () => {
    render(<OAuthButtons title="Or continue with" />);
    expect(screen.getByText(/or continue with/i)).toBeInTheDocument();
  });

  it("omits the title paragraph when not provided", () => {
    const { container } = render(<OAuthButtons />);
    expect(container.querySelector("p")).toBeNull();
  });
});

describe("OAuthButtons — click behaviour", () => {
  beforeEach(() => {
    signInSocialMock.mockClear();
    signInSocialMock.mockResolvedValue(undefined);
  });

  it("calls signIn.social with provider google when the Google button is clicked", async () => {
    render(<OAuthButtons />);
    const googleBtn = screen.getByTestId("oauth-google");

    await act(async () => {
      fireEvent.click(googleBtn);
    });

    expect(signInSocialMock).toHaveBeenCalledTimes(1);
    expect(signInSocialMock).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google" }),
    );
  });

  it("calls signIn.social with provider github when the GitHub button is clicked", async () => {
    render(<OAuthButtons />);
    const githubBtn = screen.getByTestId("oauth-github");

    await act(async () => {
      fireEvent.click(githubBtn);
    });

    expect(signInSocialMock).toHaveBeenCalledTimes(1);
    expect(signInSocialMock).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "github" }),
    );
  });

  it("disables both buttons and shows 'Redirecting…' while a provider resolves", () => {
    // Hold the promise open so we can observe the pending state.
    let resolveFn: (v: unknown) => void = () => {};
    signInSocialMock.mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      }),
    );

    render(<OAuthButtons />);
    const googleBtn = screen.getByTestId("oauth-google");
    const githubBtn = screen.getByTestId("oauth-github");

    act(() => {
      fireEvent.click(googleBtn);
    });

    // Pending: Google button shows redirecting label and both disabled.
    expect(googleBtn).toBeDisabled();
    expect(githubBtn).toBeDisabled();
    expect(googleBtn).toHaveTextContent(/redirecting/i);

    // Release the held promise to restore state.
    act(() => {
      resolveFn(undefined);
    });
  });

  it("re-enables buttons after signIn.social resolves", async () => {
    render(<OAuthButtons />);
    const googleBtn = screen.getByTestId("oauth-google");

    await act(async () => {
      fireEvent.click(googleBtn);
    });

    expect(googleBtn).not.toBeDisabled();
    expect(googleBtn).toHaveTextContent(/continue with google/i);
  });

  it("resets pending state when signIn.social rejects, allowing retry", async () => {
    signInSocialMock.mockRejectedValueOnce(new Error("network down"));

    render(<OAuthButtons />);
    const googleBtn = screen.getByTestId("oauth-google");

    await act(async () => {
      fireEvent.click(googleBtn);
    });

    expect(googleBtn).not.toBeDisabled();
    expect(googleBtn).toHaveTextContent(/continue with google/i);

    // A second click should still call the mock after the failed attempt.
    await act(async () => {
      fireEvent.click(googleBtn);
    });
    expect(signInSocialMock).toHaveBeenCalledTimes(2);
  });
});
