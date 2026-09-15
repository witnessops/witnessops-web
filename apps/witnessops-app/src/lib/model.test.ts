import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { inspectDmarc } from "../../../witnessops-web/src/lib/external-exposure/checks";
import { CHECK_IDS, RECOMMENDED_PROFILE, STATUS_LABEL, compareRuns, type ExternalSnapshotV1, type Run } from "./model";

const captured = JSON.parse(readFileSync(new URL("../../../../tests/external-exposure/fixtures/public-witnessops-snapshot-20260910.json", import.meta.url), "utf8")) as ExternalSnapshotV1;
function run(): Run {
  const snapshot = structuredClone(captured);
  return { id: "local-run", assetId: "local-asset", createdAt: snapshot.finished_at, sourceDigest: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex"), profile: structuredClone(RECOMMENDED_PROFILE), snapshot };
}
function hsts(value: Run) { return value.snapshot.checks.find(check => check.check_id === "web.hsts.v1")!; }
function comparable(value: Run) {
  // Deterministic comparison fixture: successful collection, unchanged source observation.
  value.snapshot.checks.forEach(check => { check.status = "OBSERVED_EXPECTED"; check.collected = true; });
  return value;
}

test("UI labels retain raw source status and CHECK_ERROR never becomes a security finding", () => {
  assert.equal(STATUS_LABEL.OBSERVED_EXPECTED, "Clear");
  assert.equal(STATUS_LABEL.NEEDS_ATTENTION, "Needs attention");
  assert.equal(STATUS_LABEL.INFORMATIONAL, "Informational");
  assert.equal(STATUS_LABEL.UNDETERMINED, "Undetermined");
  assert.equal(STATUS_LABEL.CHECK_ERROR, "Undetermined");
  const value = run(), check = hsts(value);
  check.status = "CHECK_ERROR"; check.collected = false;
  assert.equal(STATUS_LABEL[check.status], "Undetermined");
  assert.equal(check.status, "CHECK_ERROR");
});

test("production DMARC monitoring semantics remain Informational and HSTS remains separate", () => {
  const interpretation = inspectDmarc([["v=DMARC1; p=none"]], [{ exchange: "mail.witnessops.com", priority: 10 }]);
  assert.equal(interpretation.status, "INFORMATIONAL");
  assert.equal(STATUS_LABEL[interpretation.status], "Informational");
  assert.ok(CHECK_IDS.includes("web.hsts.v1"));
  assert.ok(CHECK_IDS.includes("web.security_headers.v1"));
  assert.equal(RECOMMENDED_PROFILE.checkIds.length, 10);
});

test("first run and unrelated assets/targets establish a baseline instead of invented changes", () => {
  const first = run();
  assert.deepEqual(compareRuns(first), { baseline: true, environment: [], coverage: [], uncertainty: [] });
  const otherAsset = structuredClone(first); otherAsset.assetId = "different-asset";
  assert.equal(compareRuns(otherAsset, first).baseline, true);
  const otherTarget = structuredClone(first); otherTarget.snapshot.target = "different.witnessops.com";
  assert.equal(compareRuns(otherTarget, first).baseline, true);
});

test("observation changes are Environment changes even when status is unchanged", () => {
  const first = comparable(run()), next = structuredClone(first);
  hsts(next).observation = { hsts: "max-age=86400", maxAge: 86400 };
  const change = compareRuns(next, first);
  assert.equal(hsts(next).status, hsts(first).status);
  assert.deepEqual(change.environment, ["HTTP Strict Transport Security: observed state changed."]);
  assert.deepEqual(change.coverage, []);
});

test("unchanged observation with changed recorded disposition is an Environment change", () => {
  const first = comparable(run()), next = structuredClone(first);
  hsts(next).status = "NEEDS_ATTENTION";
  assert.deepEqual(compareRuns(next, first).environment, ["HTTP Strict Transport Security: observed state changed."]);
});

test("check method/version changes are Coverage and do not claim changed target state", () => {
  const first = comparable(run());
  for (const dimension of ["method", "check_version"] as const) {
    const next = structuredClone(first), check = hsts(next);
    if (dimension === "method") check.method = "A different bounded method";
    else Object.assign(check, { check_version: "future-version-fixture" });
    check.observation = { changed: true };
    const change = compareRuns(next, first);
    assert.equal(change.coverage.length, 1);
    assert.match(change.coverage[0], /method changed/);
    assert.deepEqual(change.environment, []);
  }
});

test("newly added and removed checks count only as Coverage changes", () => {
  const full = comparable(run()), previous = structuredClone(full);
  previous.snapshot.checks = previous.snapshot.checks.filter(check => check.check_id !== "web.hsts.v1");
  previous.profile.checkIds = previous.profile.checkIds.filter(id => id !== "web.hsts.v1");
  const added = compareRuns(full, previous), removed = compareRuns(previous, full);
  assert.deepEqual(added.coverage, ["HTTP Strict Transport Security: newly checked."]);
  assert.deepEqual(added.environment, []);
  assert.deepEqual(removed.coverage, ["HTTP Strict Transport Security: no longer checked."]);
  assert.deepEqual(removed.environment, []);
});

test("profile identity/version changes prevent an environmental comparison across methods", () => {
  const first = comparable(run());
  for (const field of ["id", "version"] as const) {
    const next = structuredClone(first);
    next.profile[field] = "future-method-fixture";
    hsts(next).observation = { changed: true };
    const change = compareRuns(next, first);
    assert.ok(change.coverage.some(line => line === "Recommended-check method or version changed."));
    assert.deepEqual(change.environment, []);
  }
});

test("collection timestamps, operation ledger and derived certificate countdown are not Environment changes", () => {
  const first = comparable(run()), next = structuredClone(first);
  next.id = "next-run"; next.createdAt = "2026-09-11T12:00:01.000Z";
  next.snapshot.started_at = "2026-09-11T12:00:00.000Z";
  next.snapshot.finished_at = next.createdAt;
  next.snapshot.checks.forEach(check => { check.started_at = next.snapshot.started_at; check.finished_at = next.snapshot.finished_at; });
  next.snapshot.usage.dns += 1;
  next.snapshot.network = [];
  const certificate = next.snapshot.checks.find(check => check.check_id === "tls.certificate.v1")!;
  certificate.observation = { ...(certificate.observation as Record<string, unknown>), daysRemaining: 123.456 };
  assert.deepEqual(compareRuns(next, first), { baseline: false, environment: [], coverage: [], uncertainty: [] });
});

test("actual certificate expiry change remains comparable after countdown exclusion", () => {
  const first = comparable(run()), next = structuredClone(first);
  const certificate = next.snapshot.checks.find(check => check.check_id === "tls.certificate.v1")!;
  certificate.observation = { ...(certificate.observation as Record<string, unknown>), validTo: "2027-01-01T00:00:00Z", daysRemaining: 123.456 };
  assert.deepEqual(compareRuns(next, first).environment, ["TLS certificate state: observed state changed."]);
});

test("JSON object key ordering alone is not an Environment change", () => {
  const first = comparable(run()), next = structuredClone(first);
  hsts(first).observation = { policy: "one", details: { present: true, maxAge: 12 } };
  hsts(next).observation = { details: { maxAge: 12, present: true }, policy: "one" };
  assert.deepEqual(compareRuns(next, first).environment, []);
});

test("CHECK_ERROR, UNDETERMINED and collection gaps produce uncertainty, not environment findings", () => {
  const first = comparable(run());
  for (const state of ["CHECK_ERROR", "UNDETERMINED", "not-collected"] as const) {
    const next = structuredClone(first), check = hsts(next);
    if (state === "not-collected") check.collected = false;
    else check.status = state;
    check.observation = { unavailable: true };
    for (const change of [compareRuns(next, first), compareRuns(first, next)]) {
      assert.deepEqual(change.environment, []);
      assert.deepEqual(change.uncertainty, ["HTTP Strict Transport Security: collection is not comparable."]);
    }
  }
});

test("comparison preserves both full source snapshots and their recorded provenance", () => {
  const previous = run(), current = structuredClone(previous), before = JSON.stringify({ previous, current });
  compareRuns(current, previous);
  assert.equal(JSON.stringify({ previous, current }), before);
  assert.equal(current.snapshot.checks.length, 10);
  for (const check of current.snapshot.checks) {
    assert.ok(check.method && check.check_id && check.check_version && check.interpretation);
    assert.ok(check.limitations.length && check.evidence.length);
  }
});
