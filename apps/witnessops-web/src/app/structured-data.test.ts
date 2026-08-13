import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const home = readFileSync(resolve(__dirname, "page.tsx"), "utf8");
const polishHome = readFileSync(resolve(__dirname, "pl/page.tsx"), "utf8");
const catalogDetail = readFileSync(
  resolve(__dirname, "(marketing)/catalog/[skuId]/page.tsx"),
  "utf8",
);
const polishCatalogDetail = readFileSync(
  resolve(__dirname, "pl/catalog/[skuId]/page.tsx"),
  "utf8",
);

test("global trust metadata is emitted on the two public homepages", () => {
  for (const source of [home, polishHome]) {
    assert.match(source, /organizationJsonLd/);
    assert.match(source, /websiteJsonLd/);
  }
});

test("flagship service routes emit factual service, offer, and breadcrumb data", () => {
  for (const source of [catalogDetail, polishCatalogDetail]) {
    assert.match(source, /publicExposureServiceJsonLd/);
    assert.match(source, /publicExposureBreadcrumbJsonLd/);
    assert.match(source, /OFFSEC-EXTERNAL-EXPOSURE/);
  }
});
