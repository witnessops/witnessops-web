import assert from "node:assert/strict";
import test from "node:test";

import { BUYER_SERVICES } from "@/lib/buyer-services";
import { reviewRequestHrefForLocation } from "./review-request-context";

test("shared sales CTAs use only the current agent offer on active and historical routes", () => {
  for (const locale of ["en", "pl"] as const) {
    const expected = `${locale === "pl" ? "/pl" : ""}/review/request?offerId=agent-action-security-review`;
    const paths = [
      "/", "/review/request", "/reviews", "/withdrawn-offer",
      "/reviews/external-attack-surface-review", "/customer-security-review",
      ...BUYER_SERVICES.flatMap((service) => service.detailHref[locale] ? [service.detailHref[locale]!] : []),
    ];
    for (const pathname of paths) {
      assert.equal(reviewRequestHrefForLocation(locale, pathname, new URLSearchParams()), expected, pathname);
    }
  }
});

test("request query text cannot revive a retired sales CTA or propagate arbitrary parameters", () => {
  for (const query of [
    "offerId=agent-action-security-review",
    "productId=OFFSEC-EXTERNAL-EXPOSURE",
    "offerId=agent-tools-access-review",
    "offerId=bounded-workflow-review",
    "offerId=agent-action-security-review&productId=OFFSEC-EXTERNAL-EXPOSURE",
    "offer=AI+Agent+Tools+%26+Access+Review",
    "offerId=unknown&token=secret",
  ]) {
    assert.equal(
      reviewRequestHrefForLocation("en", "/review/request", new URLSearchParams(query)),
      "/review/request?offerId=agent-action-security-review",
      query,
    );
  }
});
