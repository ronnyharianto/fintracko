/**
 * PATCH /api/v1/workspaces/[id]
 * DELETE /api/v1/workspaces/[id]
 *
 * Updates or deletes an owned workspace.
 */

import { NextRequest } from 'next/server';
import { withPipeline } from '@/lib/api/pipeline';
import { success, failure } from '@/lib/api/envelope';
import {
  deleteWorkspace,
  updateWorkspace,
} from '@/features/workspaces/services';
import { workspaceErrorFailure } from '@/features/workspaces/errors';
import { z } from 'zod';

const UpdateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, 'Workspace name is required')
    .max(100, 'Workspace name must be at most 100 characters'),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPipeline(
    request,
    { schema: UpdateWorkspaceSchema, requireOnboarding: true },
    async ({ userId }, data) => {
      const { id: workspaceId } = await params;

      try {
        const workspace = await updateWorkspace(
          userId,
          workspaceId,
          data.name
        );
        return success({ workspace });
      } catch (err) {
        const mapped = workspaceErrorFailure(err, {
          FORBIDDEN: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this workspace.',
          },
        });
        if (mapped) return mapped;
        return failure(
          'INTERNAL_SERVER_ERROR',
          'Failed to update workspace. Please try again.'
        );
      }
    }
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPipeline(
    request,
    { requireOnboarding: true },
    async ({ userId }) => {
      const { id: workspaceId } = await params;

      try {
        await deleteWorkspace(userId, workspaceId);
        return success({ deleted: true });
      } catch (err) {
        const mapped = workspaceErrorFailure(err, {
          FORBIDDEN: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete this workspace.',
          },
        });
        if (mapped) return mapped;
        return failure(
          'INTERNAL_SERVER_ERROR',
          'Failed to delete workspace. Please try again.'
        );
      }
    }
  );
}
