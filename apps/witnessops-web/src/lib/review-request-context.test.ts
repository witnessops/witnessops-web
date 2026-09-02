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
    "/review/request?offerId=bounded-workflow-review&offer=Agent+Workflow+Reconstruction",
  );
  assert.equal(footerHref, headerHref);

  for (const href of [headerHref, footerHref]) {
    const selected = selectedServiceFromHref(href);
    assert.equal(selected?.name.en, "Agent Workflow Reconstruction");
    assert.equal(selected?.price.en, "€2,500 fixed");
    assert.equal(
      selected?.timing.en,
      "Within 10 working days after evidence rules are agreed",
    );
  }
});

test("primary offer selection trusts its stable id before public query text", () => {
  const primary = buyerServiceByPublicOfferId("bounded-workflow-review");

  assert.equal(
    buyerServiceFromRequestOffer(
      "bounded-workflow-review",
      "Public Exposure Review",
    ),
    primary,
  );
  assert.equal(
    buyerServiceFromRequestOffer(null, "Agent Workflow Reconstruction"),
    primary,
  );
  assert.equal(
    buyerServiceFromRequestOffer("unknown", "Agent Workflow Reconstruction"),
    undefined,
  );
  assert.equal(
    buyerServiceFromRequestOffer("", "Agent Workflow Reconstruction"),
    undefined,
  );
  assert.equal(
    buyerServiceFromRequestOffer(null, "Agent Workflow Reconstruction "),
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
  assert.equal(selected?.name.pl, "Public Exposure Review");
  assert.equal(
    selected?.price.pl,
    "€1 900 netto — jeden autoryzowany system publicznie dostępny",
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

test("review CTA context rejects unknown values to the canonical primary offer and preserves every service detail", () => {
  assert.equal(
    reviewRequestHrefForLocation(
      "en",
      "/review/request",
      new URLSearchParams(
        "offerId=bounded-workflow-review&productId=OFFSEC-EXTERNAL-EXPOSURE&offer=Public+Exposure+Review",
      ),
    ),
    "/review/request?offerId=bounded-workflow-review&offer=Agent+Workflow+Reconstruction",
  );
  assert.equal(
    reviewRequestHrefForLocation(
      "en",
      "/review/request",
      new URLSearchParams("offer=Agent+Workflow+Reconstruction"),
    ),
    "/review/request?offerId=bounded-workflow-review&offer=Agent+Workflow+Reconstruction",
  );
  assert.equal(
    reviewRequestHrefForLocation(
      "en",
      "/review/request",
      new URLSearchParams(
        "productId=OFFSEC-EXTERNAL-EXPOSURE&offer=Agent+Workflow+Reconstruction",
      ),
    ),
    "/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE&offer=Public+Exposure+Review",
  );
  assert.equal(
    reviewRequestHrefForLocation(
      "en",
      "/review/request",
      new URLSearchParams(
        "offerId=unknown&productId=OFFSEC-PILOT&offer=Fabricated&token=secret",
      ),
    ),
    "/review/request?offerId=bounded-workflow-review&offer=Agent+Workflow+Reconstruction",
  );
  assert.equal(
    reviewRequestHrefForLocation("en", "/", emptySearch),
    "/review/request?offerId=bounded-workflow-review&offer=Agent+Workflow+Reconstruction",
  );
  assert.equal(
    reviewRequestHrefForLocation("pl", "/pl", emptySearch),
    "/pl/review/request?offerId=bounded-workflow-review&offer=Agent+Workflow+Reconstruction",
  );
  assert.match(
    reviewRequestHrefForLocation(
      "en",
      "/catalog/professional-public-footprint-audit",
      emptySearch,
    ),
    /^\/review\/request\?offerId=professional-public-footprint-audit&/,
  );
  assert.match(
    reviewRequestHrefForLocation(
      "en",
      "/customer-security-review",
      emptySearch,
    ),
    /^\/review\/request\?offerId=customer-security-review-sprint&/,
  );
});

test("header, footer, and service contact CTA use the shared context contract", () => {
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

  assert.match(navbar, /reviewRequestHrefForLocation\(/);
  assert.match(footer, /reviewRequestHrefForLocation\(/);
  assert.match(footer, /primaryHref=\{reviewRequestHref\}/);
  assert.match(serviceDetail, /primaryHref=\{requestHref\}/);
});
