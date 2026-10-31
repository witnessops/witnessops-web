import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  WITHDRAWN_OFFER_PATHS,
  WITHDRAWN_SAMPLE_PATHS,
  isPolishOfferPath,
  isWithdrawnOfferPath,
  isWithdrawnSamplePath,
  withdrawnOfferCopy,
  withdrawnSampleCopy,
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

test("retired samples return the 410 boundary for EN, PL, case variants, and trailing slashes", () => {
  const retiredSlugs = [
    "external-exposure-assessment",
    "access-removed-proof",
    "sbom-cisa-2026-minimum-elements",
    "local-server-security-review",
    "launch-readiness-review",
    "custody-wallet-ops-review",
    "incident-readiness-review",
    "customer-security-review-sprint",
  ];
  assert.deepEqual(
    WITHDRAWN_SAMPLE_PATHS,
    retiredSlugs.flatMap((slug) => [
      `/review/sample-cases/${slug}`,
      `/pl/review/sample-cases/${slug}`,
    ]),
  );
  for (const path of WITHDRAWN_SAMPLE_PATHS) {
    for (const variant of [path, `${path}/`, path.toUpperCase(), `${path.toUpperCase()}/`]) {
      assert.equal(isWithdrawnOfferPath(variant), true, variant);
      assert.equal(isWithdrawnSamplePath(variant), true, variant);
      assert.equal(isPolishOfferPath(variant), path.startsWith("/pl/"), variant);
    }
    assert.equal(isWithdrawnOfferPath(`${path}-other`), false);
  }
  assert.equal(isWithdrawnSamplePath("/catalog/offsec-local-audit"), false);
});

test("agent-action examples and their index remain outside the retirement boundary", () => {
  for (const path of [
    "/review/sample-cases",
    "/review/sample-cases/ai-agent-action-proof-run",
    "/review/sample-cases/witnessed-crm-status-change",
    "/review/sample-cases/privileged-access-grant",
    "/review/sample-cases/approval-gated-containment",
  ]) {
    assert.equal(isWithdrawnOfferPath(path), false, path);
    assert.equal(isWithdrawnOfferPath(path.toUpperCase()), false, path);
    assert.equal(isWithdrawnSamplePath(path), false, path);
  }
});

test("withdrawn OffSec routes keep the 410 boundary for case variants in both languages", () => {
  for (const slug of [
    "offsec-local-audit",
    "offsec-launch-ready",
    "offsec-custody-ops",
    "offsec-incident-ready",
  ]) {
    for (const prefix of ["/catalog", "/pl/catalog"]) {
      const canonical = `${prefix}/${slug}`;
      const uppercaseSku = `${prefix}/${slug.toUpperCase()}`;
      const uppercasePath = canonical.toUpperCase();

      assert.equal(isWithdrawnOfferPath(canonical), true, canonical);
      assert.equal(isWithdrawnOfferPath(uppercaseSku), true, uppercaseSku);
      assert.equal(isWithdrawnOfferPath(`${uppercasePath}/`), true, uppercasePath);
      assert.equal(isPolishOfferPath(uppercasePath), prefix.startsWith("/pl/"), uppercasePath);
    }
  }
  assert.equal(isWithdrawnOfferPath("/catalog/OFFSEC-EXTERNAL-EXPOSURE"), false);
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
  assert.match(source, /if \(!rendered\.ok\) return withdrawnFallback\(sample, polish\)/);
  assert.match(source, /AbortSignal\.timeout\(8000\)/);
  assert.match(source, /cache-control": "no-store"/);
});

test("sample retirement copy names a sample and links only to retained examples and the current review", () => {
  const english = withdrawnSampleCopy(false);
  const polish = withdrawnSampleCopy(true);
  assert.equal(english.title, "This sample has been retired");
  assert.equal(polish.title, "Ten przykład został wycofany");
  for (const [copy, prefix] of [[english, ""], [polish, "/pl"]] as const) {
    assert.deepEqual(copy.links.map(([href]) => href), [
      "/review/sample-cases",
      `${prefix}/reviews/agent-action-security-review`,
    ]);
    assert.doesNotMatch(JSON.stringify(copy), /This offer|Ta oferta|external-attack-surface|\/review\/request|\/samples\/|€|\$/);
  }
});
