/**
 * DELETE /api/v1/workspaces/[id]/members/[memberId]
 *
 * Removes a collaborator from an owned workspace.
 */

import { NextRequest } from 'next/server';
import { withPipeline } from '@/lib/api/pipeline';
import { success } from '@/lib/api/envelope';
import { removeCollaborator } from '@/features/workspaces/services';
import { handleWorkspaceErrors } from '@/features/workspaces/errors';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  return withPipeline(
    request,
    { requireOnboarding: true },
    handleWorkspaceErrors(
      {
        FORBIDDEN: {
          code: 'FORBIDDEN',
          message:
            'You do not have permission to remove collaborators from this workspace.',
        },
        MEMBER_NOT_FOUND: {
          code: 'NOT_FOUND',
          message: 'Collaborator membership not found.',
        },
        CANNOT_REMOVE_OWNER: {
          code: 'BAD_REQUEST',
          message: 'Cannot remove workspace owner.',
        },
      },
      'Failed to remove collaborator. Please try again.',
      async ({ userId }) => {
        const { id: workspaceId, memberId } = await params;
        await removeCollaborator(userId, workspaceId, memberId);
        return success({ removed: true });
      },
    )
  );
}
