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
import { WorkspaceServiceError } from "./errors";

/**
 * Returns the OWNER membership row for `userId` in `workspaceId`, or `null`
 * when the user is not an owner.
 *
 * Every mutating workspace operation must compound-filter on
 * `WorkspaceMember` by both `workspaceId` and `userId` (AGENT_RULES §3,
 * Anti-IDOR / Multi-Tenancy). Extracted so the lookup lives in exactly one
 * place; each caller decides how to handle the `null` result — typically by
 * throwing `WorkspaceServiceError("FORBIDDEN")` — so the error handling
 * stays visible at the call site (H1).
 */
async function findWorkspaceOwner(userId: string, workspaceId: string) {
  return db.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId,
      role: "OWNER",
    },
    select: { id: true },
  });
}

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
  const isOwner = await findWorkspaceOwner(userId, workspaceId);
  if (!isOwner) {
    throw new WorkspaceServiceError("FORBIDDEN");
  }

  // 2. Find user by email
  const targetUser = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!targetUser) {
    throw new WorkspaceServiceError("USER_NOT_FOUND");
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
    throw new WorkspaceServiceError("ALREADY_MEMBER");
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
  const isOwner = await findWorkspaceOwner(userId, workspaceId);
  if (!isOwner) {
    throw new WorkspaceServiceError("FORBIDDEN");
  }

  // 2. Find member
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

/**
 * Deletes an owned workspace.
 */
export async function deleteWorkspace(userId: string, workspaceId: string) {
  // 1. Verify user is owner of workspace
  const isOwner = await findWorkspaceOwner(userId, workspaceId);
  if (!isOwner) {
    throw new WorkspaceServiceError("FORBIDDEN");
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
  const isOwner = await findWorkspaceOwner(userId, workspaceId);
  if (!isOwner) {
    throw new WorkspaceServiceError("FORBIDDEN");
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
  // templateName is validated by CreateWorkspaceSchema (Zod enum), so the
  // lookup is safe — the cast is the only narrowing needed.
  const template =
    WORKSPACE_TEMPLATES[data.templateName as WorkspaceTemplateName];

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
