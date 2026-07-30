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
  "launch-readiness-check",
  "key-access-custody-review",
  "incident-readiness-review",
];

test("English and Polish catalogue pages render one shared offer contract", () => {
  assert.match(englishPage, /BuyerCatalogue locale="en"/);
  assert.match(polishPage, /<BuyerCatalogue locale="pl" \/>/);
  assert.equal(BUYER_SERVICES.length, 6);
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

  assert.equal(server?.price.en, "€950 standard after a non-secret fit check");
  assert.equal(
    server?.timing.en,
    "Within two business days after the authorised collection window",
  );
  assert.equal(
    server?.price.pl,
    "Standardowo 4 100 zł po wstępnej ocenie bez informacji poufnych (ok. €950)",
  );
  assert.equal(
    server?.timing.pl,
    "W ciągu dwóch dni roboczych po autoryzowanym oknie zbierania danych",
  );
  assert.equal(launch?.price.en, "€2,500–€7,500");
  assert.equal(launch?.price.pl, "11 000–32 000 zł (ok. €2 500–€7 500)");
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

test("secondary details are exposed only for localized pages that exist", () => {
  const workflow = BUYER_SERVICES.find(
    (service) => service.id === "bounded-workflow-review",
  );
  assert.equal(workflow?.detailHref.en, "/catalog/workflows");
  assert.equal(workflow?.detailHref.pl, undefined);

  for (const service of BUYER_SERVICES.filter(
    (candidate) => candidate.id !== "bounded-workflow-review",
  )) {
    assert.ok(service.detailHref.en);
    assert.ok(service.detailHref.pl);
  }
});
