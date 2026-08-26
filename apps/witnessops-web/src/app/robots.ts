import type { MetadataRoute } from "next";
import { canonicalUrl } from "@/lib/public-seo";

export default function robots(): MetadataRoute.Robots {
  // Single site: English docs live under witnessops.com/docs.
  // Legacy docs.witnessops.com 308s to apex via middleware.
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/verify/skill"],
    },
    sitemap: canonicalUrl("/sitemap.xml"),
  };
}
