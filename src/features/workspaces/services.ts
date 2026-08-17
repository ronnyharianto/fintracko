/**
 * Workspace service layer.
 *
 * Handles database operations for workspaces, including atomic transaction
 * creation and template-based category/subcategory seeding.
 */

import { db } from "@/lib/db";
import {
  WORKSPACE_TEMPLATES,
  type WorkspaceTemplateName,
} from "./constants/workspace-templates";
import type { CreateWorkspaceInput } from "./schemas";

/**
 * Retrieves all workspaces where the user is a member.
 */
export async function getUserWorkspaces(userId: string) {
  const memberships = await db.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return memberships.map((m) => ({
    ...m.workspace,
    role: m.role,
  }));
}

/**
 * Retrieves all workspaces owned by the user, including members and counts.
 */
export async function getOwnedWorkspaces(userId: string) {
  const workspaces = await db.workspace.findMany({
    where: {
      members: {
        some: {
          userId,
          role: "OWNER",
        },
      },
    },
    include: {
      members: {
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
      },
      _count: {
        select: {
          accounts: true,
          transactions: true,
          budgets: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return workspaces;
}

/**
 * Invites a collaborator by email to an owned workspace.
 */
export async function inviteCollaborator(
  userId: string,
  workspaceId: string,
  email: string,
) {
  // 1. Verify user is owner of workspace
  const isOwner = await db.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId,
      role: "OWNER",
    },
  });
  if (!isOwner) {
    throw new Error("FORBIDDEN");
  }

  // 2. Find user by email
  const targetUser = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!targetUser) {
    throw new Error("USER_NOT_FOUND");
  }

  // 3. Create or check membership
  const existingMember = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: targetUser.id,
      },
    },
  });

  if (existingMember) {
    throw new Error("ALREADY_MEMBER");
  }

  return await db.workspaceMember.create({
    data: {
      workspaceId,
      userId: targetUser.id,
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
}

/**
 * Removes a collaborator from an owned workspace.
 */
export async function removeCollaborator(
  userId: string,
  workspaceId: string,
  memberId: string,
) {
  // 1. Verify user is owner of workspace
  const isOwner = await db.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId,
      role: "OWNER",
    },
  });
  if (!isOwner) {
    throw new Error("FORBIDDEN");
  }

  // 2. Find member
  const member = await db.workspaceMember.findUnique({
    where: { id: memberId },
  });
  if (!member || member.workspaceId !== workspaceId) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  if (member.userId === userId) {
    throw new Error("CANNOT_REMOVE_OWNER");
  }

  await db.workspaceMember.delete({
    where: { id: memberId },
  });

  return { success: true };
}

/**
 * Deletes an owned workspace.
 */
export async function deleteWorkspace(userId: string, workspaceId: string) {
  // 1. Verify user is owner of workspace
  const isOwner = await db.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId,
      role: "OWNER",
    },
  });
  if (!isOwner) {
    throw new Error("FORBIDDEN");
  }

  // 2. Delete workspace (cascade handles accounts, categories, transactions, budgets, members)
  await db.workspace.delete({
    where: { id: workspaceId },
  });

  return { success: true };
}

/**
 * Updates an owned workspace name.
 */
export async function updateWorkspace(
  userId: string,
  workspaceId: string,
  name: string,
) {
  // Check if the user is an owner of the workspace via WorkspaceMember
  const isOwner = await db.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId,
      role: "OWNER",
    },
  });
  if (!isOwner) {
    throw new Error("FORBIDDEN");
  }

  return await db.workspace.update({
    where: { id: workspaceId },
    data: { name },
  });
}

/**
 * Creates a new Workspace, assigns the creator as OWNER in WorkspaceMember,
 * and seeds default Level 1 Categories and Level 2 SubCategories from the
 * selected static workspace template.
 *
 * Per ARCHITECTURE.md §3 & §4:
 * - Wrapped in a Prisma $transaction block for atomicity.
 * - Reads static template constants and performs creation.
 */
export async function createWorkspace(
  userId: string,
  data: CreateWorkspaceInput,
) {
  const template =
    WORKSPACE_TEMPLATES[data.templateName as WorkspaceTemplateName];
  if (!template) {
    throw new Error(`Invalid workspace template: ${data.templateName}`);
  }

  return await db.$transaction(async (tx) => {
    // 1. Create Workspace
    const workspace = await tx.workspace.create({
      data: {
        name: data.name,
        currency: data.currency,
      },
    });

    // 2. Create WorkspaceMember with OWNER role
    await tx.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: "OWNER",
      },
    });

    // 3. Seed Category (Level 1) and SubCategory (Level 2) rows from template.
    //    Batched (P1): the previous loop issued one INSERT per category and
    //    per subcategory (~19 sequential network round-trips against a remote
    //    DB); createMany/createManyAndReturn collapse this to 2 batch inserts.
    const categories = await tx.category.createManyAndReturn({
      data: template.categories.map((catTemplate) => ({
        workspaceId: workspace.id,
        name: catTemplate.name,
        type: catTemplate.type,
      })),
    });

    // createManyAndReturn preserves input order (PostgreSQL RETURNING), so
    // index i maps back to template.categories[i].
    const subCategoryData: {
      workspaceId: string;
      categoryId: string;
      name: string;
    }[] = [];
    template.categories.forEach((catTemplate, i) => {
      for (const subCatTemplate of catTemplate.subCategories) {
        subCategoryData.push({
          workspaceId: workspace.id,
          categoryId: categories[i].id,
          name: subCatTemplate.name,
        });
      }
    });
    if (subCategoryData.length > 0) {
      await tx.subCategory.createMany({ data: subCategoryData });
    }

    return workspace;
  });
}
