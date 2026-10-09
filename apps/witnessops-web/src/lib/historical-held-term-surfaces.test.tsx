import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import { generateMetadata as englishCatalogMetadata } from "@/app/(marketing)/catalog/[skuId]/page";
import CatalogWorkflowsPage from "@/app/(marketing)/catalog/workflows/page";
import ProfessionalPublicFootprintAuditPage from "@/app/(marketing)/catalog/professional-public-footprint-audit/page";
import PolishProfessionalPublicFootprintAuditPage from "@/app/pl/catalog/professional-public-footprint-audit/page";
import CustomerSecurityReviewPage from "@/app/customer-security-review/page";
import PolishCustomerSecurityReviewPage from "@/app/pl/customer-security-review/page";
import { metadata as englishCatalogIndexMetadata } from "@/app/(marketing)/catalog/page";
import { metadata as englishFootprintMetadata } from "@/app/(marketing)/catalog/professional-public-footprint-audit/page";
import { metadata as englishCustomerSecurityMetadata } from "@/app/customer-security-review/page";
import { metadata as homeMetadata } from "@/app/page";
import { metadata as polishFootprintMetadata } from "@/app/pl/catalog/professional-public-footprint-audit/page";
import { generateMetadata as polishCatalogMetadata } from "@/app/pl/catalog/[skuId]/page";
import { metadata as polishCustomerSecurityMetadata } from "@/app/pl/customer-security-review/page";
import { metadata as polishHomeMetadata } from "@/app/pl/page";
import sitemap from "@/app/sitemap";
import {
  evaluateNewSalesIntakeBody,
  resolveNewSalesPageQuery,
} from "@/lib/new-review-request-policy";
import {
  HISTORICAL_UNINDEXED_PUBLIC_PATHS,
  isHistoricallyUnindexedPublicPath,
} from "@/lib/historical-public-routes";
import {
  organizationJsonLd,
  primaryOfferBreadcrumbJsonLd,
  primaryOfferServiceJsonLd,
  publicExposureServiceJsonLd,
  websiteJsonLd,
} from "@/lib/public-seo";
import { searchWitnessOpsDocs } from "@/lib/server/openai-app/witnessops-mcp-server";

const repoRoot = resolve(__dirname, "../../../..");
const HELD_TERM =
  /3 working days|three working days|three-working-day|10 working days|fixed quote after scope|€550|7–10/;
const CURRENT_TIMING = "Delivery timing agreed in the signed statement of work.";

function render(node: ReactNode) {
  return renderToStaticMarkup(
    createElement(
      AppRouterContext.Provider,
      {
        value: {
          back() {},
          forward() {},
          refresh() {},
          push() {},
          replace() {},
          prefetch() {},
        },
      },
      node,
    ),
  );
}

function jsonLdBlocks(html: string): string[] {
  return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/g)].map(
    (match) => match[1] ?? "",
  );
}

function assertNoindex(metadata: { robots?: unknown }, route: string) {
  assert.deepEqual(metadata.robots, { index: false, follow: true }, route);
}

function assertIndexable(metadata: { robots?: unknown }, route: string) {
  const robots = metadata.robots as { index?: boolean } | undefined;
  assert.notEqual(robots?.index, false, route);
}

