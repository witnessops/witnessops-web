import assert from "node:assert/strict";
import test from "node:test";

import {
  apexDocsRedirectLocation,
  docsPathsMatch,
  getPublicDocPath,
  isApexMarketingHost,
  isDocsHost,
  legacyDocsHostRedirectLocation,
  normalizeHost,
  stripDocsPrefix,
  toPublicDocsHref,
} from "./docs-host-routing";

test("stripDocsPrefix maps /docs paths for legacy tools", () => {
  assert.equal(stripDocsPrefix("/docs"), "/");
  assert.equal(stripDocsPrefix("/docs/"), "/");
  assert.equal(stripDocsPrefix("/docs/getting-started"), "/getting-started");
  assert.equal(
    stripDocsPrefix("/docs/getting-started/proof-run-buyer-path"),
    "/getting-started/proof-run-buyer-path",
  );
  assert.equal(stripDocsPrefix("/library"), null);
});

test("apex no longer redirects /docs away from the marketing host", () => {
  assert.equal(apexDocsRedirectLocation("/docs", "", "docs.witnessops.com"), null);
  assert.equal(
    apexDocsRedirectLocation("/docs/getting-started", "?x=1", "docs.witnessops.com"),
    null,
  );
  assert.equal(apexDocsRedirectLocation("/pl/docs", "", "docs.witnessops.com"), null);
});

test("legacy docs host redirects to apex /docs how-to paths", () => {
  assert.equal(
    legacyDocsHostRedirectLocation("/", "", "witnessops.com"),
    "https://witnessops.com/docs",
  );
  assert.equal(
    legacyDocsHostRedirectLocation("/getting-started", "?x=1", "witnessops.com"),
    "https://witnessops.com/docs/getting-started?x=1",
  );
  assert.equal(
    legacyDocsHostRedirectLocation(
      "/getting-started/proof-run-buyer-path",
      "",
      "witnessops.com",
    ),
    "https://witnessops.com/docs/getting-started/proof-run-buyer-path",
  );
  assert.equal(
    legacyDocsHostRedirectLocation("/docs/how-it-works", "", "witnessops.com"),
    "https://witnessops.com/docs/how-it-works",
  );
  assert.equal(
    legacyDocsHostRedirectLocation("/support", "", "witnessops.com"),
    "https://witnessops.com/support",
  );
});

test("isApexMarketingHost includes www only for the apex domain", () => {
  assert.equal(isApexMarketingHost("witnessops.com", "witnessops.com"), true);
  assert.equal(isApexMarketingHost("www.witnessops.com", "witnessops.com"), true);
  assert.equal(isApexMarketingHost("docs.witnessops.com", "witnessops.com"), false);
  assert.equal(isApexMarketingHost("evilwitnessops.com", "witnessops.com"), false);
  assert.equal(normalizeHost("WitnessOps.com:443"), "witnessops.com");
});

test("toPublicDocsHref keeps /docs prefix on all hosts", () => {
  assert.equal(
    toPublicDocsHref("/docs/getting-started", "docs.witnessops.com"),
    "/docs/getting-started",
  );
  assert.equal(toPublicDocsHref("/docs", "docs.witnessops.com"), "/docs");
  assert.equal(
    toPublicDocsHref("/docs/getting-started", "witnessops.com"),
    "/docs/getting-started",
  );
});

test("getPublicDocPath and docsPathsMatch use /docs how-to paths", () => {
  assert.equal(
    getPublicDocPath(["getting-started"], { host: "docs.witnessops.com" }),
    "/docs/getting-started",
  );
  assert.equal(
    getPublicDocPath(["getting-started"], { host: "witnessops.com" }),
    "/docs/getting-started",
  );
  assert.equal(isDocsHost("docs.witnessops.com"), true);
  assert.ok(docsPathsMatch("/docs/getting-started", "/docs/getting-started"));
  assert.ok(docsPathsMatch("/getting-started", "/docs/getting-started"));
  assert.ok(docsPathsMatch("/docs", "/"));
});
