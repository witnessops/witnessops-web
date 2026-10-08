import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  BUYER_SERVICES,
  buyerRequestHref,
  buyerServiceByProductId,
  buyerServiceByPublicOfferId,
  buyerServiceFromRequestOffer,
  buyerServiceRequestHref,
  type BuyerLocale,
} from "@/lib/buyer-services";
import { reviewRequestHrefForLocation } from "./review-request-context";

const emptySearch = new URLSearchParams();

function selectedServiceFromHref(href: string) {
  const url = new URL(href, "https://witnessops.com");
  const productId = url.searchParams.get("productId");
  if (productId) {
    return buyerServiceByProductId(productId);
  }
  const offerId = url.searchParams.get("offerId");
  return offerId ? buyerServiceByPublicOfferId(offerId) : undefined;
}

test("shared review CTAs keep the workflow offer selected from its detail route", () => {
  const headerHref = reviewRequestHrefForLocation(
    "en",
    "/catalog/workflows",
    emptySearch,
  );
  const footerHref = reviewRequestHrefForLocation(
    "en",
    "/catalog/workflows",
    emptySearch,
  );

  assert.equal(
    headerHref,
    "/review/request?offerId=agent-action-security-review&offer=Agent+Action+Security+Review",
  );
  assert.equal(footerHref, headerHref);

  for (const href of [headerHref, footerHref]) {
    const selected = selectedServiceFromHref(href);
    assert.equal(selected?.name.en, "Agent Action Security Review");
    assert.equal(selected?.price.en, "€2,500 fixed · excluding VAT");
    assert.equal(
      selected?.timing.en,
      "Within 10 working days after evidence rules are agreed",
    );
  }
});

test("primary offer selection trusts its stable id before public query text", () => {
  const primary = buyerServiceByPublicOfferId("agent-action-security-review");

  assert.equal(
    buyerServiceFromRequestOffer(
      "agent-action-security-review",
      "buyer-edited text",
    ),
    primary,
  );
  assert.equal(
    buyerServiceFromRequestOffer(null, "Agent Action Security Review"),
    undefined,
  );
  assert.equal(
    buyerServiceFromRequestOffer("unknown", "Agent Action Security Review"),
    undefined,
  );
  assert.equal(
    buyerServiceFromRequestOffer("", "Agent Action Security Review"),
    undefined,
  );
  assert.equal(
    buyerServiceFromRequestOffer(null, "Agent Action Security Review "),
    undefined,
  );
});

test("shared review CTAs keep canonical product context on detail and selected request routes", () => {
  const detailHref = reviewRequestHrefForLocation(
    "pl",
    "/pl/catalog/offsec-external-exposure",
    emptySearch,
  );
  const selectedRequestHref = reviewRequestHrefForLocation(
    "pl",
    "/pl/review/request",
    new URLSearchParams(detailHref.split("?")[1]),
  );

  assert.equal(selectedRequestHref, detailHref);
  assert.match(detailHref, /^\/pl\/review\/request\?productId=OFFSEC-EXTERNAL-EXPOSURE&/);
  const selected = selectedServiceFromHref(selectedRequestHref);
  assert.equal(selected?.name.pl, "External Attack Surface Review");
  assert.equal(
    selected?.price.pl,
    "€1 900 · bez VAT",
  );
});

test("every selectable service detail keeps its catalogue-authoritative request", () => {
  for (const service of BUYER_SERVICES.filter(s => ["agent-action-security-review", "external-exposure-assessment"].includes(s.id))) {
    for (const locale of ["en", "pl"] as const satisfies readonly BuyerLocale[]) {
      const detailHref = service.detailHref[locale];
      if (!detailHref) continue;

      const expected = buyerServiceRequestHref(locale, service);
      assert.notEqual(
        expected,
        buyerRequestHref(locale),
        `${locale} ${service.id} must preserve selection`,
      );

      const fromDetail = reviewRequestHrefForLocation(
        locale,
        detailHref,
        emptySearch,
      );
      assert.equal(fromDetail, expected, `${locale} ${service.id} detail`);

      const fromSelectedRequest = reviewRequestHrefForLocation(
        locale,
        buyerRequestHref(locale),
        new URLSearchParams(expected.split("?")[1]),
      );
      assert.equal(
        fromSelectedRequest,
        expected,
        `${locale} ${service.id} selected request`,
      );
    }
  }
});

test("review CTA context drops unknown values into a neutral enquiry and preserves every service detail", () => {
  assert.equal(
    reviewRequestHrefForLocation(
      "en",
      "/review/request",
      new URLSearchParams(
        "offerId=agent-action-security-review&productId=OFFSEC-EXTERNAL-EXPOSURE&offer=Public+Exposure+Review",
      ),
    ),
    "/review/request",
  );
  assert.equal(
    reviewRequestHrefForLocation(
      "en",
      "/review/request",
      new URLSearchParams("offer=Agent+Action+Security+Review"),
    ),
    "/review/request",
  );
  assert.equal(
    reviewRequestHrefForLocation(
      "en",
      "/review/request",
      new URLSearchParams(
        "productId=OFFSEC-EXTERNAL-EXPOSURE&offer=buyer-edited-text",
      ),
    ),
    "/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE&offer=External+Attack+Surface+Review",
  );
  assert.equal(
    reviewRequestHrefForLocation(
      "en",
      "/review/request",
      new URLSearchParams(
        "offerId=unknown&productId=OFFSEC-PILOT&offer=Fabricated&token=secret",
      ),
    ),
    "/review/request",
  );
  assert.equal(
    reviewRequestHrefForLocation("en", "/", emptySearch),
    "/review/request",
  );
  assert.equal(
    reviewRequestHrefForLocation("pl", "/pl", emptySearch),
    "/pl/review/request",
  );
  assert.match(
    reviewRequestHrefForLocation(
      "en",
      "/catalog/professional-public-footprint-audit",
      emptySearch,
    ),
    /^\/review\/request$/,
  );
  assert.match(
    reviewRequestHrefForLocation(
      "en",
      "/customer-security-review",
      emptySearch,
    ),
    /^\/review\/request$/,
  );
});

test("header uses the configured signup destination while footer and service enquiries preserve their selected context", () => {
  const navbar = readFileSync(
    resolve(__dirname, "../components/shared/navbar.tsx"),
    "utf-8",
  );
  const footer = readFileSync(
    resolve(__dirname, "../components/marketing/footer.tsx"),
    "utf-8",
  );
  const serviceDetail = readFileSync(
    resolve(__dirname, "../components/marketing/buyer-service-detail.tsx"),
    "utf-8",
  );

  assert.match(navbar, /href: signupUrl \|\| "\/check"/);
  assert.match(footer, /reviewRequestHrefForLocation\(/);
  assert.match(footer, /primaryHref=\{reviewRequestHref\}/);
  assert.match(serviceDetail, /href=\{requestHref\}/);
});

test("historical source records survive without a newly selectable paid offer", () => {
  for (const id of ["agent-tools-access-review", "automation-repair-handover", "customer-security-review-sprint", "professional-public-footprint-audit"]) {
    assert.equal(buyerServiceByPublicOfferId(id), undefined);
    assert.equal(reviewRequestHrefForLocation("en", "/review/request", new URLSearchParams({offerId:id})), "/review/request");
  }
  assert.ok(BUYER_SERVICES.find(s => s.id === "agent-tools-access-review"));
});
