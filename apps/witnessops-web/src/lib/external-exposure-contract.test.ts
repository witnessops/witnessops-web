import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { buyerServiceById } from "./buyer-services";
import { EXTERNAL_ATTACK_SURFACE_OFFER } from "./commercial-truth";
import { POLISH_OFFERS } from "./public-i18n";
import { getServiceLanding } from "./service-landings";

const productId = "OFFSEC-EXTERNAL-EXPOSURE";
const passiveDiscoveryQualifier =
  "It uses passive discovery where applicable, followed by explicitly approved, low-impact checks against the signed target schedule.";
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
const offerAuthority = readFileSync(
  resolve(
    __dirname,
    "../../../../docs/commercial/10-public-exposure-review-offer.md",
  ),
  "utf8",
);
const fitCheckAuthority = readFileSync(
  resolve(
    __dirname,
    "../../../../docs/commercial/11-public-exposure-review-fit-check.md",
  ),
  "utf8",
);

function getExternalExposureSku() {
  return catalog.skus.find((candidate) => candidate.id === productId);
}

test("External Attack Surface Review preserves the fixed-price commercial contract", () => {
  const service = buyerServiceById("external-exposure-assessment");
  const sku = getExternalExposureSku();

  assert.ok(sku);
  assert.equal(service.productId, productId);
  assert.equal(service.name.en, "External Attack Surface Review");
  assert.equal(service.name, EXTERNAL_ATTACK_SURFACE_OFFER.name);
  assert.equal(
    service.price.en,
    "€1,900 · excluding VAT",
  );
  assert.equal(sku.price.anchor_eur_min, 1900);
  assert.equal(sku.price.anchor_eur_max, 1900);
  assert.equal(
    service.timing.en,
    "Within 3 working days after payment in full, an accepted SOW, written authority, fixed scope, required inputs, and the approved collection window are confirmed",
  );

  const landing = getServiceLanding(service.id, "en");
  assert.match(landing.commercialNote ?? "", /€1,900 · excluding VAT/i);
  assert.match(landing.commercialNote ?? "", /one authorised public-facing system/i);
  assert.match(landing.commercialNote ?? "", /No sales call required/i);
  assert.match(landing.commercialNote ?? "", /Payment is due in full before the delivery clock starts/i);
  assert.match(landing.commercialNote ?? "", /Payment alone does not authorise testing/i);
  assert.doesNotMatch(landing.commercialNote ?? "", /first three|€2,500/i);
  assert.match(landing.deliverables.join("\n"), /one focused retest within 30 days/i);
});

test("External Attack Surface Review preserves fixed caps and allowed check classes", () => {
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
  assert.match(scope, /one authorised public-facing system/i);
  assert.match(scope, /up to 1 registrable root domain/i);
  assert.match(scope, /up to 10 first-party hostnames/i);
  assert.match(scope, /3 customer-attributed public IP addresses/i);
  assert.match(scope, /20 public service endpoints/i);
  assert.match(scope, /won’t test them without explicit authorisation/i);
  assert.match(scope, /Cloud accounts, IAM, private networks, and provider infrastructure are not reviewed/i);
  assert.match(scope, /passive discovery where applicable/i);
  assert.match(scope, /signed target schedule/i);
  assert.match(scope, /allowlisted exposure checks/i);
  assert.match(scope, /unauthenticated, outside-in/i);
});

test("External Attack Surface Review qualifies passive discovery across current authority", () => {
  const english = getServiceLanding("external-exposure-assessment", "en");
  const polish = getServiceLanding("external-exposure-assessment", "pl");
  const englishLanding = [
    ...(english.scopeLimits ?? []),
    ...english.steps.flat(),
  ].join("\n");
  const currentEnglishAuthority = [
    offerAuthority,
    fitCheckAuthority,
    englishLanding,
  ].join("\n");
  const currentPolishAuthority = [
    ...(polish.scopeLimits ?? []),
    ...polish.steps.flat(),
    ...POLISH_OFFERS[productId].process,
  ].join("\n");

  assert.ok(offerAuthority.includes(passiveDiscoveryQualifier));
  assert.ok(fitCheckAuthority.includes(passiveDiscoveryQualifier));
  assert.ok(englishLanding.includes(passiveDiscoveryQualifier));
  assert.doesNotMatch(
    currentEnglishAuthority,
    /combines passive discovery with|passive discovery plus|passive discovery and (?:pre-approved|named)|using passive discovery and explicitly approved|perform only the accepted passive and low-impact checks/i,
  );
  assert.match(currentPolishAuthority, /tam, gdzie ma (?:to|ono) zastosowanie/i);
  assert.doesNotMatch(
    currentPolishAuthority,
    /pasywne wykrywanie oraz|dopuszczone kontrole pasywne i niskiego ryzyka|wyłącznie zaakceptowane kontrole pasywne/i,
  );
});

test("External Attack Surface Review preserves prohibited methods and claim limits", () => {
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
  assert.equal(polish.price, "€1 900 · bez VAT");
  assert.match(polish.priceDetail ?? "", /Bez rozmowy sprzedażowej/);
  assert.doesNotMatch(polish.priceDetail ?? "", /pierwsze trzy|€2 500/);
  assert.match(polish.deliverables.join("\n"), /jeden retest w ciągu 30 dni/i);
  assert.match(polish.exclusions.join("\n"), /zbierania danych klientów/i);
  assert.match(polish.exclusions.join("\n"), /To nie jest test penetracyjny/i);
});
