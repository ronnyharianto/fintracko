/**
 * Single source of truth for the public site identity used by SEO surfaces:
 * metadata, canonical URLs, robots.txt, sitemap.xml, the OpenGraph image, and
 * JSON-LD structured data.
 *
 * The origin is resolved at runtime — never hardcoded — so the deployment can
 * move between the Vercel-assigned production domain and a custom domain
 * without code changes:
 *
 * 1. `NEXT_PUBLIC_APP_URL` — explicit override (documented in `.env.example`).
 * 2. `VERCEL_PROJECT_PRODUCTION_URL` — auto-set by Vercel deployments (the
 *    free-plan `*.vercel.app` domain); provided without a protocol.
 * 3. `http://localhost:3000` — local development fallback.
 */

function normalizeOrigin(raw: string): string {
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return normalizeOrigin(explicit);
  }

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) {
    return normalizeOrigin(vercel);
  }

  return "http://localhost:3000";
}

export const siteConfig = {
  name: "Fintracko",
  url: resolveSiteUrl(),
  title: "Fintracko — Free Budget & Expense Tracker for Teams & Families",
  description:
    "Track income, expenses, and budgets together — Fintracko is a collaborative budget tracker with shared workspaces for families and small teams.",
  keywords: [
    "budget tracker",
    "expense tracker",
    "free budget tracker",
    "free expense tracker",
    "collaborative budget app",
    "shared expense tracker",
    "budget tracker for families",
    "expense tracker for small teams",
    "Fintracko",
  ],
} as const;
