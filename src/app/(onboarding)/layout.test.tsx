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
import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import OnboardingLayout, { metadata } from './layout';

// Mock Next.js navigation & headers
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// Mock Better Auth & Prisma DB
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({
        user: { id: 'user-123' },
      }),
    },
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    profile: {
      findUnique: vi.fn().mockResolvedValue(null), // Null = user belum punya profile, siap onboarding
    },
  },
}));

// Mock the real guard path (NOT a stale "access-guard" — that file never existed).
vi.mock('@/components/guards/onboarding-guard-wrapper', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('OnboardingLayout — render', () => {
  it('renders without throwing with simple children', async () => {
    const layout = await OnboardingLayout({
      children: <p>Onboarding wizard content</p>,
    });

    expect(() => render(layout)).not.toThrow();
  });

  it('renders the Fintracko brand name and home link', async () => {
    const layout = await OnboardingLayout({ children: <div /> });
    render(layout);

    expect(screen.getByText(/Fintracko/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /fintracko home/i })
    ).toHaveAttribute('href', '/');
  });

  it('renders children content inside the layout', async () => {
    const layout = await OnboardingLayout({
      children: <h1 data-testid="onboarding-child">Complete your profile</h1>,
    });
    render(layout);

    expect(screen.getByTestId('onboarding-child')).toBeInTheDocument();
  });

  it("does NOT render the marketing NavBar 'Get Started' CTA (distraction-free shell)", async () => {
    const layout = await OnboardingLayout({ children: <div /> });
    render(layout);

    expect(screen.queryByText(/get started/i)).toBeNull();
    // Neither the Footer nor NavBar legal links appear here.
    expect(screen.queryByRole('link', { name: /privacy policy/i })).toBeNull();
    expect(
      screen.queryByRole('link', { name: /terms of service/i })
    ).toBeNull();
  });

  it('wraps children inside a fixed-width container (max-w-lg and up)', async () => {
    const layout = await OnboardingLayout({
      children: <span data-testid="ob-child">x</span>,
    });
    render(layout);
    const child = screen.getByTestId('ob-child');
    // The wrapper div uses max-w-lg md:max-w-xl lg:max-w-2xl; we assert the
    // child's closest block ancestor carries one of those max-width tokens.
    const wrapper = child.parentElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.className).toMatch(/max-w-(lg|xl|2xl)/);
  });
});

describe('OnboardingLayout — metadata', () => {
  it('disables indexing for onboarding routes', () => {
    expect(metadata.robots).toBeDefined();
    const robots = metadata.robots;
    expect(robots).not.toBeNull();
    if (robots && typeof robots === 'object' && 'index' in robots) {
      expect(robots.index).toBe(false);
      expect(robots.follow).toBe(false);
    }
  });

  it('has an onboarding specific title', () => {
    expect(metadata.title).toMatch(/complete your profile|onboarding/i);
  });
});
