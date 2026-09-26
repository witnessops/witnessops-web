import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import Page from "./page";
import { wopsCase, type CaseRecord } from "./case-contract";
import { candidateRoot, validateCase } from "./validate-case";

function withCandidate(run: (record: CaseRecord, root: string) => void) {
  const root = mkdtempSync(join(tmpdir(), "wops-0001-test-"));
  try {
    cpSync(candidateRoot(), root, { recursive: true });
    run(structuredClone(wopsCase), root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("selected public files, exact bytes, manifest and claim references agree", () => {
  validateCase(wopsCase, candidateRoot());
  assert.deepEqual(readdirSync(candidateRoot()).sort(), ["SHA256SUMS", "case-report.md", "environment.json", "handler-excerpt.txt", "process-observations.txt", "signal-excerpts.txt"]);
  for (const artifact of wopsCase.artifacts) {
    const bytes = readFileSync(join(candidateRoot(), artifact.file));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), artifact.sha256);
    assert.doesNotMatch(bytes.toString(), /\/home\/|\/Users\/|\/tmp\/|-----BEGIN .*PRIVATE KEY|\bgh[pousr]_[A-Za-z0-9]+/);
  }
});

test("missing, tampered and extra public files fail closed", () => {
  withCandidate((record, root) => {
    unlinkSync(join(root, "signal-excerpts.txt"));
    assert.throws(() => validateCase(record, root), /only selected files/);
  });
  withCandidate((record, root) => {
    const path = join(root, "signal-excerpts.txt");
    const bytes = readFileSync(path); bytes[0] ^= 1; writeFileSync(path, bytes);
    assert.throws(() => validateCase(record, root), /digest mismatch/);
  });
  withCandidate((record, root) => {
    writeFileSync(join(root, "unselected.txt"), "not selected");
    assert.throws(() => validateCase(record, root), /only selected files/);
  });
});

test("unlabelled claims, missing references, empty limits and unscoped results fail", () => {
  withCandidate((record, root) => {
    Reflect.deleteProperty(record.claims[0], "cls");
    assert.throws(() => validateCase(record, root), /evidence label required/);
  });
  withCandidate((record, root) => {
    record.claims[0].references = [];
    assert.throws(() => validateCase(record, root), /references required/);
  });
  withCandidate((record, root) => {
    record.claims[0].references[0].file = "missing.txt";
    assert.throws(() => validateCase(record, root), /missing referenced artifact/);
  });
  withCandidate((record, root) => {
    record.claims[0].references[0].end = 999999;
    assert.throws(() => validateCase(record, root), /invalid line reference/);
  });
  withCandidate((record, root) => {
    record.limits = [];
    assert.throws(() => validateCase(record, root), /limits required/);
  });
  withCandidate((record, root) => {
    record.scope = " ";
    assert.throws(() => validateCase(record, root), /result requires scope/);
  });
  withCandidate((record, root) => {
    record.boundary = "Synthetic demo";
    assert.throws(() => validateCase(record, root), /non-customer boundary/);
  });
});

test("displayed environment must match the hash-checked metadata artifact", () => {
  for (const field of wopsCase.environment) {
    withCandidate((record, root) => {
      record.environment.find((item) => item.label === field.label)!.value += "0";
      assert.throws(() => validateCase(record, root), /displayed environment must match environment.json/, field.label);
    });
  }
  withCandidate((record, root) => {
    record.environment.find((item) => item.label === "Product / package")!.value = "Unrelated product / 0.0.0";
    assert.throws(() => validateCase(record, root), /displayed environment must match environment.json/);
  });
  withCandidate((record, root) => {
    record.environment.pop();
    assert.throws(() => validateCase(record, root), /displayed environment must match environment.json/);
  });
  withCandidate((record, root) => {
    record.environment[1] = { ...record.environment[0] };
    assert.throws(() => validateCase(record, root), /displayed environment must match environment.json/);
  });
});

test("rendered case retains inference, unknowns, scope, boundaries and derived downloads", () => {
  const html = renderToStaticMarkup(<Page />);
  assert.ok(html.includes(wopsCase.boundary));
  assert.ok(html.includes(wopsCase.scope));
  assert.ok(html.includes(`${wopsCase.artifacts.length} selected downloadable files`));
  assert.equal((html.match(/ download="/g) ?? []).length, wopsCase.artifacts.length);
  assert.equal((html.match(/data-claim=/g) ?? []).length, wopsCase.claims.length);
  const mechanism = html.match(/data-claim="mechanism"[\s\S]*?<\/li><\/ul><\/li>/)?.[0];
  assert.ok(mechanism?.includes("INFERENCE"));
  assert.ok(mechanism?.includes("withheld memory map"));
  assert.ok(!mechanism?.includes("FACT_ARTIFACT"));
  assert.ok(html.includes("UNKNOWN"));
  for (const claim of wopsCase.claims) assert.ok(html.includes(claim.cls));
  assert.ok(html.includes("What this review does not say"));
  assert.ok(html.includes("cannot reconstruct the complete investigation"));
  assert.doesNotMatch(html, /Synthetic demo|Independently verified|Vendor-confirmed cause/);
});
