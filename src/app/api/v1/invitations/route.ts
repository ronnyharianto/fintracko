/**
 * GET /api/v1/invitations
 *
 * Returns pending workspace invitations for the current user.
 */

import { NextRequest } from 'next/server';
import { withPipeline } from '@/lib/api/pipeline';
import { success } from '@/lib/api/envelope';
import { getPendingInvitations } from '@/features/workspaces/services';

export async function GET(request: NextRequest) {
  return withPipeline(
    request,
    { requireOnboarding: true },
    async ({ userId }) => {
      const invitations = await getPendingInvitations(userId);
      return success({ invitations });
    },
  );
}
