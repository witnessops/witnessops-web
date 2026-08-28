import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  BUYER_SERVICES,
  buyerRequestHref,
  buyerServiceByProductId,
  buyerServiceByPublicOfferId,
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
    "/review/request?offerId=bounded-workflow-review&offer=Agent+Risk+%26+Control+Review",
  );
  assert.equal(footerHref, headerHref);

  for (const href of [headerHref, footerHref]) {
    const selected = selectedServiceFromHref(href);
    assert.equal(selected?.name.en, "Agent Risk & Control Review");
    assert.equal(selected?.price.en, "From €1,500");
    assert.equal(
      selected?.timing.en,
      "Confirmed during the non-secret fit check",
    );
  }
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
      if (expected === buyerRequestHref(locale)) continue;

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

test("review CTA context is allowlisted and preserves intentional generic routes", () => {
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
    reviewRequestHrefForLocation(
      "en",
      "/catalog/professional-public-footprint-audit",
      emptySearch,
    ),
    "/review/request",
  );
  assert.equal(
    reviewRequestHrefForLocation(
      "en",
      "/customer-security-review",
      emptySearch,
    ),
    "/review/request",
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
