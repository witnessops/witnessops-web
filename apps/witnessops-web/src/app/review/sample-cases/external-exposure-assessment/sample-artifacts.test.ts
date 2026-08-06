import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const label = "Synthetic worked example — not customer evidence.";
const sampleDir = resolve(
  __dirname,
  "../../../../../public/samples/offsec-external-exposure",
);

const sha256 = (path: string) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

test("published External Exposure sample is complete and matches MANIFEST.sha256", () => {
  const manifest = readFileSync(resolve(sampleDir, "MANIFEST.sha256"), "utf8");
  const lines = manifest.trimEnd().split("\n");
  assert.equal(lines.shift(), `# ${label}`);

  const declared = new Map<string, string>();
  for (const line of lines) {
    const match = /^([a-f0-9]{64})  \.\/(.+)$/.exec(line);
    assert.ok(match, `malformed manifest line: ${line}`);
    const [, expectedHash, filename] = match;
    assert.ok(!declared.has(filename), `duplicate manifest path: ${filename}`);
    declared.set(filename, expectedHash);
  }

  const actualFiles = readdirSync(sampleDir)
    .filter((filename) => filename !== "MANIFEST.sha256")
    .sort();
  assert.deepEqual([...declared.keys()].sort(), actualFiles);
  for (const [filename, expectedHash] of declared) {
    assert.equal(sha256(resolve(sampleDir, filename)), expectedHash, filename);
    assert.match(readFileSync(resolve(sampleDir, filename), "utf8"), new RegExp(label));
  }
});

test("published External Exposure sample is buyer-safe and evidence-linked", () => {
  const findings = JSON.parse(readFileSync(resolve(sampleDir, "findings.json"), "utf8"));
  const evidence = JSON.parse(
    readFileSync(resolve(sampleDir, "evidence-register.json"), "utf8"),
  );
  const verifier = JSON.parse(
    readFileSync(resolve(sampleDir, "verifier-result.json"), "utf8"),
  );
  const evidenceIds = new Set(evidence.evidence.map((entry: { id: string }) => entry.id));

  assert.equal(findings.findings.length, 3);
  for (const finding of findings.findings) {
    assert.ok(finding.evidence_refs.length > 0, `${finding.id} has no evidence reference`);
    for (const reference of finding.evidence_refs) {
      assert.ok(evidenceIds.has(reference), `${finding.id} references missing ${reference}`);
    }
  }
  assert.equal(verifier.verification.result, "valid");
  assert.equal(verifier.named_verifier, "scripts/witnessops_verify_receipt.py");
  assert.match(verifier.boundary, /not system security/i);

  const combined = readdirSync(sampleDir)
    .map((filename) => readFileSync(resolve(sampleDir, filename), "utf8"))
    .join("\n");
  assert.doesNotMatch(combined, /witnessops\.com/i);
  assert.doesNotMatch(combined, /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/);
  assert.doesNotMatch(combined, /receipt\.json|witnessops-receipt\.sig/i);
});
