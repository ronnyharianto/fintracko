/**
 * Workspace CRUD operations.
 *
 * Handles creating, reading, updating, and deleting workspaces,
 * including template-based category/subcategory seeding on creation.
 */

import { db } from "@/lib/db";
import {
  WORKSPACE_TEMPLATES,
  type WorkspaceTemplateName,
} from "../constants/workspace-templates";
import type { CreateWorkspaceInput } from "../schemas";
import { WorkspaceServiceError } from "../errors";
import { findWorkspaceOwner } from "./helpers";

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
      invitations: {
        where: { status: "PENDING", expiresAt: { gt: new Date() } },
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
 * Deletes an owned workspace.
 */
export async function deleteWorkspace(userId: string, workspaceId: string) {
  const isOwner = await findWorkspaceOwner(userId, workspaceId);
  if (!isOwner) {
    throw new WorkspaceServiceError("FORBIDDEN");
  }

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
  const template =
    WORKSPACE_TEMPLATES[data.templateName as WorkspaceTemplateName];

  return await db.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: {
        name: data.name,
        currency: data.currency,
      },
    });

    await tx.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: "OWNER",
      },
    });

    const categories = await tx.category.createManyAndReturn({
      data: template.categories.map((catTemplate) => ({
        workspaceId: workspace.id,
        name: catTemplate.name,
        type: catTemplate.type,
      })),
    });

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
