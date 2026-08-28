/**
 * POST /api/v1/workspaces/[id]/members
 *
 * Sends a collaboration invitation by email to an owned workspace.
 */

import { NextRequest } from 'next/server';
import { withPipeline } from '@/lib/api/pipeline';
import { successWithStatus } from '@/lib/api/envelope';
import { InviteCollaboratorSchema } from '@/features/workspaces/schemas';
import { inviteCollaborator } from '@/features/workspaces/services';
import { handleWorkspaceErrors } from '@/features/workspaces/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPipeline(
    request,
    { schema: InviteCollaboratorSchema, requireOnboarding: true },
    handleWorkspaceErrors(
      {
        FORBIDDEN: {
          code: 'FORBIDDEN',
          message:
            'You do not have permission to invite collaborators to this workspace.',
        },
        USER_NOT_FOUND: {
          code: 'NOT_FOUND',
          message: 'User with this email does not exist.',
        },
        ALREADY_MEMBER: {
          code: 'CONFLICT',
          message: 'User is already a member of this workspace.',
        },
        INVITATION_EXISTS: {
          code: 'CONFLICT',
          message: 'An invitation has already been sent to this user.',
        },
      },
      'Failed to send invitation. Please try again.',
      async ({ userId }, data) => {
        const { id: workspaceId } = await params;
        const invitation = await inviteCollaborator(userId, workspaceId, data.email);
        return successWithStatus({ invitation }, 201);
      },
    )
  );
}
