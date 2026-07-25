/**
 * POST /api/v1/workspaces/[id]/members
 *
 * Invites a collaborator by email to an owned workspace.
 */

import { NextRequest } from 'next/server';
import { withSession } from '@/lib/api/session';
import { validateBody } from '@/lib/api/validate';
import { sanitizeObject } from '@/lib/api/sanitize';
import { successWithStatus, failure } from '@/lib/api/envelope';
import { InviteCollaboratorSchema } from '@/features/workspaces/schemas';
import { inviteCollaborator } from '@/features/workspaces/services';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSession(request, async ({ userId }) => {
    const { id: workspaceId } = await params;

    const profile = await db.profile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      return failure(
        'ONBOARDING_REQUIRED',
        'Profile not found. Please complete onboarding first.'
      );
    }

    const validationResult = await validateBody(
      request,
      InviteCollaboratorSchema
    );
    if (!validationResult.success) {
      return validationResult.response;
    }

    const sanitizedData = sanitizeObject(validationResult.data);

    try {
      const member = await inviteCollaborator(
        userId,
        workspaceId,
        sanitizedData.email
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
  });
}
