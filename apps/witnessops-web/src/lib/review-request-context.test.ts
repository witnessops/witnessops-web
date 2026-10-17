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
import { isWithdrawnOfferPath } from "./withdrawn-offer-routes";

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

test("the withdrawn workflows route does not preselect that offer", () => {
  assert.equal(isWithdrawnOfferPath("/catalog/workflows"), true);
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

  assert.equal(headerHref, "/review/request");
  assert.equal(footerHref, headerHref);
  assert.equal(selectedServiceFromHref(headerHref), undefined);

  const record = buyerServiceByPublicOfferId("agent-tools-access-review");
  assert.equal(record?.name.en, "AI Agent Tools & Access Review");
  assert.equal(record?.price.en, "Starting at €2,500 · excluding VAT");
});

test("primary offer selection trusts its stable id before public query text", () => {
  const primary = buyerServiceByPublicOfferId("agent-tools-access-review");

  assert.equal(
    buyerServiceFromRequestOffer(
      "agent-tools-access-review",
      "buyer-edited text",
    ),
    primary,
  );
  assert.equal(
    buyerServiceFromRequestOffer(null, "AI Agent Tools & Access Review"),
    primary,
  );
  assert.equal(
    buyerServiceFromRequestOffer("unknown", "AI Agent Tools & Access Review"),
    undefined,
  );
  assert.equal(
    buyerServiceFromRequestOffer("", "AI Agent Tools & Access Review"),
    undefined,
  );
  assert.equal(
    buyerServiceFromRequestOffer(null, "AI Agent Tools & Access Review "),
    undefined,
  );
});

test("shared review CTAs keep canonical product context on detail and selected request routes", () => {
  const detailHref = reviewRequestHrefForLocation(
    "pl",
    "/pl/reviews/external-attack-surface-review",
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
    "€1\u00A0900\u00A0bez\u00A0VAT",
  );
});

test("every selectable service detail keeps its catalogue-authoritative request", () => {
  for (const service of BUYER_SERVICES) {
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
      assert.equal(
        fromDetail,
        isWithdrawnOfferPath(detailHref) ? buyerRequestHref(locale) : expected,
        `${locale} ${service.id} detail`,
      );

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
        "offerId=agent-tools-access-review&productId=OFFSEC-EXTERNAL-EXPOSURE&offer=Public+Exposure+Review",
      ),
    ),
    "/review/request?offerId=agent-tools-access-review&offer=AI+Agent+Tools+%26+Access+Review",
  );
  assert.equal(
    reviewRequestHrefForLocation(
      "en",
      "/review/request",
      new URLSearchParams("offer=AI+Agent+Tools+%26+Access+Review"),
    ),
    "/review/request?offerId=agent-tools-access-review&offer=AI+Agent+Tools+%26+Access+Review",
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
    /^\/review\/request\?offerId=professional-public-footprint-audit&/,
  );
  assert.equal(
    reviewRequestHrefForLocation(
      "en",
      "/customer-security-review",
      emptySearch,
    ),
    "/review/request",
  );
  assert.equal(
    reviewRequestHrefForLocation("en", "/withdrawn-offer", emptySearch),
    reviewRequestHrefForLocation("en", "/catalog/offsec-local-audit", emptySearch),
  );
  assert.equal(
    reviewRequestHrefForLocation("pl", "/pl/withdrawn-offer", emptySearch),
    reviewRequestHrefForLocation("pl", "/pl/catalog/offsec-local-audit", emptySearch),
  );
});

test("Polish header uses the review request while footer and service enquiries preserve their selected context", () => {
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

  assert.match(navbar, /href: POLISH_PUBLIC_NAV\.cta\.href/);
  assert.doesNotMatch(navbar, /href: signupUrl \|\| "\/check"/);
  assert.match(footer, /reviewRequestHrefForLocation\(/);
  assert.match(footer, /primaryHref=\{reviewRequestHref\}/);
  assert.match(serviceDetail, /href=\{requestHref\}/);
});
