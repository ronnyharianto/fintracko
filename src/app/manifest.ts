import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

/**
 * Web app manifest route (`/manifest.webmanifest`).
 *
 * Lets browsers and installable contexts present the correct app name,
 * theme colors, and icon. `theme_color` mirrors the light-mode brand token
 * (`--primary`), `background_color` the dark-mode surface (`--background`).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.title,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f766e",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
