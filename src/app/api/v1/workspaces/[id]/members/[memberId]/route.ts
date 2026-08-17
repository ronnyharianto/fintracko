/**
 * DELETE /api/v1/workspaces/[id]/members/[memberId]
 *
 * Removes a collaborator from an owned workspace.
 */

import { NextRequest } from 'next/server';
import { withPipeline } from '@/lib/api/pipeline';
import { success, failure } from '@/lib/api/envelope';
import { removeCollaborator } from '@/features/workspaces/services';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  return withPipeline(
    request,
    { requireOnboarding: true },
    async ({ userId }) => {
      const { id: workspaceId, memberId } = await params;

      try {
        await removeCollaborator(userId, workspaceId, memberId);
        return success({ removed: true });
      } catch (err: any) {
        if (err.message === 'FORBIDDEN') {
          return failure(
            'FORBIDDEN',
            'You do not have permission to remove collaborators from this workspace.'
          );
        }
        if (err.message === 'MEMBER_NOT_FOUND') {
          return failure('NOT_FOUND', 'Collaborator membership not found.');
        }
        if (err.message === 'CANNOT_REMOVE_OWNER') {
          return failure('BAD_REQUEST', 'Cannot remove workspace owner.');
        }
        return failure(
          'INTERNAL_SERVER_ERROR',
          'Failed to remove collaborator. Please try again.'
        );
      }
    }
  );
}
