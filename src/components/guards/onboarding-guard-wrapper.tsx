/**
 * Onboarding Guard Wrapper Server Component.
 *
 * Implements the "Onboarding & Auth Guard" from ARCHITECTURE.md §3:
 *   - Retrieves the current active session via Better Auth server session helper
 *   - If no session exists, performs server-side redirect to /login
 *   - Queries database for Profile record linked to authenticated userId
 *   - If no Profile exists, redirects to /onboarding
 *   - If Profile exists, renders children normally
 *
 * This is a Server Component (no 'use client') that wraps all private
 * dashboard pages at the layout level (src/app/(dashboard)/layout.tsx).
 */

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';

/**
 * Minimal shape of the Better Auth instance we depend on.
 * Using a structural type for testability (injection seam).
 */
interface AuthLike {
  api: {
    getSession: (input: { headers: Headers }) => Promise<SessionLike | null>;
  };
}

/**
 * Minimal session shape we read off Better Auth's resolved session.
 */
interface SessionLike {
  user: {
    id: string;
  };
}

/**
 * Minimal database client shape for Profile lookup.
 * Using a structural type for testability.
 */
interface DbLike {
  profile: {
    findUnique: (args: {
      where: { userId: string };
    }) => Promise<{ id: string } | null>;
  };
}

interface OnboardingGuardWrapperProps {
  children: ReactNode;
}

/**
 * Lazily resolves the production Better Auth singleton.
 *
 * Imported lazily to keep the module-load graph small and avoid
 * circular import hazards with the Prisma adapter.
 */
async function getProductionAuth(): Promise<AuthLike> {
  const { auth } = await import('@/lib/auth');
  return auth as unknown as AuthLike;
}

/**
 * Lazily resolves the production Prisma client singleton.
 *
 * Imported lazily to keep the module-load graph small and avoid
 * forcing DATABASE_URL resolution at import time in tests.
 */
async function getProductionDb(): Promise<DbLike> {
  const { db } = await import('@/lib/db');
  return db as unknown as DbLike;
}

/**
 * Onboarding Guard Wrapper Component.
 *
 * This Server Component performs the following guard logic:
 * 1. Retrieve the current active session via Better Auth
 * 2. If no session → redirect to /login
 * 3. Query database for Profile record linked to userId
 * 4. If no Profile → redirect to /onboarding
 * 5. If Profile exists → render children
 *
 * @param children - The child components to render if guard passes
 */
export default async function OnboardingGuardWrapper({
  children,
}: OnboardingGuardWrapperProps) {
  // Retrieve session from request headers
  const headersList = await headers();
  const auth = await getProductionAuth();
  const session = await auth.api.getSession({ headers: headersList });

  // If no session exists, redirect to login
  if (!session || !session.user?.id) {
    redirect('/login');
  }

  // Query database for Profile record
  const db = await getProductionDb();
  const profile = await db.profile.findUnique({
    where: { userId: session.user.id },
  });

  // If no Profile exists, user has not completed onboarding
  if (!profile) {
    redirect('/onboarding');
  }

  // Profile exists - render children normally
  return <>{children}</>;
}
