import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";

import {
  validateEvidenceArtifacts,
  validatePublicationRun,
  validateScanEvidence,
} from "./verify-scan-evidence.mjs";

const configDigest = `sha256:${"c".repeat(64)}`;
const manifestBytes = Buffer.from(
  JSON.stringify({ schemaVersion: 2, config: { digest: configDigest }, layers: [] }),
);
const manifestDigest = `sha256:${createHash("sha256").update(manifestBytes).digest("hex")}`;

const expected = {
  publicationRunId: "12345678901",
  publicationRunAttempt: "2",
  sourceCommit: "a".repeat(40),
  imageDigest: manifestDigest,
  configDigest,
};

function validRun() {
  return {
    id: 12345678901,
    run_attempt: 2,
    event: "workflow_dispatch",
    path: ".github/workflows/aws-release.yml@main",
    head_branch: "main",
    head_sha: expected.sourceCommit,
    status: "completed",
    conclusion: "success",
    referenced_workflows: [
      {
        path: "witnessops/witnessops-web/.github/workflows/aws-release-reusable.yml@main",
        ref: "refs/heads/main",
        sha: expected.sourceCommit,
      },
    ],
    repository: {
      id: 1200448046,
      full_name: "witnessops/witnessops-web",
      owner: { id: 272034497 },
    },
  };
}

function validScanFindingsBytes() {
  return Buffer.from(
    JSON.stringify({
      registryId: "000000000000",
      repositoryName: "witnessops-web",
      imageId: { imageDigest: expected.imageDigest, imageTag: expected.sourceCommit },
      imageScanStatus: { status: "COMPLETE" },
      imageScanFindings: { findings: [] },
    }),
  );
}

function validEvidence(scanFindingsBytes = validScanFindingsBytes()) {
  return {
    schema_version: 2,
    repository: "witnessops/witnessops-web",
    repository_id: "1200448046",
    repository_owner_id: "272034497",
    publication_run_id: expected.publicationRunId,
    publication_run_attempt: expected.publicationRunAttempt,
    operation: "publish-image",
    caller_workflow_ref:
      "witnessops/witnessops-web/.github/workflows/aws-release.yml@refs/heads/main",
    event_name: "workflow_dispatch",
    source_commit: expected.sourceCommit,
    source_tag: expected.sourceCommit,
    image_digest: expected.imageDigest,
    config_digest: expected.configDigest,
    ecr_manifest_sha256: expected.imageDigest,
    publication_mode: "pushed",
    scan_api: "ecr:DescribeImageScanFindings",
    scan_findings_sha256: `sha256:${createHash("sha256").update(scanFindingsBytes).digest("hex")}`,
    scan_status: "COMPLETE",
    total_findings: 0,
    critical_findings: 0,
    high_findings: 0,
    scan_policy: "describe_image_scan_findings_complete_zero_critical_high_v1",
  };
}

test("exact successful publication run and scan evidence are accepted", () => {
  const scanFindingsBytes = validScanFindingsBytes();
  const evidence = validEvidence(scanFindingsBytes);
  assert.equal(validatePublicationRun(validRun(), expected), true);
  assert.equal(validateScanEvidence(evidence, expected), true);
  assert.equal(
    validateEvidenceArtifacts(evidence, expected, scanFindingsBytes, manifestBytes),
    true,
  );
});

test("an artifact from a non-publication operation is rejected", () => {
  const evidence = validEvidence();
  evidence.operation = "deploy-staging";
  assert.throws(() => validateScanEvidence(evidence, expected), /operation differs/);
});

test("a different workflow path is rejected", () => {
  const run = validRun();
  run.path = ".github/workflows/alternate.yml";
  assert.throws(() => validatePublicationRun(run, expected), /workflow path differs/);
});

test("a failed scan publication run is rejected", () => {
  const run = validRun();
  run.conclusion = "failure";
  assert.throws(() => validatePublicationRun(run, expected), /did not succeed/);
});

test("a different reusable workflow SHA is rejected", () => {
  const run = validRun();
  run.referenced_workflows[0].sha = "d".repeat(40);
  assert.throws(() => validatePublicationRun(run, expected), /workflow SHA differs/);
});

test("a scan artifact for a different manifest digest is rejected", () => {
  const evidence = validEvidence();
  evidence.image_digest = `sha256:${"d".repeat(64)}`;
  assert.throws(() => validateScanEvidence(evidence, expected), /image digest differs/);
});

test("a scan artifact with high findings is rejected", () => {
  const evidence = validEvidence();
  evidence.high_findings = 1;
  assert.throws(() => validateScanEvidence(evidence, expected), /high findings/);
});

test("an artifact with an unreviewed field is rejected", () => {
  const evidence = validEvidence();
  evidence.attacker_note = "ignored";
  assert.throws(() => validateScanEvidence(evidence, expected), /field inventory/);
});

test("a tampered scan-findings artifact is rejected", () => {
  const scanFindingsBytes = validScanFindingsBytes();
  const evidence = validEvidence(scanFindingsBytes);
  const tampered = Buffer.from(scanFindingsBytes.toString("utf8").replace("COMPLETE", "FAILED"));
  assert.throws(
    () => validateEvidenceArtifacts(evidence, expected, tampered, manifestBytes),
    /artifact hash differs/,
  );
});

test("a manifest artifact with a different config digest is rejected", () => {
  const scanFindingsBytes = validScanFindingsBytes();
  const evidence = validEvidence(scanFindingsBytes);
  const wrongManifest = Buffer.from(
    JSON.stringify({ schemaVersion: 2, config: { digest: `sha256:${"d".repeat(64)}` }, layers: [] }),
  );
  const changedExpected = {
    ...expected,
    imageDigest: `sha256:${createHash("sha256").update(wrongManifest).digest("hex")}`,
  };
  const changedEvidence = {
    ...evidence,
    image_digest: changedExpected.imageDigest,
    ecr_manifest_sha256: changedExpected.imageDigest,
  };
  const changedScan = Buffer.from(
    validScanFindingsBytes()
      .toString("utf8")
      .replace(expected.imageDigest, changedExpected.imageDigest),
  );
  changedEvidence.scan_findings_sha256 = `sha256:${createHash("sha256").update(changedScan).digest("hex")}`;
  assert.throws(
    () => validateEvidenceArtifacts(changedEvidence, changedExpected, changedScan, wrongManifest),
    /config digest differs/,
  );
});
