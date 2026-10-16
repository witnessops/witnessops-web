import "../../../../../tests/proofpack/register-report-css.mjs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { canonicalSource } from "../../../../witnessops-app/src/lib/source-digest";
import { RunRecordDocument } from "../../components/external-exposure/domain-check-results";
import { cleanSnapshotFixture, snapshotFixture } from "../../../../../tests/external-exposure/fixture";
import { CHECK_IDS } from "./contracts";
import {
  CLAIMS_NOT_ASSERTED,
  RUN_RECORD_WORDING,
  UNSIGNED_RUN_RECORD_VERSION,
  WHAT_THIS_IS_NOT,
  buildUnsignedRunRecord,
  checksPerformedSentence,
  collectedEvidenceSentence,
  publicCheckRunId,
  resultSentence,
  sha256Hex,
  sourceDigest,
  validateUnsignedRunRecord,
  wordingViolations,
} from "./unsigned-run-record";

const forbiddenSurfaces = [
  new URL("./unsigned-run-record.ts", import.meta.url),
  new URL("../../components/external-exposure/domain-check-results.tsx", import.meta.url),
  new URL("../../components/external-exposure/domain-check-results.module.css", import.meta.url),
  new URL("../../components/external-exposure/domain-check-results-print.module.css", import.meta.url),
  new URL("../../components/external-exposure/external-exposure-workspace.tsx", import.meta.url),
  new URL("../../../../witnessops-app/src/components/product-app.tsx", import.meta.url),
];

function surfaceText(url: URL): string {
  let text = readFileSync(url, "utf8");
  if (url.pathname.endsWith("unsigned-run-record.ts")) {
    // Checker lists name the words they reject. Schema field access is not operator copy.
    text = text.replace(/const ALLOWED_WORDING = \[[\s\S]*?\n\];\n/, "");
    text = text.replace(/const FORBIDDEN_WORDING:[\s\S]*?\n\];\n/, "");
    text = text.replace(/\.signed\b/g, " ");
  }
  return text;
}

test("unsigned run record schema accepts the canonical record and rejects a signature", () => {
  const snapshot = snapshotFixture();
  const record = buildUnsignedRunRecord(snapshot, "run-fixture");
  assert.equal(validateUnsignedRunRecord(record).valid, true);
  assert.equal(record.version, UNSIGNED_RUN_RECORD_VERSION);
  assert.equal(record.version, "witnessops.run-record.unsigned.v0");
  assert.notEqual(record.version, "witnessops.receipt.v0");
  assert.equal(record.workflow_class, "external_exposure_snapshot");
  assert.equal(record.integrity.algorithm, "sha256");
  assert.equal(record.integrity.signed, false);
  assert.equal(record.integrity.digest, sourceDigest(snapshot));
  assert.equal(record.integrity.covers, "source_json");
  assert.equal(record.integrity.canonicalization, "witnessops-canonical-json-v1");
  assert.deepEqual(record.claims_not_asserted, CLAIMS_NOT_ASSERTED);
  assert.deepEqual(record.what_this_is_not, WHAT_THIS_IS_NOT);
  assert.equal("scope_line" in record, false);
  assert.equal(record.timestamp.utc, "2026-09-08T12:00:02.000Z");
  assert.equal(record.timestamp.europe_warsaw, "2026-09-08T14:00:02.000+02:00");
  assert.equal(record.overall, "partial");
  assert.equal(record.collected_evidence.count, 8);
  assert.deepEqual(record.checks_not_run, []);
  assert.deepEqual(record.collection_errors, ["web.hsts.v1"]);
  assert.equal(record.checks_performed.includes("web.hsts.v1"), false);
  assert.equal(checksPerformedSentence(record.checks_performed, record.checks_not_run, record.collection_errors), `Checks performed: ${CHECK_IDS.filter(id => id !== "web.hsts.v1").join(", ")}. Not checked: none. Collection error: web.hsts.v1.`);
  assert.equal(resultSentence(record), `Result: partial for the checks listed, at 2026-09-08T12:00:02.000Z (2026-09-08T14:00:02.000+02:00 Europe/Warsaw), against example.com as observed by WitnessOps from ${record.vantage.description}`);
  assert.equal(JSON.stringify(record).includes("not_applicable"), false);
  assert.equal(JSON.stringify(record).includes("not_proof_of_"), false);

  const signed = { ...record, integrity: { ...record.integrity, signed: true } };
  assert.equal(validateUnsignedRunRecord(signed).valid, false);
  const placeholder = { ...record, integrity: { ...record.integrity, digest: "f".repeat(64) } };
  assert.equal(validateUnsignedRunRecord(placeholder).valid, false);
  const withSignature = { ...record, signature: "f".repeat(128) };
  assert.equal(validateUnsignedRunRecord(withSignature).valid, false);
  assert.match(validateUnsignedRunRecord(withSignature).errors.join(" "), /signature/);
});

