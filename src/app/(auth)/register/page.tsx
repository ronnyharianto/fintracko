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
 * SEO metadata for the register page.
 */
export const metadata: Metadata = {
  title: "Create account — Fintracko",
  description:
    "Create your Fintracko account with Google or GitHub. Secure OAuth-only sign-up — no passwords required.",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Register / sign-up page (`/register`).
 *
 * Mirrors the login page: OAuth-only (Google + GitHub), no password
 * fields. Better Auth auto-creates the user account on first successful
 * OAuth sign-in, so there is no separate "create" endpoint; this page
 * exists primarily as a distinct marketing/conversion surface with
 * copy tailored to first-time users.
 *
 * @remarks Server Component. The interactive `OAuthButtons` is a
 * Client Component imported below.
 */
export default function RegisterPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">
          <h1>Create your account</h1>
        </CardTitle>
        <CardDescription>
          Sign up with Google or GitHub to start tracking income, expenses, and
          budgets across your workspaces.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <OAuthButtons />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <p>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
