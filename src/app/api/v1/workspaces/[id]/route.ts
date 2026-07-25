/**
 * DELETE /api/v1/workspaces/[id]
 *
 * Deletes an owned workspace (with owner check and cascade deletion).
 */

import { NextRequest } from 'next/server';
import { withSession } from '@/lib/api/session';
import { success, failure } from '@/lib/api/envelope';
import { deleteWorkspace } from '@/features/workspaces/services';
import { db } from '@/lib/db';

export async function DELETE(
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

    try {
      await deleteWorkspace(userId, workspaceId);
      return success({ deleted: true });
    } catch (err: any) {
      if (err.message === 'FORBIDDEN') {
        return failure(
          'FORBIDDEN',
          'You do not have permission to delete this workspace.'
        );
      }
      return failure(
        'INTERNAL_SERVER_ERROR',
        'Failed to delete workspace. Please try again.'
      );
    }
  });
}
