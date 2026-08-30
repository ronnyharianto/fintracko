import { db } from "@/lib/db";

/**
 * Permanently deletes a user account.
 *
 * - Workspaces where the user is OWNER are fully deleted (cascade removes
 *   all accounts, transactions, budgets, categories, etc.).
 * - Workspaces where the user is a COLLABORATOR are left intact; the
 *   user's membership row is cascade-deleted by the User deletion.
 * - Profile, auth accounts, sessions, and invitations are all
 *   cascade-deleted by Prisma on User removal.
 *
 * Must be called inside a Prisma transaction for atomicity.
 */
export async function deleteAccount(userId: string) {
  await db.$transaction(async (tx) => {
    // 1. Delete all workspaces owned by this user (cascade removes all
    //    workspace data: accounts, transactions, budgets, categories, etc.)
    const ownedMemberships = await tx.workspaceMember.findMany({
      where: { userId, role: "OWNER" },
      select: { workspaceId: true },
    });

    if (ownedMemberships.length > 0) {
      await tx.workspace.deleteMany({
        where: {
          id: { in: ownedMemberships.map((m) => m.workspaceId) },
        },
      });
    }

    // 2. Delete the user (cascade removes: profile, auth accounts, sessions,
    //    remaining memberships, invitations)
    await tx.user.delete({ where: { id: userId } });
  });
}
