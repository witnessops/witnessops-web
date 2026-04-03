import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getSurface } from "@public-surfaces/config";

const surface = getSurface("witnessops");
const siteUrl =
  process.env.NEXT_PUBLIC_OS_SITE_URL ??
  surface?.canonicalUrl ??
  "https://witnessops.com";

function normalizeHost(host: string | null) {
  return host?.split(":")[0].toLowerCase() ?? "";
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headerStore = await headers();
  const requestHost = normalizeHost(
    headerStore.get("x-forwarded-host") ?? headerStore.get("host"),
  );
  const docsHost = surface?.docsHost ?? "docs.witnessops.com";
  const isDocsHost = requestHost === docsHost;
  const activeSiteUrl = isDocsHost ? `https://${docsHost}` : siteUrl;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: isDocsHost ? undefined : ["/docs", "/docs/"],
    },
    sitemap: `${activeSiteUrl}/sitemap.xml`,
  };
}
