/**
 * PATCH /api/v1/workspaces/[id]
 * DELETE /api/v1/workspaces/[id]
 *
 * Updates or deletes an owned workspace.
 *
 * DELETE is irreversible and additionally requires an
 * `x-deletion-confirmation` header carrying the token returned by
 * `POST /api/v1/deletion-tokens` with
 * `{ "scope": "WORKSPACE", "workspaceId": "<id>" }`. The token is bound to
 * this workspace and the calling owner, and expires after five minutes.
 */

import { NextRequest } from 'next/server';
import { withPipeline } from '@/lib/api/pipeline';
import { failure, success } from '@/lib/api/envelope';
import { hasValidDeletionToken } from '@/lib/deletion-confirmation';
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
  const confirmation = request.headers.get('x-deletion-confirmation');

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
        if (
          !hasValidDeletionToken(
            confirmation,
            { scope: 'WORKSPACE', workspaceId },
            userId,
          )
        ) {
          return failure(
            'FORBIDDEN',
            'Deletion confirmation is missing or expired. Please confirm the deletion again.',
          );
        }
        await deleteWorkspace(userId, workspaceId);
        return success({ deleted: true });
      },
    )
  );
}
