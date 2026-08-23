/**
 * PATCH /api/v1/workspaces/[id]
 * DELETE /api/v1/workspaces/[id]
 *
 * Updates or deletes an owned workspace.
 */

import { NextRequest } from 'next/server';
import { withPipeline } from '@/lib/api/pipeline';
import { success } from '@/lib/api/envelope';
import {
  deleteWorkspace,
  updateWorkspace,
} from '@/features/workspaces/services';
import { z } from 'zod';
import { handleWorkspaceErrors } from '@/features/workspaces/errors';
import { WorkspaceNameSchema } from '@/features/workspaces/schemas';

const UpdateWorkspaceSchema = z.object({
  name: WorkspaceNameSchema,
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPipeline(
    request,
    { schema: UpdateWorkspaceSchema, requireOnboarding: true },
    handleWorkspaceErrors(
      {
        FORBIDDEN: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this workspace.',
        },
      },
      'Failed to update workspace. Please try again.',
      async ({ userId }, data) => {
        const { id: workspaceId } = await params;
        const workspace = await updateWorkspace(userId, workspaceId, data.name);
        return success({ workspace });
      },
    )
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPipeline(
    request,
    { requireOnboarding: true },
    handleWorkspaceErrors(
      {
        FORBIDDEN: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this workspace.',
        },
      },
      'Failed to delete workspace. Please try again.',
      async ({ userId }) => {
        const { id: workspaceId } = await params;
        await deleteWorkspace(userId, workspaceId);
        return success({ deleted: true });
      },
    )
  );
}
