import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  WITHDRAWN_OFFER_PATHS,
  isWithdrawnOfferPath,
  withdrawnOfferCopy,
} from "./withdrawn-offer-routes";

test("withdrawn offer paths include catalog URLs, customer security review, and Polish twins", () => {
  assert.deepEqual(WITHDRAWN_OFFER_PATHS, [
    "/catalog/offsec-local-audit",
    "/pl/catalog/offsec-local-audit",
    "/catalog/offsec-launch-ready",
    "/pl/catalog/offsec-launch-ready",
    "/catalog/offsec-custody-ops",
    "/pl/catalog/offsec-custody-ops",
    "/catalog/offsec-incident-ready",
    "/pl/catalog/offsec-incident-ready",
    "/catalog/automation-repair",
    "/pl/catalog/automation-repair",
    "/catalog/professional-public-footprint-audit",
    "/pl/catalog/professional-public-footprint-audit",
    "/customer-security-review",
    "/pl/customer-security-review",
    "/catalog/workflows",
  ]);
  assert.equal(isWithdrawnOfferPath("/catalog/offsec-local-audit/"), true);
  assert.equal(isWithdrawnOfferPath("/customer-security-review"), true);
  assert.equal(isWithdrawnOfferPath("/catalog/workflows"), true);
  assert.equal(isWithdrawnOfferPath("/catalog/professional-public-footprint-audit/"), true);
  assert.equal(isWithdrawnOfferPath("/pl/catalog/professional-public-footprint-audit"), true);
  assert.equal(isWithdrawnOfferPath("/catalog/offsec-external-exposure"), false);
});

test("the 410 copy names the withdrawal and the current review", () => {
  const english = withdrawnOfferCopy(false);
  const polish = withdrawnOfferCopy(true);
  const combined = JSON.stringify([english, polish]);

  assert.equal(english.title, "This offer has been withdrawn");
  assert.equal(polish.title, "Ta oferta została wycofana");
  assert.ok(english.links.some(([href]) => href === "/reviews/agent-action-security-review"));
  assert.equal(english.links.some(([href]) => href.includes("external-attack-surface-review")), false);
  assert.doesNotMatch(combined, /\/catalog/);
  assert.ok(english.links.some(([href]) => href === "/contact"));
  assert.ok(polish.links.some(([href]) => href === "/pl/contact"));
  assert.doesNotMatch(combined, /€|\$|Karol|Stef/i);
});

test("middleware returns the withdrawn-offer response before the page renders", () => {
  const source = readFileSync(resolve(__dirname, "../middleware.ts"), "utf8");
  assert.match(source, /isWithdrawnOfferPath\(pathname\)/);
  assert.match(source, /status: 410/);
  assert.match(source, /\/withdrawn-offer/);
  assert.match(source, /if \(!rendered\.ok\) return withdrawnFallback\(\)/);
  assert.match(source, /AbortSignal\.timeout\(8000\)/);
  assert.match(source, /cache-control": "no-store"/);
});
