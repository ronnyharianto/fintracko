import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

/**
 * Static `robots.txt` route (`/robots.txt`).
 *
 * Public marketing pages are crawlable; every private surface (auth,
 * onboarding, workspace app, API) is disallowed as defense in depth — those
 * routes already emit `noindex` meta tags, but robots.txt keeps well-behaved
 * crawlers from even requesting them.
 *
 * Disallow patterns are prefix matches, so `/settings` also covers
 * `/settings/workspace` etc. `/account` covers `/accounts` by prefix; both are
 * listed explicitly to keep intent obvious.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/account",
          "/accounts",
          "/analytics",
          "/api",
          "/budgets",
          "/categories",
          "/dashboard",
          "/error",
          "/onboarding",
          "/settings",
          "/transactions",
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
