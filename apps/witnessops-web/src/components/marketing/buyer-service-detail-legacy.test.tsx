import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import AutomationRepairPage from "@/app/(marketing)/catalog/automation-repair/page";
import ProfessionalPublicFootprintAuditPage from "@/app/(marketing)/catalog/professional-public-footprint-audit/page";
import CatalogWorkflowsPage from "@/app/(marketing)/catalog/workflows/page";
import CustomerSecurityReviewPage from "@/app/customer-security-review/page";
import PolishAutomationRepairPage from "@/app/pl/catalog/automation-repair/page";
import PolishProfessionalPublicFootprintAuditPage from "@/app/pl/catalog/professional-public-footprint-audit/page";
import PolishCustomerSecurityReviewPage from "@/app/pl/customer-security-review/page";
import {
  BUYER_SERVICES,
  buyerServiceById,
  type BuyerLocale,
  type BuyerService,
} from "@/lib/buyer-services";
import { PRIMARY_OFFER } from "@/lib/commercial-truth";
import { polishOfferRequestHref } from "@/lib/public-i18n";
import {
  PUBLIC_AGENT_ACTION_REVIEW_ID,
  isPublicPaidReviewId,
} from "@/lib/public-paid-reviews";

import { BuyerServiceDetail } from "./buyer-service-detail";

const WITHDRAWAL = {
  en: "This review is not offered for new engagements.",
  pl: "Ten przegląd nie jest oferowany dla nowych zleceń.",
} as const;

function markup(node: ReturnType<typeof createElement>): string {
  return renderToStaticMarkup(node);
}

function hrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/g)].map((match) =>
    match[1]!.replaceAll("&amp;", "&"),
  );
}

function includesText(html: string, text: string): boolean {
  return html.includes(text) || html.includes(text.replaceAll("&", "&amp;"));
}

function assertHistoricalStopSell(html: string, service: BuyerService, locale: BuyerLocale) {
  assert.match(html, new RegExp(`data-buyer-service-detail="${service.id}"`));
  assert.match(html, new RegExp(`data-legacy-offer-withdrawal="${service.id}"`));
  assert.match(html, new RegExp(WITHDRAWAL[locale]));
  assert.equal(includesText(html, service.name[locale]), true, service.id);
  assert.equal(html.includes(`data-buyer-service-detail="${PUBLIC_AGENT_ACTION_REVIEW_ID}"`), false);
  for (const href of hrefs(html)) {
    assert.equal(href.includes("/review/request"), false, `${service.id} ${href}`);
    assert.equal(href.includes("offerId="), false, `${service.id} ${href}`);
    assert.equal(href.includes("productId="), false, `${service.id} ${href}`);
    assert.equal(href.includes(PUBLIC_AGENT_ACTION_REVIEW_ID), false, `${service.id} ${href}`);
    assert.equal(href.includes("/catalog/offsec-external-exposure"), false, `${service.id} ${href}`);
  }
}

test("legacy detail pages keep their service identity and do not start a new review", () => {
  const legacy = BUYER_SERVICES.filter((service) => !isPublicPaidReviewId(service.id));
  assert.ok(legacy.some((service) => service.id === "agent-tools-access-review"));
  assert.ok(legacy.some((service) => service.id === PRIMARY_OFFER.id));
  assert.equal(legacy.some((service) => service.id === PUBLIC_AGENT_ACTION_REVIEW_ID), false);

  for (const service of legacy) {
    for (const locale of ["en", "pl"] as const) {
      const html = markup(createElement(BuyerServiceDetail, {
        locale,
        service,
        requestHref: `/review/request?offerId=${PUBLIC_AGENT_ACTION_REVIEW_ID}&productId=OFFSEC-EXTERNAL-EXPOSURE`,
      }));
      assertHistoricalStopSell(html, service, locale);
    }
  }
});

