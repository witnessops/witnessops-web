import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { listDocPages, resolveWitnessOpsDocsRoot } from "./docs";

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

test("legacy intro and verify aliases resolve", async () => {
  const { getLegacyDocRedirectSlug } = await import("./docs");
  assert.deepEqual(getLegacyDocRedirectSlug("witnessops", ["intro"]), [
    "getting-started",
  ]);
  assert.deepEqual(getLegacyDocRedirectSlug("witnessops", ["verify"]), [
    "how-it-works",
    "verification",
  ]);
});
