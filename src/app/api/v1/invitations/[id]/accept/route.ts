/**
 * POST /api/v1/invitations/[id]/accept
 *
 * Accepts a pending workspace invitation and creates the membership.
 */

import { NextRequest } from 'next/server';
import { withPipeline } from '@/lib/api/pipeline';
import { successWithStatus } from '@/lib/api/envelope';
import { acceptInvitation } from '@/features/workspaces/services';
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
        INVITATION_EXPIRED: {
          code: 'BAD_REQUEST',
          message: 'This invitation has expired.',
        },
      },
      'Failed to accept invitation. Please try again.',
      async ({ userId }) => {
        const { id: invitationId } = await params;
        const member = await acceptInvitation(userId, invitationId);
        return successWithStatus({ member }, 200);
      },
    ),
  );
}
