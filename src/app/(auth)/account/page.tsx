import type { Metadata } from "next";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
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
 * Account page (`/account`).
 *
 * Single entry point for sign-in and sign-up. Better Auth auto-creates
 * the user account on first successful OAuth sign-in, so there is no
 * need for separate login/register flows.
 *
 * @remarks Server Component. The interactive `OAuthButtons` is a
 * Client Component imported below.
 */
export default function AccountPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">
          <h1>Welcome to Fintracko</h1>
        </CardTitle>
        <CardDescription>
          Sign in with Google or GitHub to start tracking your finances.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <OAuthButtons />
      </CardContent>
    </Card>
  );
}
