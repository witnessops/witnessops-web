import assert from "node:assert/strict";
import test from "node:test";
import { loadCatalog } from "@witnessops/catalog";
import { isWithdrawnOfferPath } from "./withdrawn-offer-routes";

test("catalogue sample discovery contains only the retained agent-action examples", () => {
  const samples = loadCatalog().samples ?? [];
  assert.deepEqual(
    samples.map(({ id }) => id),
    [
      "ai-agent-action-proof-run",
      "witnessed-crm-status-change",
      "privileged-access-grant",
      "approval-gated-containment",
    ],
  );
  for (const { href } of samples) {
    assert.equal(isWithdrawnOfferPath(href), false, href);
  }
});

test("historical SKU records do not link to retired sample pages", () => {
  const catalog = loadCatalog();
  for (const sku of catalog.skus) {
    for (const href of Object.values(sku.cta)) {
      if (href?.startsWith("/review/sample-cases/")) {
        assert.equal(isWithdrawnOfferPath(href), false, `${sku.id}: ${href}`);
      }
    }
  }
  assert.ok(catalog.skus.some(({ id }) => id === "SBOM-MIN-ELEMENTS"));
  assert.equal(
    catalog.skus.find(({ id }) => id === "SBOM-MIN-ELEMENTS")?.cta.secondary,
    null,
  );
});
