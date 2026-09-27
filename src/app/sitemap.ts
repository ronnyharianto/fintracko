import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

/**
 * Static `sitemap.xml` route (`/sitemap.xml`).
 *
 * Only publicly indexable pages are listed. URLs are absolute and derived from
 * the runtime-resolved origin in `@/lib/site`, so they stay correct on the
 * Vercel-assigned domain and after a custom domain is connected.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteConfig.url,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteConfig.url}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteConfig.url}/terms-of-service`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
