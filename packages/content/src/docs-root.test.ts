import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  getCanonicalDocSlug,
  getLegacyDocRedirectSlug,
  listDocPages,
  resolveWitnessOpsDocsRoot,
} from "./docs";

test("resolveWitnessOpsDocsRoot finds content regardless of typical cwds", () => {
  const root = resolveWitnessOpsDocsRoot();
  assert.ok(fs.existsSync(root), `docs root missing: ${root}`);
  assert.ok(
    fs.existsSync(path.join(root, "getting-started")),
    "expected getting-started under docs root",
  );
});

test("listDocPages returns English docs from monorepo content tree", async () => {
  const pages = await listDocPages("witnessops");
  assert.ok(pages.length >= 20, `expected many pages, got ${pages.length}`);
  assert.ok(
    pages.some((p) => p.slug.join("/") === "getting-started"),
    "missing getting-started",
  );
});

test("legacy intro and verify aliases resolve", () => {
  assert.deepEqual(getLegacyDocRedirectSlug("witnessops", ["intro"]), [
    "getting-started",
  ]);
  assert.deepEqual(getLegacyDocRedirectSlug("witnessops", ["verify"]), [
    "how-it-works",
    "verification",
  ]);
});

test("legacy Mesh Federation docs URL redirects to Security Systems", async () => {
  const meshSlug = ["security-systems", "mesh-federation-and-vmesh"];
  assert.deepEqual(getLegacyDocRedirectSlug("witnessops", meshSlug), [
    "security-systems",
  ]);
  assert.deepEqual(getCanonicalDocSlug("witnessops", meshSlug), [
    "security-systems",
  ]);

  const pages = await listDocPages("witnessops");
  assert.equal(
    pages.some((page) => page.slug.join("/") === meshSlug.join("/")),
    false,
  );

  const draftPath = path.join(
    resolveWitnessOpsDocsRoot(),
    "security-systems/mesh-federation-and-vmesh.mdx",
  );
  assert.ok(fs.existsSync(draftPath), `draft Mesh Federation page missing: ${draftPath}`);
});
