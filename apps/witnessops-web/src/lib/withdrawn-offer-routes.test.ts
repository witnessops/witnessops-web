import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  WITHDRAWN_OFFER_PATHS,
  isWithdrawnOfferPath,
  withdrawnOfferDocument,
} from "./withdrawn-offer-routes";

test("withdrawn offer paths are the exact catalog URLs and their Polish twins", () => {
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
  ]);
  assert.equal(isWithdrawnOfferPath("/catalog/offsec-local-audit/"), true);
  assert.equal(isWithdrawnOfferPath("/catalog/offsec-external-exposure"), false);
});

test("the 410 document names the withdrawal and the two current reviews", () => {
  const english = withdrawnOfferDocument("/catalog/automation-repair");
  const polish = withdrawnOfferDocument("/pl/catalog/offsec-launch-ready");

  assert.match(english, /This offer has been withdrawn/);
  assert.match(english, /href="\/catalog#agent-action-security-review"/);
  assert.match(english, /href="\/catalog\/offsec-external-exposure"/);
  assert.match(english, /href="\/contact"/);
  assert.match(polish, /Ta oferta została wycofana/);
  assert.match(polish, /lang="pl"/);
  assert.match(polish, /href="\/pl\/contact"/);
  assert.doesNotMatch(english + polish, /€|\$|Karol|Stef/i);
});

test("middleware returns the withdrawn-offer response before the page renders", () => {
  const source = readFileSync(resolve(__dirname, "../middleware.ts"), "utf8");
  assert.match(source, /isWithdrawnOfferPath\(pathname\)/);
  assert.match(source, /status: 410/);
});
