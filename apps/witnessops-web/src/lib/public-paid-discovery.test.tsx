import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BuyerCatalogue } from "@/components/marketing/buyer-catalogue";
import PricingPage from "@/app/(marketing)/pricing/page";
import { BUYER_SERVICES, buyerServiceRequestHref } from "@/lib/buyer-services";
import { PUBLIC_AGENT_ACTION_REVIEW_ID, publicPaidReviews } from "./public-paid-reviews";

for (const locale of ["en", "pl"] as const) {
  test(`${locale} catalogue renders only Agent Action and external, preserving source terms and request identities`, () => {
    const html = renderToStaticMarkup(createElement(BuyerCatalogue, { locale }));
    const ids = [...html.matchAll(/data-buyer-service="([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(ids, [PUBLIC_AGENT_ACTION_REVIEW_ID, "external-exposure-assessment"]);
    for (const service of publicPaidReviews(BUYER_SERVICES)) {
      assert.ok(html.includes(service.price[locale]));
      assert.ok(html.includes(buyerServiceRequestHref(locale, service).replaceAll("&", "&amp;")));
    }
    assert.match(html, /offerId=agent-action-security-review/);
    assert.doesNotMatch(html, /href="\/catalog\/workflows"/);
    assert.doesNotMatch(html, /offerId=agent-tools-access-review/);
    assert.doesNotMatch(html, /Early Bird|Internet Footprint Review|€500|€250 diagnosis|One Server Security Check|Customer Security Review Sprint|Professional Public Footprint Audit/);
    assert.doesNotMatch(html, /buy\.stripe\.com|checkout\.stripe\.com/);
    assert.match(html, /external-exposure-assessment/);
  });
}

test("pricing renders the same two reviews through shared catalogue presentation", () => {
  const html = renderToStaticMarkup(createElement(PricingPage));
  assert.deepEqual(
    [...html.matchAll(/data-pricing-service="([^"]+)"/g)].map((match) => match[1]),
    [PUBLIC_AGENT_ACTION_REVIEW_ID, "external-exposure-assessment"],
  );
  assert.deepEqual(
    [...html.matchAll(/data-pricing-review="([^"]+)"/g)].map((match) => match[1]),
    ["agent-action", "external-exposure"],
  );
  assert.match(html, /€2,500 fixed/);
  assert.match(html, /€1,900 · excluding VAT/);
  assert.doesNotMatch(html, /enquiryPath=early-bird|Internet Footprint Review|€500|offerId=agent-tools-access-review/);
  assert.match(html, /does not authorise collection or start a review/);
});
