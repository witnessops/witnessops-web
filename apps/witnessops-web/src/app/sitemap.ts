import { editorialArticles } from '@/lib/research';
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
import { SITEMAP_OMITTED_ROUTES } from "@/lib/withdrawn-offer-routes";
import { BUYER_SERVICES } from "@/lib/buyer-services";
import { listSkills } from "@/lib/skills/catalog";

type StaticRoute = {
  route: string;
  /** Route ownership reference only. Filesystem mtimes are not freshness authority. */
  sourcePath?: string;
};

const staticRoutes: StaticRoute[] = [
  { route: "/research", sourcePath: "src/app/research/page.tsx" },
  { route: "/chronicles", sourcePath: "src/app/(marketing)/chronicles/page.tsx" },
  { route: "/chronicles/001-the-unauthorized-feline", sourcePath: "src/app/(marketing)/chronicles/[slug]/page.tsx" },
  { route: "/chronicles/002-sir-whiskers-opens-a-pull-request", sourcePath: "src/app/(marketing)/chronicles/[slug]/page.tsx" },
  { route: "/chronicles/003-the-meeting-nobody-authorized", sourcePath: "src/app/(marketing)/chronicles/[slug]/page.tsx" },
  { route: "/chronicles/004-the-agent-who-scheduled-a-meeting-with-himself", sourcePath: "src/app/(marketing)/chronicles/[slug]/page.tsx" },
  ...editorialArticles.map(entry => ({ route: entry.href, sourcePath: entry.contentReference })),
  { route: "/catalog/automation-repair", sourcePath: "src/app/(marketing)/catalog/automation-repair/page.tsx" },
  { route: "/pl/catalog/automation-repair", sourcePath: "src/app/pl/catalog/automation-repair/page.tsx" },
  { route: "" },
  { route: "/library", sourcePath: "src/app/(library)/library/page.tsx" },
  ...listSkills().map(({ slug }) => ({
    route: `/library/${slug}`,
    sourcePath: "src/app/(library)/library/[slug]/page.tsx",
  })),
  { route: "/pricing", sourcePath: "src/app/(marketing)/pricing/page.tsx" },
  {
    route: "/reviews/agent-action-security-review",
    sourcePath: "src/app/(marketing)/reviews/agent-action-security-review/page.tsx",
  },
  { route: "/how-it-works", sourcePath: "src/app/(marketing)/how-it-works/page.tsx" },
  { route: "/about", sourcePath: "src/app/(marketing)/about/page.tsx" },
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
  { route: "/contact", sourcePath: "src/app/(marketing)/contact/page.tsx" },
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

const REDIRECTED_POLISH_CATALOG = new Set([
  "/pl/catalog",
  "/pl/catalog/offsec-external-exposure",
]);

const polishRoutes: StaticRoute[] = [
  { route: "/pl", sourcePath: "src/app/pl/page.tsx" },
  {
    route: "/pl/reviews/agent-action-security-review",
    sourcePath: "src/app/pl/reviews/agent-action-security-review/page.tsx",
  },
  { route: "/pl/library", sourcePath: "src/app/pl/library/page.tsx" },
  ...getPolishSkus().map(({ id }) => ({
    route: `/pl/catalog/${id.toLowerCase()}`,
    sourcePath: "src/app/pl/catalog/[skuId]/page.tsx",
  })),
  { route: "/pl/contact", sourcePath: "src/app/pl/contact/page.tsx" },
  { route: "/pl/docs", sourcePath: "src/app/pl/docs/page.tsx" },
  { route: "/pl/support", sourcePath: "src/app/pl/support/page.tsx" },
  { route: "/pl/verify", sourcePath: "src/app/pl/verify/page.tsx" },
  { route: "/pl/why-witnessops", sourcePath: "src/app/pl/why-witnessops/page.tsx" },
  { route: "/pl/privacy", sourcePath: "src/app/pl/privacy/page.tsx" },
  { route: "/pl/terms", sourcePath: "src/app/pl/terms/page.tsx" },
  { route: "/pl/security", sourcePath: "src/app/pl/security/page.tsx" },
  { route: "/pl/media-kit", sourcePath: "src/app/pl/media-kit/page.tsx" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Single sitemap on apex: marketing routes + English /docs corpus.
  const supportDocs = loadSupportIndex();
  const docs = await getDocsSitemapEntries("witnessops");

  return [
    ...[...staticRoutes, ...polishRoutes]
      .filter(({ route }) => !SITEMAP_OMITTED_ROUTES.has(route) && !REDIRECTED_POLISH_CATALOG.has(route))
      .map(({ route }) => ({
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
