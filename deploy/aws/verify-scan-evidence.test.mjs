import assert from "node:assert/strict";
import test from "node:test";

import {
  validatePublicationRun,
  validateScanEvidence,
} from "./verify-scan-evidence.mjs";

const expected = {
  publicationRunId: "12345678901",
  publicationRunAttempt: "2",
  sourceCommit: "a".repeat(40),
  imageDigest: `sha256:${"b".repeat(64)}`,
  configDigest: `sha256:${"c".repeat(64)}`,
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

function validEvidence() {
  return {
    schema_version: 1,
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
    image_digest: expected.imageDigest,
    config_digest: expected.configDigest,
    scan_status: "COMPLETE",
    critical_findings: 0,
    high_findings: 0,
    scan_policy: "basic_complete_zero_critical_high",
  };
}

test("exact successful publication run and scan evidence are accepted", () => {
  assert.equal(validatePublicationRun(validRun(), expected), true);
  assert.equal(validateScanEvidence(validEvidence(), expected), true);
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
