import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";

import {
  validateEvidenceArtifacts,
  validatePublicationRun,
  validateScanEvidence,
} from "./verify-scan-evidence.mjs";

function validTrivyBytes() {
 return Buffer.from(JSON.stringify({SchemaVersion:2,ArtifactType:"container_image",Metadata:{ImageID:configDigest,ImageConfig:{architecture:"amd64",os:"linux"}},Results:[{Class:"os-pkgs",Type:"alpine"},{Class:"lang-pkgs",Type:"node-pkg"}]}));
}
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
    path: ".github/workflows/aws-release.yml",
    head_branch: "main",
    head_sha: expected.sourceCommit,
    status: "completed",
    conclusion: "success",
    referenced_workflows: [
      {
        path: `witnessops/witnessops-web/.github/workflows/aws-release-reusable.yml@${expected.sourceCommit}`,
        ref: "refs/heads/main",
        sha: expected.sourceCommit,
      },
      supplyChainWorkflow(),
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
      imageScanFindings: {
        findings: [],
        findingSeverityCounts: {},
        imageScanCompletedAt: "2026-08-24T19:00:00Z",
      },
    }),
  );
}

function validEvidence(scanFindingsBytes = validScanFindingsBytes()) {
  return {
    schema_version: 3,
    trivy_findings_sha256: `sha256:${createHash("sha256").update(validTrivyBytes()).digest("hex")}`,
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
    scan_mode: "basic",
    scan_findings_sha256: `sha256:${createHash("sha256").update(scanFindingsBytes).digest("hex")}`,
    scan_status: "COMPLETE",
    total_findings: 0,
    critical_findings: 0,
    high_findings: 0,
    scan_policy: "describe_image_scan_findings_mode_aware_zero_critical_high_v1",
  };
}

test("exact successful publication run and scan evidence are accepted", () => {
  const scanFindingsBytes = validScanFindingsBytes();
  const evidence = validEvidence(scanFindingsBytes);
  assert.equal(validatePublicationRun(validRun(), expected), true);
  assert.equal(validateScanEvidence(evidence, expected), true);
  assert.equal(
    validateEvidenceArtifacts(evidence, expected, scanFindingsBytes, manifestBytes, validTrivyBytes()),
    true,
  );
});

test("historical ref-decorated workflow path spellings remain accepted", () => {
  const run = validRun();
  run.path = ".github/workflows/aws-release.yml@refs/heads/main";
  run.referenced_workflows[0].path =
    "witnessops/witnessops-web/.github/workflows/aws-release-reusable.yml@main";
  assert.equal(validatePublicationRun(run, expected), true);
});

function supplyChainWorkflow() {
  return {
    path: `witnessops/witnessops-web/.github/workflows/supply-chain-gate.yml@${expected.sourceCommit}`,
    ref: "refs/heads/main",
    sha: expected.sourceCommit,
  };
}

test("publication with the exact nested supply-chain gate is accepted in either order", () => {
  const run = validRun();
  assert.equal(validatePublicationRun(run, expected), true);
  run.referenced_workflows.reverse();
  assert.equal(validatePublicationRun(run, expected), true);
});

test("nested workflow inventory remains closed and bound to the publication commit", () => {
  const good = validRun().referenced_workflows;
  for (const inventory of [
    [],
    [good[0]],
    [good[1]],
    [good[0], good[0]],
    [...good, good[1]],
    [good[0], { ...good[1], path: "other/repo/.github/workflows/supply-chain-gate.yml@main" }],
    [good[0], { ...good[1], path: "witnessops/witnessops-web/.github/workflows/unknown.yml@main" }],
    [good[0], { ...good[1], path: `witnessops/witnessops-web/.github/workflows/supply-chain-gate.yml@${"d".repeat(40)}` }],
    [good[0], { ...good[1], sha: "d".repeat(40) }],
    [good[0], { ...good[1], ref: "refs/heads/other" }],
    [good[0], null],
  ]) {
    assert.throws(() => validatePublicationRun({ ...validRun(), referenced_workflows: inventory }, expected));
  }
});

test("exact enhanced scan evidence is accepted", () => {
  const scanFindingsBytes = Buffer.from(
    JSON.stringify({
      registryId: "000000000000",
      repositoryName: "witnessops-web",
      imageId: { imageDigest: expected.imageDigest, imageTag: expected.sourceCommit },
      imageScanStatus: { status: "ACTIVE" },
      imageScanFindings: {
        enhancedFindings: [],
        findingSeverityCounts: {},
        imageScanCompletedAt: "2026-08-24T19:00:00Z",
      },
    }),
  );
  const evidence = {
    ...validEvidence(scanFindingsBytes),
    scan_mode: "enhanced",
    scan_status: "ACTIVE",
  };
  assert.equal(validateScanEvidence(evidence, expected), true);
  assert.equal(
    validateEvidenceArtifacts(evidence, expected, scanFindingsBytes, manifestBytes, validTrivyBytes()),
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

test("a reusable workflow path bound to a different commit is rejected", () => {
  const run = validRun();
  run.referenced_workflows[0].path =
    `witnessops/witnessops-web/.github/workflows/aws-release-reusable.yml@${"d".repeat(40)}`;
  assert.throws(
    () => validatePublicationRun(run, expected),
    /reusable workflow path differs/,
  );
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
    () => validateEvidenceArtifacts(evidence, expected, tampered, manifestBytes, validTrivyBytes()),
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
    () => validateEvidenceArtifacts(changedEvidence, changedExpected, changedScan, wrongManifest, validTrivyBytes()),
    /config digest differs/,
  );
});

 test("deployment rejects missing or swapped independent scan", () => {
   const evidence=validEvidence();
   assert.throws(()=>validateEvidenceArtifacts(evidence,expected,validScanFindingsBytes(),manifestBytes),/Trivy/);
   assert.throws(()=>validateEvidenceArtifacts(evidence,expected,validScanFindingsBytes(),manifestBytes,Buffer.from("{}")),/Trivy/);
 });
 test("legacy ECR-only evidence cannot authorize a new deployment",()=>{
   const evidence=validEvidence();evidence.schema_version=2;assert.throws(()=>validateScanEvidence(evidence,expected),/schema/);
 });


test("only the exact historical rollback publication may omit the supply-chain gate", () => {
  const historical = {
    publicationRunId: "34687143425", publicationRunAttempt: "1",
    sourceCommit: "07b46159e533a4135bd27c848b7a35d72f24da61",
    imageDigest: "sha256:edca9acf0ea74fc5bc636575a88d52892b3a6babeeee59d92f4f39ecf45ad080",
    configDigest: "sha256:106e108e8486397745cbfc1395f6913acb8d82c313ac525e62bb24a3ec81f472",
  };
  function rollbackRun(identity) {
    return { ...validRun(), id: Number(identity.publicationRunId), run_attempt: Number(identity.publicationRunAttempt), head_sha: identity.sourceCommit,
      referenced_workflows: [{ path: `witnessops/witnessops-web/.github/workflows/aws-release-reusable.yml@${identity.sourceCommit}`, ref: "refs/heads/main", sha: identity.sourceCommit }] };
  }
  assert.equal(validatePublicationRun(rollbackRun(historical), historical), true);
  for (const [key, value] of Object.entries(expected)) {
    const changed = { ...historical, [key]: value };
    assert.throws(() => validatePublicationRun(rollbackRun(changed), changed), /required supply-chain workflow missing/);
  }
});
