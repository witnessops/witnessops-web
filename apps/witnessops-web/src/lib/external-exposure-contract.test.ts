import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { buyerServiceById } from "./buyer-services";
import { POLISH_OFFERS } from "./public-i18n";
import { getServiceLanding } from "./service-landings";

const productId = "OFFSEC-EXTERNAL-EXPOSURE";
const catalog = JSON.parse(
  readFileSync(
    resolve(__dirname, "../../../../packages/catalog/catalog.json"),
    "utf8",
  ),
) as {
  skus: Array<{
    id: string;
    price: { anchor_eur_min: number; anchor_eur_max: number };
    limits?: {
      root_domains: number;
      confirmed_hostnames: number;
      public_ips: number;
      service_endpoints: number;
    };
  }>;
};

function getExternalExposureSku() {
  return catalog.skus.find((candidate) => candidate.id === productId);
}

test("Public Exposure Review preserves the commercial contract", () => {
  const service = buyerServiceById("external-exposure-assessment");
  const sku = getExternalExposureSku();

  assert.ok(sku);
  assert.equal(service.productId, productId);
  assert.equal(service.name.en, "Public Exposure Review");
  assert.equal(
    service.price.en,
    "€1,900 ex VAT — fixed scope",
  );
  assert.equal(sku.price.anchor_eur_min, 1900);
  assert.equal(sku.price.anchor_eur_max, 1900);
  assert.equal(
    service.timing.en,
    "Within 3 working days after payment, accepted scope, authority, required inputs, and the collection window are confirmed",
  );

  const landing = getServiceLanding(service.id, "en");
  assert.match(landing.commercialNote ?? "", /Fixed price for the named boundary/i);
  assert.match(landing.commercialNote ?? "", /No sales call required/i);
  assert.doesNotMatch(landing.commercialNote ?? "", /first three|€2,500/i);
  assert.match(landing.deliverables.join("\n"), /one focused retest within 30 days/i);
});

test("Public Exposure Review preserves fixed caps and allowed check classes", () => {
  const sku = getExternalExposureSku();
  assert.ok(sku);
  assert.deepEqual(sku.limits, {
    root_domains: 1,
    confirmed_hostnames: 10,
    public_ips: 3,
    service_endpoints: 20,
  });

  const landing = getServiceLanding("external-exposure-assessment", "en");
  const scope = landing.scopeLimits?.join("\n") ?? "";
  assert.match(scope, /one authorised registrable root domain or one tightly bounded public application/i);
  assert.match(scope, /up to 10 confirmed first-party hostnames/i);
  assert.match(scope, /up to 3 customer-attributed public IP addresses/i);
  assert.match(scope, /up to 20 confirmed public service endpoints/i);
  assert.match(scope, /passive discovery/i);
  assert.match(scope, /allowlisted exposure checks/i);
  assert.match(scope, /unauthenticated, outside-in/i);
});

test("Public Exposure Review preserves prohibited methods and claim limits", () => {
  const english = getServiceLanding("external-exposure-assessment", "en");
  const boundaries = english.boundaries.join("\n");

  assert.match(boundaries, /not a penetration test/i);
  assert.match(boundaries, /No exploitation/i);
  assert.match(boundaries, /password testing/i);
  assert.match(boundaries, /brute force/i);
  assert.match(boundaries, /credential collection/i);
  assert.match(boundaries, /customer-data collection/i);
  assert.match(boundaries, /security attestation/i);
  assert.match(boundaries, /guarantee.*secure/i);

  const polish = POLISH_OFFERS[productId];
  assert.ok(polish);
  assert.equal(polish.price, "€1 900 bez VAT — stały zakres");
  assert.match(polish.priceDetail ?? "", /Bez rozmowy sprzedażowej/);
  assert.doesNotMatch(polish.priceDetail ?? "", /pierwsze trzy|€2 500/);
  assert.match(polish.deliverables.join("\n"), /jeden retest w ciągu 30 dni/i);
  assert.match(polish.exclusions.join("\n"), /zbierania danych klientów/i);
});
