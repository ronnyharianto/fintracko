import type { Metadata } from "next";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { OAuthButtons } from "@/components/shared/auth/oauth-buttons";
import Link from "next/link";

/**
 * SEO metadata for the login page.
 */
export const metadata: Metadata = {
  title: "Sign in — Fintracko",
  description:
    "Sign in to Fintracko with Google or GitHub. Secure OAuth-only authentication — no passwords required.",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Login page (`/login`).
 *
 * Renders a centered card with the two enabled OAuth providers
 * (Google + GitHub). Per `src/lib/auth.ts`, password authentication is
 * disabled, so there are no email/password fields here. Each button
 * triggers `authClient.signIn.social({ provider })`, which redirects to
 * the provider's consent screen and ultimately back to `/onboarding`
 * (new users) or the dashboard (returning users).
 *
 * @remarks Server Component. The interactive `OAuthButtons` is a
 * Client Component imported below.
 */
export default function LoginPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">
          <h1>Welcome back</h1>
        </CardTitle>
        <CardDescription>
          Sign in to your Fintracko account to continue tracking your finances.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <OAuthButtons />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <p>
          Don't have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            Create one
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
