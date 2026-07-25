/**
 * Unit tests for OnboardingGuardWrapper Server Component.
 *
 * Tests cover:
 *   - Redirects to /login when no session exists
 *   - Redirects to /onboarding when session exists but no Profile
 *   - Renders children when both session and Profile exist
 *
 * Per AGENT_RULES.md §4: All unit tests must be co-located directly next to
 * their target files using the explicit *.test.ts or *.test.tsx naming pattern.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { headers } from 'next/headers';

// Mock Next.js redirect to throw like the real redirect function
const NEXT_REDIRECT_ERROR = 'NEXT_REDIRECT';
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    const error = new Error(NEXT_REDIRECT_ERROR) as Error & { url: string };
    error.url = url;
    throw error;
  }),
}));

// Mock next/headers to provide a request context in tests
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

// Mock the auth module
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock the db module
vi.mock('@/lib/db', () => ({
  db: {
    profile: {
      findUnique: vi.fn(),
    },
  },
}));

describe('OnboardingGuardWrapper', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    // Mock headers to return a Promise that resolves to a Headers instance
    vi.mocked(headers).mockResolvedValue(new Headers());
  });

  it('should redirect to /login when no session exists', async () => {
    const { auth } = await import('@/lib/auth');

    // Mock getSession to return null (no session)
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    // Import and render the component
    const OnboardingGuardWrapper = (await import('./onboarding-guard-wrapper'))
      .default;

    // Should throw a redirect error with /login URL
    await expect(
      OnboardingGuardWrapper({ children: <div>Test Content</div> })
    ).rejects.toThrow(NEXT_REDIRECT_ERROR);
  });

  it('should redirect to /login when session exists but has no user.id', async () => {
    const { auth } = await import('@/lib/auth');

    // Mock getSession to return a session without user.id
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: {},
    } as never);

    const OnboardingGuardWrapper = (await import('./onboarding-guard-wrapper'))
      .default;

    // Should throw a redirect error with /login URL
    await expect(
      OnboardingGuardWrapper({ children: <div>Test Content</div> })
    ).rejects.toThrow(NEXT_REDIRECT_ERROR);
  });

  it('should redirect to /onboarding when session exists but no Profile', async () => {
    const { auth } = await import('@/lib/auth');
    const { db } = await import('@/lib/db');

    // Mock getSession to return a valid session
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: 'test-user-id' },
    } as never);

    // Mock findUnique to return null (no profile)
    vi.mocked(db.profile.findUnique).mockResolvedValue(null);

    const OnboardingGuardWrapper = (await import('./onboarding-guard-wrapper'))
      .default;

    // Should throw a redirect error with /onboarding URL
    await expect(
      OnboardingGuardWrapper({ children: <div>Test Content</div> })
    ).rejects.toThrow(NEXT_REDIRECT_ERROR);
  });

  it('should render children when both session and Profile exist', async () => {
    const { auth } = await import('@/lib/auth');
    const { db } = await import('@/lib/db');

    // Mock getSession to return a valid session
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: 'test-user-id' },
    } as never);

    // Mock findUnique to return a profile
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      id: 'test-profile-id',
    } as never);

    const OnboardingGuardWrapper = (await import('./onboarding-guard-wrapper'))
      .default;

    const result = await OnboardingGuardWrapper({
      children: <div>Test Content</div>,
    });

    // Should have rendered children (no redirect error thrown)
    expect(result).toBeDefined();
  });

  it('should query Profile with correct userId from session', async () => {
    const { auth } = await import('@/lib/auth');
    const { db } = await import('@/lib/db');

    const testUserId = 'user-123';

    // Mock getSession to return a valid session with specific userId
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: testUserId },
    } as never);

    // Mock findUnique to return a profile
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      id: 'test-profile-id',
    } as never);

    const OnboardingGuardWrapper = (await import('./onboarding-guard-wrapper'))
      .default;

    await OnboardingGuardWrapper({ children: <div>Test Content</div> });

    // Should have queried Profile with the correct userId
    expect(db.profile.findUnique).toHaveBeenCalledWith({
      where: { userId: testUserId },
    });
  });

  it('should handle database errors gracefully', async () => {
    const { auth } = await import('@/lib/auth');
    const { db } = await import('@/lib/db');

    // Mock getSession to return a valid session
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: 'test-user-id' },
    } as never);

    // Mock findUnique to throw an error
    vi.mocked(db.profile.findUnique).mockRejectedValue(
      new Error('Database error')
    );

    const OnboardingGuardWrapper = (await import('./onboarding-guard-wrapper'))
      .default;

    // Should propagate the database error
    await expect(
      OnboardingGuardWrapper({ children: <div>Test Content</div> })
    ).rejects.toThrow('Database error');
  });
});
