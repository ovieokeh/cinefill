import type { MetadataRoute } from "next";

const siteUrl = "https://cinefill.ovie.dev";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/faq", "/privacy", "/support", "/sync"].map((path) => ({
    url: `${siteUrl}${path}`,
  }));
}
