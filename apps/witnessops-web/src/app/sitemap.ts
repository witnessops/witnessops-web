import { statSync } from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";
import { getSurface } from "@witnessops/config";
import { getDocCanonicalUrl } from "@witnessops/content/docs";
import { listSignals } from "@witnessops/content/signals";
import { getDocsSitemapEntries } from "@witnessops/content/sitemap";
import { loadHomeContent, loadSupportIndex } from "@/lib/content";
import { getPolishSkus } from "@/lib/public-i18n";

const surface = getSurface("witnessops");
const siteUrl =
  process.env.NEXT_PUBLIC_OS_SITE_URL ??
  surface?.canonicalUrl ??
  "https://witnessops.com";
const fallbackLastModified = new Date("2026-01-01T00:00:00.000Z");

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
  { route: "/library", sourcePath: "src/app/(library)/library/page.tsx" },
  { route: "/pricing", sourcePath: "src/app/(marketing)/pricing/page.tsx" },
  { route: "/catalog", sourcePath: "src/app/(marketing)/catalog/page.tsx" },
  {
    route: "/catalog/workflows",
    sourcePath: "src/app/(marketing)/catalog/workflows/page.tsx",
  },
  {
    route: "/catalog/offsec",
    sourcePath: "src/app/(marketing)/catalog/offsec/page.tsx",
  },
  {
    route: "/catalog/operator-platform",
    sourcePath: "src/app/(marketing)/catalog/operator-platform/page.tsx",
  },
  { route: "/review", sourcePath: "src/app/review/page.tsx" },
  {
    route: "/customer-security-review",
    sourcePath: "src/app/customer-security-review/page.tsx",
  },
  { route: "/review/request", sourcePath: "src/app/review/request/page.tsx" },
  {
    route: "/review/sample-cases",
    sourcePath: "src/app/review/sample-cases/page.tsx",
  },
  {
    route: "/review/sample-cases/ai-agent-action-proof-run",
    sourcePath: "src/app/review/sample-cases/ai-agent-action-proof-run/page.tsx",
  },
  {
    route: "/review/sample-cases/sbom-cisa-2026-minimum-elements",
    sourcePath:
      "src/app/review/sample-cases/sbom-cisa-2026-minimum-elements/page.tsx",
  },
  {
    route: "/review/sample-cases/approval-gated-containment",
    sourcePath: "src/app/review/sample-cases/approval-gated-containment/page.tsx",
  },
  {
    route: "/review/sample-cases/privileged-access-grant",
    sourcePath: "src/app/review/sample-cases/privileged-access-grant/page.tsx",
  },
  {
    route: "/review/sample-report",
    sourcePath: "src/app/review/sample-report/page.tsx",
  },
  {
    route: "/access-change-proof-run",
    sourcePath: "src/app/access-change-proof-run/page.tsx",
  },
  {
    route: "/proof-backed-security-systems",
    sourcePath: "src/app/proof-backed-security-systems/page.tsx",
  },
  { route: "/privacy", sourcePath: "src/app/privacy/page.tsx" },
  { route: "/security", sourcePath: "src/app/security/page.tsx" },
  { route: "/signals", sourcePath: "src/app/signals/page.tsx" },
  { route: "/support", sourcePath: "src/app/support/page.tsx" },
  { route: "/terms", sourcePath: "src/app/terms/page.tsx" },
  { route: "/verify", sourcePath: "src/app/verify/page.tsx" },
  { route: "/why-witnessops", sourcePath: "src/app/why-witnessops/page.tsx" },
];

const polishRoutes: StaticRoute[] = [
  { route: "/pl", sourcePath: "src/app/pl/page.tsx" },
  { route: "/pl/catalog", sourcePath: "src/app/pl/catalog/page.tsx" },
  { route: "/pl/library", sourcePath: "src/app/pl/library/page.tsx" },
  {
    route: "/pl/customer-security-review",
    sourcePath: "src/app/pl/customer-security-review/page.tsx",
  },
  ...getPolishSkus().map(({ id }) => ({
    route: `/pl/catalog/${id.toLowerCase()}`,
    sourcePath: "src/app/pl/catalog/[skuId]/page.tsx",
  })),
  { route: "/pl/review/request", sourcePath: "src/app/pl/review/request/page.tsx" },
  { route: "/pl/docs", sourcePath: "src/app/pl/docs/page.tsx" },
  { route: "/pl/support", sourcePath: "src/app/pl/support/page.tsx" },
  { route: "/pl/verify", sourcePath: "src/app/pl/verify/page.tsx" },
  { route: "/pl/why-witnessops", sourcePath: "src/app/pl/why-witnessops/page.tsx" },
];

export function getSourceLastModified(sourcePath: string) {
  try {
    return statSync(path.resolve(process.cwd(), sourcePath)).mtime;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      // Standalone production images do not include source .tsx files.
      return fallbackLastModified;
    }
    throw error;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Single sitemap on apex: marketing routes + English /docs corpus.
  const supportDocs = loadSupportIndex();
  const signals = await listSignals();
  const latestSignal = signals[0];
  const docs = await getDocsSitemapEntries("witnessops");

  return [
    ...[...staticRoutes, ...polishRoutes].map(({ route, sourcePath, lastModified }) => ({
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
    {
      url: getDocCanonicalUrl("witnessops", []),
      lastModified: getSourceLastModified("src/app/docs/page.tsx"),
    },
    ...docs,
  ];
}