test("source digest is reproducible and ignores object key order", () => {
  const snapshot = cleanSnapshotFixture();
  const canonical = canonicalSource(snapshot);
  assert.equal(sha256Hex(canonical), createHash("sha256").update(canonical, "utf8").digest("hex"));
  assert.equal(sourceDigest(snapshot), createHash("sha256").update(canonical, "utf8").digest("hex"));
  const reordered = JSON.parse(canonical) as typeof snapshot;
  const shuffled = { network: reordered.network, checks: reordered.checks, target: reordered.target, version: reordered.version, finished_at: reordered.finished_at, started_at: reordered.started_at, usage: reordered.usage };
  assert.equal(canonicalSource(shuffled), canonical);
  assert.equal(sourceDigest(shuffled), sourceDigest(snapshot));
  const changed = structuredClone(snapshot);
  changed.checks[0].observation = { fixture: true, value: 99 };
  assert.notEqual(sourceDigest(changed), sourceDigest(snapshot));
  const record = buildUnsignedRunRecord(snapshot, publicCheckRunId(snapshot));
  assert.equal(record.overall, "pass");
  assert.equal(record.integrity.digest, sourceDigest(snapshot));
  assert.equal(collectedEvidenceSentence(record.collected_evidence.count), "Checks with collected evidence: 10/10");
});

test("a check absent from the snapshot is not run, which is distinct from undetermined", () => {
  const snapshot = snapshotFixture();
  snapshot.checks = snapshot.checks.filter(check => check.check_id !== "dns.caa.v1");
  const record = buildUnsignedRunRecord(snapshot, "run-gap");
  assert.deepEqual(record.checks_not_run, ["dns.caa.v1"]);
  assert.equal(record.checks_performed.includes("dns.caa.v1"), false);
  assert.equal(record.results.some(result => result.status === "UNDETERMINED" && result.check_id === "web.https_redirect.v1"), true);
  assert.match(checksPerformedSentence(record.checks_performed, record.checks_not_run, record.collection_errors), /Not checked: dns\.caa\.v1\. Collection error: web\.hsts\.v1\./);
  assert.equal(record.checks_not_run.includes("web.hsts.v1"), false);
});

test("a collection error is not a performed check and is not labeled not applicable", () => {
  const record = buildUnsignedRunRecord(snapshotFixture(), "run-error");
  assert.deepEqual(record.collection_errors, ["web.hsts.v1"]);
  assert.equal(record.checks_performed.includes("web.hsts.v1"), false);
  assert.equal(record.checks_not_run.includes("web.hsts.v1"), false);
  assert.equal(record.results.some(result => result.check_id === "web.hsts.v1" && result.status === "CHECK_ERROR"), true);
  assert.match(checksPerformedSentence(record.checks_performed, record.checks_not_run, record.collection_errors), /Collection error: web\.hsts\.v1\./);
  assert.equal(JSON.stringify(record).includes("not_applicable"), false);
  assert.equal(record.checks_performed.length, 9);
  const one = renderToStaticMarkup(<RunRecordDocument snapshot={snapshotFixture()} runId="run-one-error" theme="dark" surface="saved" />);
  assert.match(one, /9 checks run · 5 observed as expected · 1 needs attention · 0 not run · 1 collection error(?!s)/);
  const many = snapshotFixture();
  const caa = many.checks.find(check => check.check_id === "dns.caa.v1");
  assert.ok(caa);
  caa.status = "CHECK_ERROR";
  caa.collected = false;
  const plural = renderToStaticMarkup(<RunRecordDocument snapshot={many} runId="run-two-errors" theme="dark" surface="saved" />);
  assert.match(plural, /8 checks run · 5 observed as expected · 1 needs attention · 0 not run · 2 collection errors/);
});

test("canonical json v1 is recomputable and is not RFC 8785 lone-surrogate rejection", () => {
  assert.equal(canonicalSource({ b: 1, a: 2 }), '{"a":2,"b":1}');
  assert.equal(canonicalSource({ "é": 1, e: 2 }), '{"e":2,"é":1}');
  assert.equal(canonicalSource({ n: -0, whole: 1.0, big: 1e21 }), '{"big":1e+21,"n":0,"whole":1}');
  const surrogate = "\uD800";
  assert.equal(canonicalSource({ s: surrogate }), '{"s":"\\ud800"}');
  assert.equal(sourceDigest({ s: surrogate }), sha256Hex('{"s":"\\ud800"}'));
  assert.throws(() => canonicalSource({ n: Number.POSITIVE_INFINITY }), /Source must contain only JSON values/);
  assert.throws(() => canonicalSource({ n: Number.NaN }), /Source must contain only JSON values/);
});

