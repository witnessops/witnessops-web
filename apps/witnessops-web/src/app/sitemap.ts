import { statSync } from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getSurface } from "@witnessops/config";
import { getDocCanonicalUrl } from "@witnessops/content/docs";
import { listSignals } from "@witnessops/content/signals";
import { getDocsSitemapEntries } from "@witnessops/content/sitemap";
import { loadHomeContent, loadSupportIndex } from "@/lib/content";

const surface = getSurface("witnessops");
const siteUrl =
  process.env.NEXT_PUBLIC_OS_SITE_URL ??
  surface?.canonicalUrl ??
  "https://witnessops.com";

type StaticRoute = {
  route: string;
  sourcePath?: string;
  lastModified?: () => Date;
};

const staticRoutes: StaticRoute[] = [
  {
    route: "",
    lastModified: () => new Date(loadHomeContent().status.last_reviewed),
  },
  { route: "/review/request", sourcePath: "src/app/review/request/page.tsx" },
  {
    route: "/proof-backed-security-systems",
    sourcePath: "src/app/proof-backed-security-systems/page.tsx",
  },
  { route: "/privacy", sourcePath: "src/app/privacy/page.tsx" },
  { route: "/review", sourcePath: "src/app/review/page.tsx" },
  {
    route: "/review/sample-report",
    sourcePath: "src/app/review/sample-report/page.tsx",
  },
  { route: "/security", sourcePath: "src/app/security/page.tsx" },
  { route: "/signals", sourcePath: "src/app/signals/page.tsx" },
  { route: "/support", sourcePath: "src/app/support/page.tsx" },
  { route: "/terms", sourcePath: "src/app/terms/page.tsx" },
  { route: "/verify", sourcePath: "src/app/verify/page.tsx" },
  { route: "/why-witnessops", sourcePath: "src/app/why-witnessops/page.tsx" },
];

function getSourceLastModified(sourcePath: string) {
  return statSync(path.resolve(process.cwd(), sourcePath)).mtime;
}

function normalizeHost(host: string | null) {
  return host?.split(":")[0].toLowerCase() ?? "";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headerStore = await headers();
  const requestHost = normalizeHost(
    headerStore.get("x-forwarded-host") ?? headerStore.get("host"),
  );
  const docsHost = surface?.docsHost ?? "docs.witnessops.com";

  if (requestHost === docsHost) {
    const docs = await getDocsSitemapEntries("witnessops");

    return [
      {
        url: getDocCanonicalUrl("witnessops", []),
        lastModified: getSourceLastModified("src/app/docs/page.tsx"),
      },
      ...docs,
    ];
  }

  const supportDocs = loadSupportIndex();
  const signals = await listSignals();
  const latestSignal = signals[0];

  return [
    ...staticRoutes.map(({ route, sourcePath, lastModified }) => ({
      url: `${siteUrl}${route}`,
      lastModified:
        route === "/signals" && latestSignal
          ? new Date(latestSignal.lastModified)
          : lastModified
            ? lastModified()
            : getSourceLastModified(sourcePath ?? "src/app/page.tsx"),
    })),
    ...supportDocs.map((doc) => ({
      url: `${siteUrl}/support/${doc.slug}`,
      lastModified: new Date(doc.lastModified),
    })),
  ];
}
