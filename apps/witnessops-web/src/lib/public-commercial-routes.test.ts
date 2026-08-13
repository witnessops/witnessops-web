import assert from "node:assert/strict";
import test from "node:test";

import {
  catalogSkuDisposition,
  isCurrentPublicCatalogSku,
} from "./public-commercial-routes";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("commercial SKU route dispositions preserve current offers and contain drift", () => {
  assert.equal(catalogSkuDisposition("OFFSEC-LOCAL-AUDIT"), "current");
  assert.equal(catalogSkuDisposition("OFFSEC-EXTERNAL-EXPOSURE"), "current");
  assert.equal(catalogSkuDisposition("SAAS-TEAM"), "private_preview");
  assert.equal(catalogSkuDisposition("WORKFLOW-S"), "replacement_available");
  assert.equal(catalogSkuDisposition("OFFSEC-PILOT"), "unresolved");
  assert.equal(catalogSkuDisposition("OFFSEC-RETAINER"), "unresolved");
  assert.equal(isCurrentPublicCatalogSku("OFFSEC-LOCAL-AUDIT"), true);
  assert.equal(isCurrentPublicCatalogSku("OFFSEC-PILOT"), false);
});

test("request pages gate query-selected commercial records to current public SKUs", () => {
  for (const path of [
    resolve(__dirname, "../app/review/request/page.tsx"),
    resolve(__dirname, "../app/pl/review/request/page.tsx"),
  ]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /isCurrentPublicCatalogSku\(requestedSku\.id\)/);
  }
});
