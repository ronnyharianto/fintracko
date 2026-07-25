/**
 * Unit tests for workspace services.
 *
 * Tests cover:
 *   - createWorkspace atomic transaction
 *   - Workspace creation
 *   - WorkspaceMember creation with OWNER role
 *   - Category and SubCategory template seeding
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWorkspace } from './services';
import type { CreateWorkspaceInput } from './schemas';

// Mock the db module
vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn(),
  },
}));

describe('Workspace Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createWorkspace', () => {
    it('should create Workspace, WorkspaceMember (OWNER), and seed categories/subcategories in a transaction', async () => {
      const { db } = await import('@/lib/db');

      const mockWorkspace = {
        id: 'workspace-123',
        name: 'Personal Finance',
        ownerId: 'user-123',
        createdAt: new Date(),
      };

      const mockWorkspaceMemberCreate = vi
        .fn()
        .mockResolvedValue({ id: 'member-123' });
      const mockCategoryCreate = vi.fn().mockResolvedValue({ id: 'cat-123' });
      const mockSubCategoryCreate = vi
        .fn()
        .mockResolvedValue({ id: 'subcat-123' });
      const mockWorkspaceCreate = vi.fn().mockResolvedValue(mockWorkspace);

      const mockTransaction = vi.fn((callback) => {
        return callback({
          workspace: { create: mockWorkspaceCreate },
          workspaceMember: { create: mockWorkspaceMemberCreate },
          category: { create: mockCategoryCreate },
          subCategory: { create: mockSubCategoryCreate },
        });
      });

      vi.mocked(db.$transaction).mockImplementation(mockTransaction);

      const input: CreateWorkspaceInput = {
        name: 'Personal Finance',
        templateName: 'PERSONAL',
      };

      const result = await createWorkspace('user-123', input);

      expect(db.$transaction).toHaveBeenCalled();
      expect(mockWorkspaceCreate).toHaveBeenCalledWith({
        data: {
          name: 'Personal Finance',
          ownerId: 'user-123',
        },
      });
      expect(mockWorkspaceMemberCreate).toHaveBeenCalledWith({
        data: {
          workspaceId: 'workspace-123',
          userId: 'user-123',
          role: 'OWNER',
        },
      });
      expect(mockCategoryCreate).toHaveBeenCalled();
      expect(mockSubCategoryCreate).toHaveBeenCalled();
      expect(result).toEqual(mockWorkspace);
    });

    it('should throw error on invalid template name', async () => {
      const input = {
        name: 'Invalid',
        templateName: 'INVALID_TEMPLATE' as never,
      };

      await expect(createWorkspace('user-123', input)).rejects.toThrow(
        /Invalid workspace template/
      );
    });
  });
});
