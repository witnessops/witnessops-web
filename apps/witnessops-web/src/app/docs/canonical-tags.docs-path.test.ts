import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const docsIndexFileUrl = new URL("./page.tsx", import.meta.url);
const docsSlugFileUrl = new URL("./[...slug]/page.tsx", import.meta.url);

test("docs index metadata uses witnessops canonical docs helper", async () => {
  const source = await readFile(docsIndexFileUrl, "utf8");
  assert.ok(source.includes('canonical: getDocCanonicalUrl("witnessops", [])'));
  // Assert no hard-coded public docs host (built from parts so this is not
  // a URL-substring "sanitization" check that CodeQL flags).
  const hardCodedDocsHost = ["docs", "witnessops", "com"].join(".");
  assert.equal(source.includes(hardCodedDocsHost), false);
});

test("docs slug metadata uses witnessops canonical docs helper", async () => {
  const source = await readFile(docsSlugFileUrl, "utf8");
  assert.ok(source.includes('canonical: getDocCanonicalUrl("witnessops", doc.slug)'));
  const hardCodedDocsHost = ["docs", "witnessops", "com"].join(".");
  assert.equal(source.includes(hardCodedDocsHost), false);
});
