/**
 * Workspace membership and invitation operations.
 *
 * Handles inviting collaborators, accepting/rejecting invitations,
 * cancelling pending invitations, and removing members.
 */

import { db } from "@/lib/db";
import { WorkspaceServiceError } from "../errors";
import { findWorkspaceOwner } from "./helpers";

/**
 * Sends a collaboration invitation by email to an owned workspace.
 * Creates a pending invitation instead of immediate membership.
 */
export async function inviteCollaborator(
  userId: string,
  workspaceId: string,
  email: string,
) {
  const isOwner = await findWorkspaceOwner(userId, workspaceId);
  if (!isOwner) {
    throw new WorkspaceServiceError("FORBIDDEN");
  }

  const targetUser = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!targetUser) {
    throw new WorkspaceServiceError("USER_NOT_FOUND");
  }

  const existingMember = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: targetUser.id,
      },
    },
  });
  if (existingMember) {
    throw new WorkspaceServiceError("ALREADY_MEMBER");
  }

  const existingInvitation = await db.workspaceInvitation.findUnique({
    where: {
      workspaceId_inviteeId: {
        workspaceId,
        inviteeId: targetUser.id,
      },
    },
  });
  if (
    existingInvitation &&
    existingInvitation.status === "PENDING" &&
    existingInvitation.expiresAt > new Date()
  ) {
    throw new WorkspaceServiceError("INVITATION_EXISTS");
  }

  // Remove stale invitation so the unique constraint does not block re-invite.
  if (existingInvitation) {
    await db.workspaceInvitation.delete({
      where: { id: existingInvitation.id },
    });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return await db.workspaceInvitation.create({
    data: {
      workspaceId,
      inviterId: userId,
      inviteeId: targetUser.id,
      expiresAt,
    },
    include: {
      invitee: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });
}

/**
 * Accepts a pending workspace invitation and creates the membership.
 */
export async function acceptInvitation(
  userId: string,
  invitationId: string,
) {
  const invitation = await db.workspaceInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new WorkspaceServiceError("INVITATION_NOT_FOUND");
  }

  if (invitation.inviteeId !== userId) {
    throw new WorkspaceServiceError("FORBIDDEN");
  }

  if (invitation.status !== "PENDING") {
    throw new WorkspaceServiceError("INVITATION_NOT_FOUND");
  }

  if (new Date() > invitation.expiresAt) {
    throw new WorkspaceServiceError("INVITATION_EXPIRED");
  }

  return await db.$transaction(async (tx) => {
    const claimed = await tx.workspaceInvitation.updateMany({
      where: {
        id: invitationId,
        inviteeId: userId,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      data: { status: "ACCEPTED" },
    });
    if (claimed.count !== 1) {
      throw new WorkspaceServiceError("INVITATION_NOT_FOUND");
    }

    const member = await tx.workspaceMember.create({
      data: {
        workspaceId: invitation.workspaceId,
        userId,
        role: "COLLABORATOR",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return member;
  });
}

/**
 * Rejects a pending workspace invitation.
 */
export async function rejectInvitation(
  userId: string,
  invitationId: string,
) {
  const invitation = await db.workspaceInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new WorkspaceServiceError("INVITATION_NOT_FOUND");
  }

  if (invitation.inviteeId !== userId) {
    throw new WorkspaceServiceError("FORBIDDEN");
  }

  if (invitation.status !== "PENDING") {
    throw new WorkspaceServiceError("INVITATION_NOT_FOUND");
  }

  await db.workspaceInvitation.update({
    where: { id: invitationId },
    data: { status: "REJECTED" },
  });

  return { success: true };
}

/**
 * Returns pending invitations for a user (invitations they received).
 */
export async function getPendingInvitations(userId: string) {
  return await db.workspaceInvitation.findMany({
    where: {
      inviteeId: userId,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
      inviter: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Cancels a pending invitation sent by the workspace owner.
 */
export async function cancelInvitation(
  userId: string,
  workspaceId: string,
  invitationId: string,
) {
  const isOwner = await findWorkspaceOwner(userId, workspaceId);
  if (!isOwner) {
    throw new WorkspaceServiceError("FORBIDDEN");
  }

  const invitation = await db.workspaceInvitation.findFirst({
    where: { id: invitationId, workspaceId },
  });
  if (!invitation) {
    throw new WorkspaceServiceError("INVITATION_NOT_FOUND");
  }

  if (invitation.status !== "PENDING") {
    throw new WorkspaceServiceError("INVITATION_NOT_FOUND");
  }

  await db.workspaceInvitation.delete({
    where: { id: invitationId, workspaceId },
  });

  return { success: true };
}

/**
 * Removes a collaborator from an owned workspace.
 */
export async function removeCollaborator(
  userId: string,
  workspaceId: string,
  memberId: string,
) {
  const isOwner = await findWorkspaceOwner(userId, workspaceId);
  if (!isOwner) {
    throw new WorkspaceServiceError("FORBIDDEN");
  }

  const member = await db.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
  });
  if (!member) {
    throw new WorkspaceServiceError("MEMBER_NOT_FOUND");
  }

  if (member.userId === userId) {
    throw new WorkspaceServiceError("CANNOT_REMOVE_OWNER");
  }

  await db.workspaceMember.delete({
    where: { id: memberId, workspaceId },
  });

  return { success: true };
}
