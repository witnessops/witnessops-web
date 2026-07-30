import assert from "node:assert/strict";
import test from "node:test";

import {
  apexDocsRedirectLocation,
  isApexMarketingHost,
  normalizeHost,
  stripDocsPrefix,
} from "./docs-host-routing";

test("stripDocsPrefix maps apex docs paths to docs-host paths", () => {
  assert.equal(stripDocsPrefix("/docs"), "/");
  assert.equal(stripDocsPrefix("/docs/"), "/");
  assert.equal(stripDocsPrefix("/docs/getting-started"), "/getting-started");
  assert.equal(
    stripDocsPrefix("/docs/getting-started/proof-run-buyer-path"),
    "/getting-started/proof-run-buyer-path",
  );
  assert.equal(stripDocsPrefix("/library"), null);
});

test("apexDocsRedirectLocation builds docs.witnessops.com locations", () => {
  assert.equal(
    apexDocsRedirectLocation("/docs", "", "docs.witnessops.com"),
    "https://docs.witnessops.com/",
  );
  assert.equal(
    apexDocsRedirectLocation(
      "/docs/getting-started",
      "?x=1",
      "docs.witnessops.com",
    ),
    "https://docs.witnessops.com/getting-started?x=1",
  );
  assert.equal(
    apexDocsRedirectLocation(
      "/docs/getting-started/proof-run-buyer-path",
      "",
      "docs.witnessops.com",
    ),
    "https://docs.witnessops.com/getting-started/proof-run-buyer-path",
  );
  assert.equal(
    apexDocsRedirectLocation("/pl/docs", "", "docs.witnessops.com"),
    null,
  );
  assert.equal(
    apexDocsRedirectLocation("/pl/docs/getting-started", "", "docs.witnessops.com"),
    null,
  );
  assert.equal(
    apexDocsRedirectLocation("/library", "", "docs.witnessops.com"),
    null,
  );
});

test("isApexMarketingHost includes www only for the apex domain", () => {
  assert.equal(isApexMarketingHost("witnessops.com", "witnessops.com"), true);
  assert.equal(isApexMarketingHost("www.witnessops.com", "witnessops.com"), true);
  assert.equal(isApexMarketingHost("docs.witnessops.com", "witnessops.com"), false);
  assert.equal(isApexMarketingHost("evilwitnessops.com", "witnessops.com"), false);
  assert.equal(normalizeHost("WitnessOps.com:443"), "witnessops.com");
});
