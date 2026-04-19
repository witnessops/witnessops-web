import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const docsLayoutFileUrl = new URL("./layout.tsx", import.meta.url);
const docsNavbarFileUrl = new URL(
  "../../components/docs/docs-navbar.tsx",
  import.meta.url,
);

async function readSource(url: URL) {
  return readFile(url, "utf8");
}

test("docs layout wires docs navbar search entries", async () => {
  const source = await readSource(docsLayoutFileUrl);

  assert.ok(
    source.includes('import { DocsNavbar } from "@/components/docs/docs-navbar";'),
  );
  assert.ok(source.includes("<DocsNavbar docs={searchDocs} />"));
  assert.ok(source.includes("listDocPages(\"witnessops\")"));
});

test("docs navbar utility strip emphasizes start/search/reference/glossary", async () => {
  const source = await readSource(docsNavbarFileUrl);

  assert.ok(source.includes('label: "Start Here"'));
  assert.ok(source.includes('label: "Reference"'));
  assert.ok(source.includes('label: "Glossary"'));
  assert.ok(source.includes('aria-label="Search docs"'));
});

test("docs navbar keeps a future verify-first slot", async () => {
  const source = await readSource(docsNavbarFileUrl);

  assert.ok(source.includes("verifyFirstHref?: string;"));
  assert.ok(source.includes('label: "Verify First"'));
});
