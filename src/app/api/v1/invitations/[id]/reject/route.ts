/**
 * POST /api/v1/invitations/[id]/reject
 *
 * Rejects a pending workspace invitation.
 */

import { NextRequest } from 'next/server';
import { withPipeline } from '@/lib/api/pipeline';
import { success } from '@/lib/api/envelope';
import { rejectInvitation } from '@/features/workspaces/services';
import { handleWorkspaceErrors } from '@/features/workspaces/errors';

export async function POST(
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
          message: 'This invitation does not belong to you.',
        },
        INVITATION_NOT_FOUND: {
          code: 'NOT_FOUND',
          message: 'Invitation not found or already processed.',
        },
      },
      'Failed to reject invitation. Please try again.',
      async ({ userId }) => {
        const { id: invitationId } = await params;
        await rejectInvitation(userId, invitationId);
        return success({ rejected: true });
      },
    ),
  );
}
