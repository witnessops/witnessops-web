import type { MetadataRoute } from "next";
import { getSurface } from "@witnessops/config";

const surface = getSurface("witnessops");
const siteUrl =
  process.env.NEXT_PUBLIC_OS_SITE_URL ??
  surface?.canonicalUrl ??
  "https://witnessops.com";

export default function robots(): MetadataRoute.Robots {
  // Single site: English docs live under witnessops.com/docs.
  // Legacy docs.witnessops.com 308s to apex via middleware.
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