test("historical offer pages are noindex and current offer pages stay indexable", async () => {
  assertNoindex(englishFootprintMetadata, "/catalog/professional-public-footprint-audit");
  assertNoindex(polishFootprintMetadata, "/pl/catalog/professional-public-footprint-audit");
  assertNoindex(englishCustomerSecurityMetadata, "/customer-security-review");
  assertNoindex(polishCustomerSecurityMetadata, "/pl/customer-security-review");
  assert.deepEqual(CatalogWorkflowsPage, CatalogWorkflowsPage);
  const workflowsSource = readFileSync(
    resolve(__dirname, "../app/(marketing)/catalog/workflows/page.tsx"),
    "utf8",
  );
  assert.match(workflowsSource, /robots: \{ index: false, follow: true \}/);
  assertIndexable(homeMetadata, "/");
  assertIndexable(polishHomeMetadata, "/pl");
  assertIndexable(englishCatalogIndexMetadata, "/catalog");
  const englishExternal = await englishCatalogMetadata({
    params: Promise.resolve({ skuId: "offsec-external-exposure" }),
  });
  const polishExternal = await polishCatalogMetadata({
    params: Promise.resolve({ skuId: "offsec-external-exposure" }),
  });
  assertIndexable(englishExternal, "/catalog/offsec-external-exposure");
  assertIndexable(polishExternal, "/pl/catalog/offsec-external-exposure");
  const robots = readFileSync(resolve(__dirname, "../app/robots.ts"), "utf8");
  assert.match(robots, /disallow: \["\/verify\/skill"\]/);
  for (const route of HISTORICAL_UNINDEXED_PUBLIC_PATHS) {
    assert.doesNotMatch(robots, new RegExp(route.replaceAll("/", "\\/")));
  }
});

