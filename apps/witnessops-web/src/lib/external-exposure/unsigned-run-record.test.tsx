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
  PUBLIC_EXPOSURE_REVIEW_REQUIRED_CLAIMS,
  PUBLIC_EXPOSURE_REVIEW_REQUIRED_LIMITATIONS,
} from "../../../../../packages/proof/src/receipt/public-exposure-review";
import {
  RUN_RECORD_WORDING,
  UNSIGNED_RUN_RECORD_VERSION,
  buildUnsignedRunRecord,
  checksPerformedSentence,
  collectedEvidenceSentence,
  publicCheckRunId,
  sha256Hex,
  sourceDigest,
  validateUnsignedRunRecord,
  wordingViolations,
} from "./unsigned-run-record";

const forbiddenSurfaces = [
  new URL("../../components/external-exposure/domain-check-results.tsx", import.meta.url),
  new URL("../../components/external-exposure/domain-check-results.module.css", import.meta.url),
  new URL("../../components/external-exposure/domain-check-results-print.module.css", import.meta.url),
];

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
  assert.deepEqual(record.claims_not_asserted, PUBLIC_EXPOSURE_REVIEW_REQUIRED_CLAIMS);
  assert.deepEqual(record.what_this_is_not, PUBLIC_EXPOSURE_REVIEW_REQUIRED_LIMITATIONS);
  assert.equal(record.scope_line, RUN_RECORD_WORDING.scopeLine);
  assert.equal(record.timestamp.utc, "2026-09-08T12:00:02.000Z");
  assert.equal(record.timestamp.europe_warsaw, "2026-09-08T14:00:02.000+02:00");
  assert.equal(record.overall, "partial");
  assert.equal(record.collected_evidence.count, 8);
  assert.deepEqual(record.checks_not_run, []);
  assert.equal(checksPerformedSentence(record.checks_performed, record.checks_not_run), `Checks performed: ${CHECK_IDS.join(", ")}. Not checked: none.`);

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
  assert.match(checksPerformedSentence(record.checks_performed, record.checks_not_run), /Not checked: dns\.caa\.v1\./);
});

test("wording lint covers the record, the results UI and the print document", () => {
  const snapshot = snapshotFixture();
  const record = buildUnsignedRunRecord(snapshot, "run-wording");
  const html = renderToStaticMarkup(<RunRecordDocument snapshot={snapshot} runId="run-wording" theme="dark" surface="saved" showActions />);
  const printHtml = renderToStaticMarkup(<RunRecordDocument snapshot={snapshot} runId="run-wording" theme="light" surface="public" showActions={false} />);
  const sources = [
    ...forbiddenSurfaces.map(url => readFileSync(url, "utf8")),
    JSON.stringify(RUN_RECORD_WORDING),
  ].join("\n");
  for (const sample of [JSON.stringify(record), html, printHtml, sources]) {
    assert.deepEqual(wordingViolations(sample), [], sample.slice(0, 180));
  }
  assert.match(html, /Integrity hash \(SHA-256\), not yet signed/);
  assert.match(html, /This hash lets you detect if this record changes after it was issued/);
  assert.match(html, /Keep a copy; the hash only helps if you hold the original\./);
  assert.match(html, /This lists only the checks named here\. It does not show that the domain is secure\./);
  assert.match(html, /Checks with collected evidence: 8\/10/);
  assert.match(html, /10 checked · 5 ok · 1 need attention · 0 not run/);
  assert.match(html, /Save report as PDF/);
  assert.match(html, /Download source JSON/);
  assert.match(html, /Download run record/);
  assert.equal(html.includes("✓") || html.includes("✔") || html.includes("✅"), false);
  assert.match(printHtml, /not yet signed/);
  assert.equal(wordingViolations("Your domain is secure and verified.").length > 0, true);
});
