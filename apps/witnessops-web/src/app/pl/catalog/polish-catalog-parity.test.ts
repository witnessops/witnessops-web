import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { BUYER_SERVICES } from "@/lib/buyer-services";

const englishPage = readFileSync(
  resolve(__dirname, "../../(marketing)/catalog/page.tsx"),
  "utf-8",
);
const polishPage = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

const expectedOrder = [
  "customer-security-review-sprint",
  "bounded-workflow-review",
  "one-server-security-check",
  "external-exposure-assessment",
  "launch-readiness-check",
  "key-access-custody-review",
  "incident-readiness-review",
  "professional-public-footprint-audit",
];

test("English and Polish catalogue pages render one shared offer contract", () => {
  assert.match(englishPage, /BuyerCatalogue locale="en"/);
  assert.match(polishPage, /<BuyerCatalogue locale="pl" \/>/);
  assert.equal(BUYER_SERVICES.length, 8);
  assert.deepEqual(BUYER_SERVICES.map((service) => service.id), expectedOrder);
  assert.ok(!BUYER_SERVICES.some((service) => service.productId === "OFFSEC-PILOT"));
  assert.ok(!BUYER_SERVICES.some((service) => service.productId === "SBOM-MIN-ELEMENTS"));
});

test("every public offer has one commercial contract and localized buyer copy", () => {
  for (const service of BUYER_SERVICES) {
    assert.ok(service.commercialContract.price.length > 0);
    assert.ok(service.commercialContract.timing.length > 0);
    for (const locale of ["en", "pl"] as const) {
      assert.ok(service.name[locale].length > 0, `${service.id} ${locale} name`);
      assert.ok(service.situation[locale].length > 0, `${service.id} ${locale} situation`);
      assert.ok(service.result[locale].length > 0, `${service.id} ${locale} result`);
      assert.ok(service.price[locale].length > 0, `${service.id} ${locale} price`);
      assert.ok(service.timing[locale].length > 0, `${service.id} ${locale} timing`);
    }
  }
});

test("approved server and launch commercial promises are represented once", () => {
  const server = BUYER_SERVICES.find(
    (service) => service.id === "one-server-security-check",
  );
  const launch = BUYER_SERVICES.find(
    (service) => service.id === "launch-readiness-check",
  );

  assert.equal(server?.price.en, "€950 standard · excluding VAT");
  assert.equal(
    server?.timing.en,
    "Within two business days after the authorised collection window",
  );
  assert.equal(
    server?.price.pl,
    "Standardowo 4 100 zł (ok. €950) · bez VAT",
  );
  assert.equal(
    server?.timing.pl,
    "W ciągu dwóch dni roboczych po autoryzowanym oknie zbierania danych",
  );
  assert.equal(launch?.price.en, "€2,500–€7,500 · excluding VAT");
  assert.equal(
    launch?.price.pl,
    "11 000–32 000 zł (ok. €2 500–€7 500) · bez VAT",
  );
  assert.equal(launch?.timing.en, "Four business days after candidate collection");
  assert.equal(
    launch?.timing.pl,
    "Cztery dni robocze po zebraniu kandydata do wydania",
  );
});

test("each public offer carries a localized commercial boundary", () => {
  for (const service of BUYER_SERVICES) {
    for (const locale of ["en", "pl"] as const) {
      assert.ok(
        service.boundary[locale].length > 0,
        `${service.id} ${locale} boundary`,
      );
    }
  }
});

test("professional public footprint audit keeps its request-only bilingual contract", () => {
  const audit = BUYER_SERVICES.find(
    (service) => service.id === "professional-public-footprint-audit",
  );

  assert.equal(audit?.productId, undefined);
  assert.equal(audit?.homepageFeatured, false);
  assert.equal(audit?.pricingVisible, false);
  assert.equal(audit?.availability?.status, "available_by_request");
  assert.equal(audit?.availability?.label.en, "Available by request");
  assert.equal(audit?.availability?.label.pl, "Dostępny na zapytanie");
  assert.equal(audit?.price.en, "€4,900 · excluding VAT");
  assert.equal(audit?.price.pl, "4 900 EUR · bez VAT");
  assert.equal(audit?.timing.en, "7–10 working days");
  assert.equal(audit?.timing.pl, "7–10 dni roboczych");
  assert.equal(audit?.requestCta?.en, "Request this audit");
  assert.equal(audit?.requestCta?.pl, "Zapytaj o audyt");
});

test("catalogue details keep the primary canonical route and localized secondary routes", () => {
  const workflow = BUYER_SERVICES.find(
    (service) => service.id === "bounded-workflow-review",
  );
  assert.equal(workflow?.detailHref.en, "/catalog/workflows");
  assert.equal(workflow?.detailHref.pl, "/catalog/workflows");

  for (const service of BUYER_SERVICES.filter(
    (candidate) => candidate.id !== "bounded-workflow-review",
  )) {
    assert.ok(service.detailHref.en);
    assert.ok(service.detailHref.pl);
  }
});
