/**
 * Workspace service layer.
 *
 * Handles database operations for workspaces, including atomic transaction
 * creation and template-based category/subcategory seeding.
 */

import { db } from '@/lib/db';
import {
  WORKSPACE_TEMPLATES,
  type WorkspaceTemplateName,
} from './constants/workspace-templates';
import type { CreateWorkspaceInput } from './schemas';

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
  data: CreateWorkspaceInput
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
        ownerId: userId,
      },
    });

    // 2. Create WorkspaceMember with OWNER role
    await tx.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: 'OWNER',
      },
    });

    // 3. Seed Category (Level 1) and SubCategory (Level 2) rows from template
    for (const catTemplate of template.categories) {
      const category = await tx.category.create({
        data: {
          workspaceId: workspace.id,
          name: catTemplate.name,
          type: catTemplate.type,
        },
      });

      if (catTemplate.subCategories && catTemplate.subCategories.length > 0) {
        for (const subCatTemplate of catTemplate.subCategories) {
          await tx.subCategory.create({
            data: {
              workspaceId: workspace.id,
              categoryId: category.id,
              name: subCatTemplate.name,
            },
          });
        }
      }
    }

    return workspace;
  });
}