test("rendered historical pages keep their record banner and emit no held-term JSON-LD", () => {
  const rendered = [
    render(createElement(CatalogWorkflowsPage)),
    render(createElement(ProfessionalPublicFootprintAuditPage)),
    render(createElement(PolishProfessionalPublicFootprintAuditPage)),
    render(createElement(CustomerSecurityReviewPage)),
    render(createElement(PolishCustomerSecurityReviewPage)),
  ];
  const banners = [
    "This review is not offered for new engagements.",
    "This review is not offered for new engagements.",
    "Ten przegląd nie jest oferowany dla nowych zleceń.",
    "This review is not offered for new engagements.",
    "Ten przegląd nie jest oferowany dla nowych zleceń.",
  ];
  rendered.forEach((html, index) => {
    assert.match(html, new RegExp(banners[index]!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    for (const block of jsonLdBlocks(html)) {
      assert.doesNotMatch(block, HELD_TERM, block);
    }
  });
  const builders = [
    organizationJsonLd,
    websiteJsonLd,
    primaryOfferServiceJsonLd(),
    primaryOfferBreadcrumbJsonLd(),
    publicExposureServiceJsonLd("en"),
    publicExposureServiceJsonLd("pl"),
  ];
  for (const value of builders) {
    assert.doesNotMatch(JSON.stringify(value), HELD_TERM);
  }
});

test("buyer docs and historical request copy use the signed-statement timing line", () => {
  const reviewWorkflow = readFileSync(
    resolve(repoRoot, "content/witnessops/docs/getting-started/review-workflow.mdx"),
    "utf8",
  );
  const buyerPath = readFileSync(
    resolve(repoRoot, "content/witnessops/docs/getting-started/proof-run-buyer-path.mdx"),
    "utf8",
  );
  for (const source of [reviewWorkflow, buyerPath]) {
    assert.match(source, /Agent Action Security Review/);
    assert.match(source, /€2,500 excluding VAT/);
    assert.match(source, /External Attack Surface Review/);
    assert.match(source, /€1,900 excluding VAT/);
    assert.match(source, /one retest within 30 calendar days of report handover/);
    assert.ok(source.includes(CURRENT_TIMING));
    assert.doesNotMatch(source, HELD_TERM);
  }
  for (const file of [
    "docs/commercial/06-scope-agreement-skeleton.md",
    "docs/commercial/10-public-exposure-review-offer.md",
    "docs/commercial/11-public-exposure-review-fit-check.md",
  ]) {
    const source = readFileSync(resolve(repoRoot, file), "utf8");
    assert.ok(source.includes(CURRENT_TIMING), file);
    assert.match(source, /€1,900 excluding VAT/);
    assert.doesNotMatch(source, HELD_TERM, file);
  }
  assert.match(
    readFileSync(resolve(repoRoot, "docs/commercial/06-scope-agreement-skeleton.md"), "utf8"),
    /€2,500 excluding VAT/,
  );
  assert.match(
    readFileSync(resolve(repoRoot, "docs/commercial/10-public-exposure-review-offer.md"), "utf8"),
    /HELD — not offered, pending founder decision/,
  );
  for (const locale of ["en", "pl"] as const) {
    const html = render(
      createElement(ContactForm, { locale, intent: "agent-tools-access-review" }),
    );
    assert.match(html, /agent-tools-access-review/);
    assert.doesNotMatch(html, /value="agent-action-security-review"/);
    assert.match(html, /€2,500/);
    assert.match(html, /€1,900/);
    assert.doesNotMatch(html, HELD_TERM);
    if (locale === "en") assert.match(html, /Delivery timing agreed in the signed statement of work/);
    if (locale === "pl") assert.match(html, /Termin realizacji uzgodniony w podpisanym zakresie prac/);
  }
  const confirmation = readFileSync(
    resolve(__dirname, "../components/review-request/review-request-confirmed.tsx"),
    "utf8",
  );
  assert.ok(confirmation.includes(CURRENT_TIMING));
  assert.match(confirmation, /Termin realizacji uzgodniony w podpisanym zakresie prac/);
  assert.match(confirmation, /agent-tools-access-review/);
  assert.doesNotMatch(confirmation, /PRIMARY_OFFER\.timing|fixed quote after scope|stała wycena po określeniu zakresu/);
});

test("old offer ids stay historical and the two current ids still route", () => {
  assert.deepEqual(evaluateNewSalesIntakeBody({ intent: "agent-tools-access-review" }), {
    accepted: false,
    reason: "historical",
  });
  assert.deepEqual(evaluateNewSalesIntakeBody({ intent: "customer-security-review-sprint" }), {
    accepted: false,
    reason: "historical",
  });
  assert.deepEqual(evaluateNewSalesIntakeBody({ intent: "professional-public-footprint-audit" }), {
    accepted: false,
    reason: "historical",
  });
  assert.deepEqual(evaluateNewSalesIntakeBody({ intent: "agent-action-security-review", email: "a@b.co" }), {
    accepted: true,
    role: "offer",
    intent: "agent-action-security-review",
  });
  assert.deepEqual(evaluateNewSalesIntakeBody({ intent: "OFFSEC-EXTERNAL-EXPOSURE", email: "a@b.co" }), {
    accepted: true,
    role: "product",
    intent: "OFFSEC-EXTERNAL-EXPOSURE",
  });
  assert.deepEqual(resolveNewSalesPageQuery({ offerId: "agent-tools-access-review" }), {
    state: "rejected",
    reason: "historical",
  });
  assert.deepEqual(resolveNewSalesPageQuery({ offerId: "agent-action-security-review" }), {
    state: "selected",
    role: "offer",
    intent: "agent-action-security-review",
  });
  assert.deepEqual(resolveNewSalesPageQuery({ productId: "OFFSEC-EXTERNAL-EXPOSURE" }), {
    state: "selected",
    role: "product",
    intent: "OFFSEC-EXTERNAL-EXPOSURE",
  });
  const historical = resolveNewSalesPageQuery({ offerId: "agent-tools-access-review" });
  assert.equal(historical.state, "rejected");
  if (historical.state === "rejected") {
    assert.equal(historical.reason, "historical");
  }
});

test("sitemap and docs search omit historical pages and keep current pages", async () => {
  const entries = await sitemap();
  const paths = new Set(entries.map((entry) => new URL(entry.url).pathname));
  for (const route of HISTORICAL_UNINDEXED_PUBLIC_PATHS) {
    assert.equal(paths.has(route), false, route);
  }
  for (const route of ["/catalog", "/catalog/offsec-external-exposure", "/review/request", "/pl/catalog"]) {
    assert.equal(paths.has(route), true, route);
  }
  const search = await searchWitnessOpsDocs("review workflow external attack surface");
  assert.ok(search.results.some((result) => result.url.endsWith("/docs/getting-started/review-workflow")));
  for (const result of search.results) {
    assert.equal(isHistoricallyUnindexedPublicPath(result.url), false, result.url);
  }
  const assistant = readFileSync(
    resolve(__dirname, "server/ask-witnessops/public-answer-runtime.ts"),
    "utf8",
  );
  assert.match(assistant, /canonical_href: "https:\/\/witnessops\.com\/why-witnessops"/);
  assert.doesNotMatch(assistant, /catalog\/workflows#reviewer-heading/);
  assert.match(assistant, /isHistoricallyUnindexedPublicPath/);
});

test("remaining held-term hits are historical records, held marks, or test fixtures", () => {
  const output = execFileSync(
    "rg",
    [
      "-l",
      "-e",
      "3 working days",
      "-e",
      "three working days",
      "-e",
      "three-working-day",
      "-e",
      "10 working days",
      "-e",
      "fixed quote after scope",
      "-e",
      "€550",
      "-e",
      "7–10",
      "--glob",
      "!node_modules/**",
      "--glob",
      "!.next/**",
      repoRoot,
    ],
    { encoding: "utf8" },
  );
  const files = output
    .split("\n")
    .map((line) => line.trim().replace(`${repoRoot}/`, ""))
    .filter(Boolean)
    .sort();
  const historical = new Set([
    "apps/witnessops-web/src/lib/buyer-services.ts",
    "apps/witnessops-web/src/lib/commercial-truth.ts",
    "apps/witnessops-web/src/lib/service-landings.ts",
    "docs/commercial/00-offer-learning-guide.md",
    "docs/commercial/01-fit-check-reply.md",
    "docs/commercial/04-demo-script-15min.md",
    "docs/commercial/13-public-route-disposition.md",
    "docs/commercial/14-linkedin-premium-experiment.md",
    "docs/commercial/16-agent-workflow-reconstruction-offer.md",
    "docs/commercial/17-ai-agent-tools-access-review-offer.md",
    "docs/commercial/18-two-offer-portfolio.md",
    "docs/commercial/drafts/fit-check-B-csr.txt",
    "docs/commercial/worked-examples/acme-csr-full.md",
    "docs/product-decisions/AGENT_VERIFICATION_FUNNEL_V1.md",
  ]);
  const fixtures = files.filter((file) =>
    file.endsWith(".test.ts") ||
    file.endsWith(".test.tsx") ||
    file.endsWith(".spec.ts") ||
    file === "scripts/smoke-buyer-path.ts",
  );
  const unclassified = files.filter((file) => !historical.has(file) && !fixtures.includes(file));
  assert.deepEqual(unclassified, []);
  const truth = readFileSync(resolve(repoRoot, "apps/witnessops-web/src/lib/commercial-truth.ts"), "utf8");
  assert.match(truth, /HELD — not offered, pending founder decision/);
  for (const file of [
    "docs/commercial/00-offer-learning-guide.md",
    "docs/commercial/01-fit-check-reply.md",
    "docs/commercial/04-demo-script-15min.md",
    "docs/commercial/13-public-route-disposition.md",
    "docs/commercial/16-agent-workflow-reconstruction-offer.md",
    "docs/commercial/17-ai-agent-tools-access-review-offer.md",
    "docs/commercial/drafts/fit-check-B-csr.txt",
    "docs/commercial/worked-examples/acme-csr-full.md",
  ]) {
    assert.match(readFileSync(resolve(repoRoot, file), "utf8"), /Historical \/ superseded/);
  }
  assert.match(
    readFileSync(resolve(repoRoot, "docs/commercial/14-linkedin-premium-experiment.md"), "utf8"),
    /SUPERSEDED/,
  );
  assert.match(
    readFileSync(resolve(repoRoot, "docs/product-decisions/AGENT_VERIFICATION_FUNNEL_V1.md"), "utf8"),
    /superseded/i,
  );
  assert.match(
    readFileSync(resolve(repoRoot, "docs/commercial/18-two-offer-portfolio.md"), "utf8"),
    /superseded historical row/,
  );
});
