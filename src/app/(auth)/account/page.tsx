import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { OAuthButtons } from "@/components/shared/auth/oauth-buttons";

/**
 * SEO metadata for the account page.
 */
export const metadata: Metadata = {
  title: "Account — Fintracko",
  description:
    "Sign in or create your Fintracko account with secure OAuth-only authentication — no passwords required.",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Copy variants for the two auth modes.
 *
 * The same OAuth flow handles both sign-in and sign-up — Better Auth
 * auto-creates the user account on first successful OAuth sign-in. This
 * page exists as a single entry point with mode-specific copy.
 */
const AUTH_COPY = {
  signin: {
    heading: "Welcome back",
    description:
      "Sign in to your Fintracko account to continue tracking your finances.",
    footer: (
      <p>
        Don&apos;t have an account?{" "}
        <Link
          href="/account?mode=register"
          className="font-medium text-primary hover:underline"
        >
          Create one
        </Link>
      </p>
    ),
  },
  register: {
    heading: "Create your account",
    description:
      "Sign up with Google or GitHub to start tracking income, expenses, and budgets across your workspaces.",
    footer: (
      <p>
        Already have an account?{" "}
        <Link
          href="/account"
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    ),
  },
} as const;

type AuthMode = keyof typeof AUTH_COPY;

/**
 * Account page (`/account`).
 *
 * Unified entry point for both sign-in and sign-up. The `mode` search
 * param controls which copy variant is displayed:
 *   - `/account` or `/account?mode=signin` → sign-in copy
 *   - `/account?mode=register` → create-account copy
 *
 * Both modes render the same `OAuthButtons` (Google + GitHub). Better
 * Auth handles account creation automatically on first OAuth sign-in,
 * so there is no separate "create account" endpoint.
 *
 * @remarks Server Component. The interactive `OAuthButtons` is a
 * Client Component imported below.
 */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const activeMode: AuthMode = mode === "register" ? "register" : "signin";
  const copy = AUTH_COPY[activeMode];

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">
          <h1>{copy.heading}</h1>
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <OAuthButtons />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        {copy.footer}
      </CardFooter>
    </Card>
  );
}
