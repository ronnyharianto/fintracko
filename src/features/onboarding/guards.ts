import { headers } from "next/headers";
import { getProductionAuth } from "@/lib/api/session";

interface DbLike {
  profile: {
    findUnique: (args: {
      where: { userId: string };
    }) => Promise<{ id: string } | null>;
  };
  workspaceMember: {
    findFirst: (args: {
      where: { userId: string };
    }) => Promise<{ id: string } | null>;
  };
}

async function getProductionDb(): Promise<DbLike> {
  const { db } = await import("@/lib/db");
  return db as unknown as DbLike;
}

export async function getOnboardingSession() {
  const headersList = await headers();
  const auth = await getProductionAuth();
  return auth.api.getSession({ headers: headersList });
}

export async function getOnboardingState() {
  const session = await getOnboardingSession();

  if (!session || !session.user?.id) {
    return { session: null, profile: null, workspace: null };
  }

  const db = await getProductionDb();
  const [profile, workspace] = await Promise.all([
    db.profile.findUnique({
      where: { userId: session.user.id },
    }),
    db.workspaceMember.findFirst({
      where: { userId: session.user.id },
    }),
  ]);

  return { session, profile, workspace };
}
