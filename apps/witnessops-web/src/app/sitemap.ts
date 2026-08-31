import type { MetadataRoute } from "next";
import { getDocCanonicalUrl } from "@witnessops/content/docs";
import { getDocsSitemapEntries } from "@witnessops/content/sitemap";
import { loadSupportIndex } from "@/lib/content";
import { getPolishSkus } from "@/lib/public-i18n";
import {
  canonicalUrl,
  sitemapLanguageAlternates,
} from "@/lib/public-seo";
import { isCurrentPublicCatalogSku } from "@/lib/public-commercial-routes";
import { BUYER_SERVICES } from "@/lib/buyer-services";
import { listSkills } from "@/lib/skills/catalog";

type StaticRoute = {
  route: string;
  /** Route ownership reference only. Filesystem mtimes are not freshness authority. */
  sourcePath?: string;
};

const staticRoutes: StaticRoute[] = [
  { route: "" },
  { route: "/library", sourcePath: "src/app/(library)/library/page.tsx" },
  ...listSkills().map(({ slug }) => ({
    route: `/library/${slug}`,
    sourcePath: "src/app/(library)/library/[slug]/page.tsx",
  })),
  { route: "/pricing", sourcePath: "src/app/(marketing)/pricing/page.tsx" },
  { route: "/catalog", sourcePath: "src/app/(marketing)/catalog/page.tsx" },
  {
    route: "/catalog/workflows",
    sourcePath: "src/app/(marketing)/catalog/workflows/page.tsx",
  },
  {
    route: "/catalog/professional-public-footprint-audit",
    sourcePath:
      "src/app/(marketing)/catalog/professional-public-footprint-audit/page.tsx",
  },
  {
    route: "/catalog/offsec-external-exposure",
    sourcePath: "src/app/(marketing)/catalog/[skuId]/page.tsx",
  },
  ...BUYER_SERVICES.filter(
    (service) =>
      service.productId &&
      isCurrentPublicCatalogSku(service.productId) &&
      service.detailHref.en !== "/catalog/offsec-external-exposure",
  ).flatMap((service) =>
    service.detailHref.en
      ? [
          {
            route: service.detailHref.en,
            sourcePath: "src/app/(marketing)/catalog/[skuId]/page.tsx",
          },
        ]
      : [],
  ),
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
    route: "/review/sample-cases/witnessed-crm-status-change",
    sourcePath:
      "src/app/review/sample-cases/witnessed-crm-status-change/page.tsx",
  },
  {
    route: "/review/sample-cases/local-server-security-review",
    sourcePath: "src/app/review/sample-cases/local-server-security-review/page.tsx",
  },
  {
    route: "/review/sample-cases/external-exposure-assessment",
    sourcePath:
      "src/app/review/sample-cases/external-exposure-assessment/page.tsx",
  },
  {
    route: "/review/sample-cases/launch-readiness-review",
    sourcePath: "src/app/review/sample-cases/launch-readiness-review/page.tsx",
  },
  {
    route: "/review/sample-cases/custody-wallet-ops-review",
    sourcePath: "src/app/review/sample-cases/custody-wallet-ops-review/page.tsx",
  },
  {
    route: "/review/sample-cases/incident-readiness-review",
    sourcePath: "src/app/review/sample-cases/incident-readiness-review/page.tsx",
  },
  {
    route: "/review/sample-cases/customer-security-review-sprint",
    sourcePath:
      "src/app/review/sample-cases/customer-security-review-sprint/page.tsx",
  },
  {
    route: "/review/sample-cases/access-removed-proof",
    sourcePath: "src/app/review/sample-cases/access-removed-proof/page.tsx",
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
    route: "/proof-backed-security-systems",
    sourcePath: "src/app/proof-backed-security-systems/page.tsx",
  },
  { route: "/media-kit", sourcePath: "src/app/media-kit/page.tsx" },
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
  {
    route: "/pl/catalog/professional-public-footprint-audit",
    sourcePath: "src/app/pl/catalog/professional-public-footprint-audit/page.tsx",
  },
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Single sitemap on apex: marketing routes + English /docs corpus.
  const supportDocs = loadSupportIndex();
  const docs = await getDocsSitemapEntries("witnessops");

  return [
    ...[...staticRoutes, ...polishRoutes].map(({ route }) => ({
      url: canonicalUrl(route || "/"),
      alternates: sitemapLanguageAlternates(route || "/"),
    })),
    ...supportDocs.map((doc) => ({
      url: canonicalUrl(`/support/${doc.slug}`),
    })),
    {
      url: getDocCanonicalUrl("witnessops", []),
      alternates: sitemapLanguageAlternates("/docs"),
    },
    ...docs.map((doc) => ({ url: doc.url })),
  ];
}
