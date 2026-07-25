/**
 * Unit tests for workspaces API endpoint.
 *
 * Tests cover:
 *   - Session validation
 *   - Onboarding verification guard (Profile existence check)
 *   - Request body validation
 *   - Successful workspace creation (201 Created)
 *   - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock dependencies
vi.mock('@/lib/api/session', () => ({
  withSession: vi.fn(),
}));

vi.mock('@/lib/api/validate', () => ({
  validateBody: vi.fn(),
}));

vi.mock('@/lib/api/sanitize', () => ({
  sanitizeObject: vi.fn((data) => data),
}));

vi.mock('@/lib/api/envelope', () => ({
  successWithStatus: vi.fn((data, status) => ({ success: true, data, status })),
  failure: vi.fn((code, message) => ({
    success: false,
    error: { code, message },
  })),
}));

vi.mock('@/lib/db', () => ({
  db: {
    profile: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/features/workspaces/services', () => ({
  createWorkspace: vi.fn(),
}));

describe('POST /api/v1/workspaces', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return ONBOARDING_REQUIRED when user profile does not exist', async () => {
    const { withSession } = await import('@/lib/api/session');
    const { db } = await import('@/lib/db');
    const { failure } = await import('@/lib/api/envelope');

    const mockSession = { userId: 'user-123' };

    vi.mocked(withSession).mockImplementation(async (_request, callback) => {
      return callback(mockSession as never);
    });

    vi.mocked(db.profile.findUnique).mockResolvedValue(null);

    await POST({} as never);

    expect(failure).toHaveBeenCalledWith(
      'ONBOARDING_REQUIRED',
      'Profile not found. Please complete onboarding first.'
    );
  });

  it('should return successWithStatus 201 when workspace is created successfully', async () => {
    const { withSession } = await import('@/lib/api/session');
    const { db } = await import('@/lib/db');
    const { validateBody } = await import('@/lib/api/validate');
    const { sanitizeObject } = await import('@/lib/api/sanitize');
    const { successWithStatus } = await import('@/lib/api/envelope');
    const { createWorkspace } = await import('@/features/workspaces/services');

    const mockSession = { userId: 'user-123' };
    const mockValidatedData = {
      name: 'My Workspace',
      templateName: 'PERSONAL',
    };

    vi.mocked(withSession).mockImplementation(async (_request, callback) => {
      return callback(mockSession as never);
    });

    vi.mocked(db.profile.findUnique).mockResolvedValue({
      id: 'profile-123',
    } as never);

    vi.mocked(validateBody).mockResolvedValue({
      success: true,
      data: mockValidatedData,
    });

    vi.mocked(sanitizeObject).mockReturnValue(mockValidatedData);

    const mockCreatedWorkspace = {
      id: 'workspace-123',
      name: 'My Workspace',
      ownerId: 'user-123',
      createdAt: new Date(),
    };

    vi.mocked(createWorkspace).mockResolvedValue(mockCreatedWorkspace as never);

    await POST({} as never);

    expect(db.profile.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      select: { id: true },
    });
    expect(validateBody).toHaveBeenCalled();
    expect(sanitizeObject).toHaveBeenCalled();
    expect(createWorkspace).toHaveBeenCalledWith('user-123', mockValidatedData);
    expect(successWithStatus).toHaveBeenCalledWith(
      {
        workspace: {
          id: 'workspace-123',
          name: 'My Workspace',
          createdAt: mockCreatedWorkspace.createdAt,
        },
      },
      201
    );
  });
});
