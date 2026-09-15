import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { externalExposureAdapter, validateExternalSnapshot } from "../../../witnessops-web/src/lib/external-exposure/adapter";
import { savedRunReport } from "./report-model";
import { canonicalSource } from "./source-digest";
import { RECOMMENDED_PROFILE, type Run } from "./model";

const source = validateExternalSnapshot(JSON.parse(readFileSync(new URL("../../../../tests/external-exposure/fixtures/public-witnessops-snapshot-20260910.json", import.meta.url), "utf8")));
const digest = (snapshot: Run["snapshot"]) => createHash("sha256").update(canonicalSource(snapshot), "utf8").digest("hex");
function run(id = "current", snapshot = structuredClone(source)): Run {
  return { id, assetId: "asset", createdAt: id === "previous" ? "2026-09-11T10:00:00Z" : "2026-09-11T11:00:00Z", profile: structuredClone(RECOMMENDED_PROFILE), snapshot, sourceDigest: digest(snapshot) };
}
const value = (model: ReturnType<typeof savedRunReport>, id: string) => model.provenance.find(item => item.id === id)?.value;

test("shared report extraction leaves the captured public model byte-identical", () => {
  const model = externalExposureAdapter(source);
  assert.equal(createHash("sha256").update(JSON.stringify(model)).digest("hex"), "2e66d080b721d941000f3936b5b3cd91c76a5220df190215dd6a5f2bf45117ad");
  assert.ok(!model.provenance.some(item => item.id === "saved-run"));
});

test("saved report keeps the canonical run digest and all original observations without claiming signing", () => {
  const saved = run(), before = canonicalSource(saved);
  const model = savedRunReport(saved), publicModel = externalExposureAdapter(source);
  assert.equal(model.identity.sourceDigest, saved.sourceDigest);
  assert.notEqual(model.identity.sourceDigest, publicModel.identity.sourceDigest);
  assert.equal(model.identity.reportId, "saved-run-current");
  assert.deepEqual(model.summary, publicModel.summary);
  assert.deepEqual(model.findings, publicModel.findings);
  assert.deepEqual(model.coverage, publicModel.coverage);
  assert.equal(model.coverage.length, 10);
  assert.deepEqual(model.sourceArtifacts[0].content, source);
  assert.equal(model.sourceArtifacts[0].digest, saved.sourceDigest);
  assert.match(model.provenance[0].mechanism, /UTF-16 code unit/);
  assert.match(model.verification.boundary, /unsigned/);
  assert.match(model.reproduction.trustBoundary, /No verification receipt or signed proofpack/);
  assert.equal(value(model, "saved-run"), saved.id);
  assert.equal(canonicalSource(saved), before);
  assert.ok(Object.isFrozen(model.sourceArtifacts[0].content));
});

test("persistent comparison distinguishes target changes, method changes and uncertainty", () => {
  const prior = run("previous"), current = run();
  current.snapshot.checks[4].observation = { hsts: "max-age=300" };
  current.sourceDigest = digest(current.snapshot);
  let model = savedRunReport(current, prior);
  assert.match(value(model, "environment")!, /observed state changed/);
  assert.equal(value(model, "coverage"), "The check set and method are unchanged.");
  current.profile.version = "next-method";
  model = savedRunReport(current, prior);
  assert.equal(value(model, "environment"), "No change in comparable target observations.");
  assert.match(value(model, "coverage")!, /method or version changed/);
  current.profile.version = prior.profile.version;
  current.snapshot.checks[4].status = "UNDETERMINED"; current.snapshot.checks[4].collected = false;
  current.sourceDigest = digest(current.snapshot);
  model = savedRunReport(current, prior);
  assert.equal(value(model, "environment"), "No change in comparable target observations.");
  assert.match(value(model, "uncertainty")!, /collection is not comparable/);
});

test("report comparison uses only an earlier run of the same asset and hostname", () => {
  const prior = run("previous"), current = run();
  assert.match(value(savedRunReport(current, prior), "comparison")!, /previous/);
  prior.assetId = "different";
  assert.match(value(savedRunReport(current, prior), "comparison")!, /First observation/);
  prior.assetId = current.assetId; prior.createdAt = current.createdAt;
  assert.match(value(savedRunReport(current, prior), "comparison")!, /First observation/);
});

test("later reports do not rewrite earlier reports or source and retain every check limitation", () => {
  const prior = run("previous"), first = savedRunReport(prior), before = canonicalSource(first);
  const current = run(); current.snapshot.checks[4].status = "NEEDS_ATTENTION";
  current.sourceDigest = digest(current.snapshot);
  const latest = savedRunReport(current, prior);
  assert.equal(canonicalSource(first), before);
  assert.notEqual(first.identity.reportId, latest.identity.reportId);
  for (const check of source.checks) {
    const text = JSON.stringify(first.sourceArtifacts[0].content);
    assert.ok(text.includes(check.check_id));
    for (const limit of check.limitations) assert.ok(text.includes(JSON.stringify(limit).slice(1, -1)));
  }
});

test("long evidence and collection errors survive the shared report projection", () => {
  const saved = run(), check = saved.snapshot.checks[1];
  check.status = "CHECK_ERROR"; check.collected = false; check.observation = { reason: "fixture timeout", detail: "retained evidence ".repeat(500) };
  saved.sourceDigest = digest(saved.snapshot);
  const model = savedRunReport(saved);
  assert.equal(model.summary.checks!.undetermined, 1);
  assert.ok(model.collectionGaps.some(gap => gap.id === check.check_id));
  assert.ok(!model.findings.some(finding => finding.id === check.check_id));
  assert.deepEqual(model.sourceArtifacts[0].content, saved.snapshot);
});