test("published detail routes stay on the historical service and do not redirect", () => {
  const pages = [
    [CatalogWorkflowsPage, "agent-tools-access-review", "en"],
    [AutomationRepairPage, "automation-repair-handover", "en"],
    [PolishAutomationRepairPage, "automation-repair-handover", "pl"],
    [CustomerSecurityReviewPage, "customer-security-review-sprint", "en"],
    [PolishCustomerSecurityReviewPage, "customer-security-review-sprint", "pl"],
    [ProfessionalPublicFootprintAuditPage, "professional-public-footprint-audit", "en"],
    [PolishProfessionalPublicFootprintAuditPage, "professional-public-footprint-audit", "pl"],
  ] as const;

  for (const [Page, id, locale] of pages) {
    const html = markup(createElement(Page));
    assertHistoricalStopSell(html, buyerServiceById(id), locale);
  }

  const workflows = markup(createElement(CatalogWorkflowsPage));
  assert.match(workflows, /href="\/review\/sample-cases\/ai-agent-action-proof-run"/);
  assert.match(workflows, /AI Agent Tools &amp; Access Review|AI Agent Tools & Access Review/);
  assert.doesNotMatch(workflows, /Agent Action Security Review/);

  const repair = markup(createElement(AutomationRepairPage));
  assert.match(repair, /href="\/catalog\/workflows"/);
  assert.match(repair, /separate historical service/);
  assert.doesNotMatch(repair, /Describe what you need/);

  const englishSku = readFileSync(
    resolve(__dirname, "../../app/(marketing)/catalog/[skuId]/page.tsx"),
    "utf8",
  );
  const polishSku = readFileSync(
    resolve(__dirname, "../../app/pl/catalog/[skuId]/page.tsx"),
    "utf8",
  );
  const workflowsSource = readFileSync(
    resolve(__dirname, "../../app/(marketing)/catalog/workflows/page.tsx"),
    "utf8",
  );
  assert.match(englishSku, /permanentRedirect\("\/catalog"\)/);
  assert.doesNotMatch(englishSku, /permanentRedirect\("\/catalog\/workflows"\)/);
  assert.doesNotMatch(englishSku, /permanentRedirect\("\/catalog\/offsec-external-exposure"\)/);
  assert.doesNotMatch(polishSku, /permanentRedirect/);
  assert.match(workflowsSource, /buyerServiceById\(PRIMARY_OFFER\.id\)/);
  assert.doesNotMatch(workflowsSource, /PUBLIC_AGENT_ACTION_OFFER|agent-action-security-review/);
  assert.equal(buyerServiceById("agent-tools-access-review").detailHref.en, "/catalog/workflows");
  assert.equal(buyerServiceById("agent-tools-access-review").id, PRIMARY_OFFER.id);
  assert.deepEqual(buyerServiceById(PUBLIC_AGENT_ACTION_REVIEW_ID).detailHref, {});
  assert.equal(buyerServiceById("one-server-security-check").detailHref.en, "/catalog/offsec-local-audit");
  assert.equal(buyerServiceById("external-exposure-assessment").detailHref.en, "/catalog/offsec-external-exposure");
});

test("the two public paid reviews still sell from their own detail identity", () => {
  for (const locale of ["en", "pl"] as const) {
    const agent = buyerServiceById(PUBLIC_AGENT_ACTION_REVIEW_ID);
    const agentHtml = markup(createElement(BuyerServiceDetail, { locale, service: agent }));
    assert.equal(agentHtml.includes("data-legacy-offer-withdrawal"), false);
    assert.match(agentHtml, new RegExp(`data-buyer-service-detail="${PUBLIC_AGENT_ACTION_REVIEW_ID}"`));
    assert.equal(agentHtml.includes('data-buyer-service-detail="agent-tools-access-review"'), false);
    assert.ok(hrefs(agentHtml).some((href) => href.includes(`offerId=${PUBLIC_AGENT_ACTION_REVIEW_ID}`)));
    assert.ok(hrefs(agentHtml).every((href) => !href.includes("offerId=agent-tools-access-review")));

    const external = buyerServiceById("external-exposure-assessment");
    const externalHtml = markup(createElement(BuyerServiceDetail, {
      locale,
      service: external,
      requestHref: locale === "pl" ? polishOfferRequestHref("OFFSEC-EXTERNAL-EXPOSURE") : undefined,
    }));
    assert.equal(externalHtml.includes("data-legacy-offer-withdrawal"), false);
    assert.match(externalHtml, /data-buyer-service-detail="external-exposure-assessment"/);
    assert.ok(hrefs(externalHtml).some((href) => href.includes("productId=OFFSEC-EXTERNAL-EXPOSURE")));
    assert.ok(hrefs(externalHtml).every((href) => !href.includes(PUBLIC_AGENT_ACTION_REVIEW_ID)));
    assert.ok(hrefs(externalHtml).every((href) => !href.includes("agent-tools-access-review")));
  }
});
