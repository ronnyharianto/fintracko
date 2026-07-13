import type { Metadata } from "next";
import { NavBar } from "@/components/shared/landing/nav-bar";
import { Footer } from "@/components/shared/landing/footer";

/**
 * Marketing route group layout.
 *
 * Wraps all public static pages under the `(marketing)` route
 * group (`/privacy-policy`, `/terms-of-service`) with a consistent
 * NavBar + Footer shell. No authentication context is needed —
 * these pages are accessible to unauthenticated visitors.
 *
 * @remarks Per AGENT_RULES:11, this layout is a Server Component
 * by default. There is no client-side interactivity required.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavBar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}

/**
 * Optional SEO metadata for the marketing layout.
 *
 * Individual pages (privacy-policy, terms-of-service) override
 * `title` and `description` via their own metadata exports.
 */
export const metadata: Metadata = {
  robots: {
    index: true,
    follow: false,
  },
};