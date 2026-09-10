import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("local server security review sample page declares verify boundary and workflow CTA", () => {
  const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
  const normalizedSource = source.replace(/\s+/g, " ");
  assert.match(source, /Not verified through \/api\/verify; inspect manifest and sidecars/);
  assert.match(source, /Local server security review/);
  assert.match(source, /not a live customer audit/i);
  assert.match(source, /not a production verification result/i);
  assert.match(source, /not evidence that any third-party system was tested/i);
  assert.match(normalizedSource, /included manifest and sidecars/);
  assert.match(source, /not currently verified through WitnessOps/i);
  assert.doesNotMatch(source, /wiring \(R1\)/);
  assert.doesNotMatch(source, /Structural only \([A-Z][0-9] adapter/);
  assert.doesNotMatch(source, /structural checks only/);
  assert.doesNotMatch(source, /POST[\s\S]*RECEIPT\.json[\s\S]*\/api\/verify/);
  assert.match(source, /label=\"Start a review\"/);
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

// Independently hash the published bytes; do not trust the publication manifest
// to establish that the nested integrity manifest is internally consistent.
test("Shield integrity manifest binds the current receipt and evidence bytes", async () => {
  const { createHash } = await import("node:crypto");
  const root = resolve(__dirname, "../../../../../public/samples/offsec-shield-local-server-audit");
  const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
  const lines = readFileSync(resolve(root, "MANIFEST.sha256"), "utf8").trim().split("\n");
  const entries = lines.map((line) => {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    assert.ok(match, "well-formed manifest entry");
    return { hash: match[1], file: match[2] };
  });
  assert.ok(entries.some(({ file }) => file === "RECEIPT.json"));
  for (const { hash, file } of entries) {
    const bytes = readFileSync(resolve(root, file));
    assert.equal(digest(bytes), hash, `${file} must match its independently computed digest`);
    const changed = Buffer.from(bytes);
    changed[0] ^= 1;
    assert.notEqual(digest(changed), hash, `${file}: a one-byte tamper must mismatch`);
  }
  const published = JSON.parse(readFileSync(resolve(root, "SAMPLE-MANIFEST.json"), "utf8")) as {
    entries: { file: string; sha256: string }[];
  };
  for (const { file, sha256 } of published.entries) {
    assert.equal(digest(readFileSync(resolve(root, file))), sha256, `publication binding: ${file}`);
  }
});
