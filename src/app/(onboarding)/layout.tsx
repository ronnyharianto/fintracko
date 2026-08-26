import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { FintrackoLogo } from '@/components/shared/fintracko-logo';

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
 * Onboarding route group layout dengan Auth & Profile Guard.
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Retrieve session from request headers
  const headersList = await headers();
  const auth = await getProductionAuth();
  const session = await auth.api.getSession({ headers: headersList });

  // If no session exists, redirect to account page
  if (!session || !session.user?.id) {
    redirect('/account');
  }

  // Check if user already has a Profile
  const db = await getProductionDb();
  const profile = await db.profile.findUnique({
    where: { userId: session.user.id },
  });

  // If profile exists, onboarding is complete -> redirect to dashboard
  if (profile) {
    redirect('/dashboard');
  }

  // If both guards pass (logged in & no profile) -> show onboarding
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2"
        aria-label="Fintracko home"
      >
        <FintrackoLogo className="h-8 w-8" />
        <span className="text-xl font-semibold tracking-tight text-foreground">
          Fintracko
        </span>
      </Link>
      <div className="w-full max-w-lg md:max-w-xl lg:max-w-2xl">{children}</div>
    </div>
  );
}

/**
 * SEO metadata for onboarding pages. These routes are not meant to be indexed.
 */
export const metadata: Metadata = {
  title: 'Fintracko — Complete your profile',
  robots: {
    index: false,
    follow: false,
  },
};
