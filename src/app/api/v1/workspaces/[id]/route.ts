/**
 * PATCH /api/v1/workspaces/[id]
 * DELETE /api/v1/workspaces/[id]
 *
 * Updates or deletes an owned workspace.
 */

import { NextRequest } from 'next/server';
import { withSession } from '@/lib/api/session';
import { validateBody } from '@/lib/api/validate';
import { sanitizeObject } from '@/lib/api/sanitize';
import { success, failure } from '@/lib/api/envelope';
import {
  deleteWorkspace,
  updateWorkspace,
} from '@/features/workspaces/services';
import { z } from 'zod';
import { db } from '@/lib/db';

const UpdateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, 'Workspace name is required')
    .max(100, 'Workspace name must be at most 100 characters'),
});

export async function PATCH(
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

    const validationResult = await validateBody(request, UpdateWorkspaceSchema);
    if (!validationResult.success) {
      return validationResult.response;
    }

    const sanitizedData = sanitizeObject(validationResult.data);

    try {
      const workspace = await updateWorkspace(
        userId,
        workspaceId,
        sanitizedData.name
      );
      return success({ workspace });
    } catch (err: any) {
      if (err.message === 'FORBIDDEN') {
        return failure(
          'FORBIDDEN',
          'You do not have permission to update this workspace.'
        );
      }
      return failure(
        'INTERNAL_SERVER_ERROR',
        'Failed to update workspace. Please try again.'
      );
    }
  });
}

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