test("canonical bytes and SHA-256 are pinned for a non-ASCII string and a control character", () => {
  const cafe = canonicalSource({ label: "café" });
  assert.equal(cafe, '{"label":"café"}');
  assert.equal(cafe.endsWith("\n"), false);
  const cafeBytes = new TextEncoder().encode(cafe);
  assert.equal(cafeBytes[0], 0x7b);
  assert.equal(sha256Hex(cafe), "2d7fba14f0a7cffed454bc268d791c0f32d11f62946998a323087ccf5df29075");
  assert.equal(createHash("sha256").update(cafeBytes).digest("hex"), "2d7fba14f0a7cffed454bc268d791c0f32d11f62946998a323087ccf5df29075");
  const control = canonicalSource({ note: "a\u0001b" });
  assert.equal(control, '{"note":"a\\u0001b"}');
  assert.equal(control.endsWith("\n"), false);
  const controlBytes = new TextEncoder().encode(control);
  assert.equal(controlBytes[0], 0x7b);
  assert.equal(sha256Hex(control), "d6acd35d4956c944a6dbf34db76a5d67c19dc4143a4196b51ea09790412a5b16");
  assert.equal(createHash("sha256").update(controlBytes).digest("hex"), "d6acd35d4956c944a6dbf34db76a5d67c19dc4143a4196b51ea09790412a5b16");
});

test("vantage names a recorded egress region and otherwise says it was not recorded", () => {
  const plain = buildUnsignedRunRecord(snapshotFixture(), "run-vantage");
  assert.match(plain.vantage.description, /Egress region: not recorded\./);
  const regionOnly = snapshotFixture();
  Object.assign(regionOnly.network[0], { region: "eu-central-1" });
  assert.match(buildUnsignedRunRecord(regionOnly, "run-region-only").vantage.description, /Egress region: not recorded\./);
  const snapshot = snapshotFixture();
  Object.assign(snapshot.network[0], { egress_region: "eu-central-1" });
  const recorded = buildUnsignedRunRecord(snapshot, "run-region");
  assert.match(recorded.vantage.description, /Egress region: eu-central-1\./);
  assert.equal(validateUnsignedRunRecord(recorded).valid, true);
  const bare = { ...plain, vantage: { kind: "external" as const, description: plain.vantage.description.replace(" Egress region: not recorded.", "") } };
  assert.equal(validateUnsignedRunRecord(bare).valid, false);
});

test("wording lint covers the record, the results UI and the print document", () => {
  const snapshot = snapshotFixture();
  const record = buildUnsignedRunRecord(snapshot, "run-wording");
  const html = renderToStaticMarkup(<RunRecordDocument snapshot={snapshot} runId="run-wording" theme="dark" surface="saved" showActions />);
  const printHtml = renderToStaticMarkup(<RunRecordDocument snapshot={snapshot} runId="run-wording" theme="light" surface="public" showActions={false} />);
  const sources = [
    ...forbiddenSurfaces.map(surfaceText),
    JSON.stringify(RUN_RECORD_WORDING),
  ].join("\n");
  for (const sample of [JSON.stringify(record), html, printHtml, sources]) {
    assert.deepEqual(wordingViolations(sample), [], sample.slice(0, 180));
  }
  assert.match(html, /Run record — integrity hash \(SHA-256\), not yet signed\./);
  assert.match(html, /This hash lets you detect if the source data \(Download source JSON\) changes after it was issued\. It does not cover the other fields of this run record, it does not show who issued it, and it is not independent verification\./);
  assert.match(html, /Keep a copy; the hash only helps if you hold the original\./);
  assert.doesNotMatch(html, /This lists only the checks named here/);
  assert.match(html, /Checks with collected evidence: 8\/10/);
  assert.match(html, /9 checks run · 5 observed as expected · 1 needs attention · 0 not run · 1 collection error(?!s)/);
  assert.match(html, /Collection error: web\.hsts\.v1\./);
  assert.match(html, /Result: partial for the checks listed, at 2026-09-08T12:00:02\.000Z \(2026-09-08T14:00:02\.000\+02:00 Europe\/Warsaw\), against example\.com as observed by WitnessOps from /);
  assert.doesNotMatch(html, /Derived from the integrity hash/);
  assert.match(printHtml, /Derived from the integrity hash\. WitnessOps does not keep free checks\./);
  assert.match(html, /Save report as PDF/);
  assert.match(html, /Download source JSON/);
  assert.match(html, /Download run record/);
  assert.equal(html.includes("✓") || html.includes("✔") || html.includes("✅"), false);
  assert.match(printHtml, /not yet signed/);
  assert.deepEqual(wordingViolations("No issues"), ["no issues"]);
  assert.deepEqual(wordingViolations("no issues found by the listed checks"), []);
  assert.equal(wordingViolations("Your domain is secure and verified.").length > 0, true);
});
