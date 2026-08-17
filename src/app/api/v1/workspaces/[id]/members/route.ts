/**
 * POST /api/v1/workspaces/[id]/members
 *
 * Invites a collaborator by email to an owned workspace.
 */

import { NextRequest } from 'next/server';
import { withPipeline } from '@/lib/api/pipeline';
import { successWithStatus, failure } from '@/lib/api/envelope';
import { InviteCollaboratorSchema } from '@/features/workspaces/schemas';
import { inviteCollaborator } from '@/features/workspaces/services';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPipeline(
    request,
    { schema: InviteCollaboratorSchema, requireOnboarding: true },
    async ({ userId }, data) => {
      const { id: workspaceId } = await params;

      try {
        const member = await inviteCollaborator(
          userId,
          workspaceId,
          data.email
        );

        return successWithStatus({ member }, 201);
      } catch (err: any) {
        if (err.message === 'FORBIDDEN') {
          return failure(
            'FORBIDDEN',
            'You do not have permission to invite collaborators to this workspace.'
          );
        }
        if (err.message === 'USER_NOT_FOUND') {
          return failure('NOT_FOUND', 'User with this email does not exist.');
        }
        if (err.message === 'ALREADY_MEMBER') {
          return failure(
            'CONFLICT',
            'User is already a member of this workspace.'
          );
        }
        return failure(
          'INTERNAL_SERVER_ERROR',
          'Failed to invite collaborator. Please try again.'
        );
      }
    }
  );
}
