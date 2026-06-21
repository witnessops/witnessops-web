import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("offsec shield sample page declares verify boundary and workflow CTA", () => {
  const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
  assert.match(source, /Structural only \(R2 adapter/);
  assert.match(source, /structural checks only/);
  assert.match(source, /label=\"Package one security workflow\"/);
  assert.match(source, /offsec-shield-local-server-audit/);
});

test("shield sample manifest exists after publish script", () => {
  const manifestPath = resolve(
    __dirname,
    "../../../../../public/samples/offsec-shield-local-server-audit/SAMPLE-MANIFEST.json",
  );
  const raw = readFileSync(manifestPath, "utf-8");
  const doc = JSON.parse(raw) as { schema: string; entries: unknown[] };
  assert.equal(doc.schema, "witnessops.offsec_shield_sample_manifest.v1");
  assert.ok(Array.isArray(doc.entries) && doc.entries.length >= 5);
});