/**
 * DELETE /api/v1/invitations/[id]
 *
 * Cancels a pending workspace invitation (owner only).
 */

import { NextRequest } from 'next/server';
import { withPipeline } from '@/lib/api/pipeline';
import { success, failure } from '@/lib/api/envelope';
import { cancelInvitation } from '@/features/workspaces/services';
import { handleWorkspaceErrors } from '@/features/workspaces/errors';
import { db } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withPipeline(
    request,
    { requireOnboarding: true },
    handleWorkspaceErrors(
      {
        FORBIDDEN: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to cancel this invitation.',
        },
        INVITATION_NOT_FOUND: {
          code: 'NOT_FOUND',
          message: 'Invitation not found or already processed.',
        },
      },
      'Failed to cancel invitation. Please try again.',
      async ({ userId }) => {
        const { id: invitationId } = await params;

        const invitation = await db.workspaceInvitation.findUnique({
          where: { id: invitationId },
          select: { workspaceId: true },
        });
        if (!invitation) {
          return failure('NOT_FOUND', 'Invitation not found.');
        }

        await cancelInvitation(userId, invitation.workspaceId, invitationId);
        return success({ cancelled: true });
      },
    ),
  );
}
