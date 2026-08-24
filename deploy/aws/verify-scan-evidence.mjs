#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const REPOSITORY = "witnessops/witnessops-web";
const REPOSITORY_ID = "1200448046";
const REPOSITORY_OWNER_ID = "272034497";
const CALLER_PATH = ".github/workflows/aws-release.yml";
const REUSABLE_PATH =
  "witnessops/witnessops-web/.github/workflows/aws-release-reusable.yml";
const CALLER_WORKFLOW_REF =
  "witnessops/witnessops-web/.github/workflows/aws-release.yml@refs/heads/main";
const EVENT_NAME = "workflow_dispatch";
const SCAN_POLICY = "basic_complete_zero_critical_high";

const EVIDENCE_KEYS = [
  "caller_workflow_ref",
  "config_digest",
  "critical_findings",
  "event_name",
  "high_findings",
  "image_digest",
  "operation",
  "publication_run_attempt",
  "publication_run_id",
  "repository",
  "repository_id",
  "repository_owner_id",
  "scan_policy",
  "scan_status",
  "schema_version",
  "source_commit",
].sort();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function exactKeys(value, expected, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  assert(
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify(expected),
    `${label} has an unexpected field inventory`,
  );
}

function validateExpected(expected) {
  assert(/^[1-9][0-9]{0,19}$/.test(expected.publicationRunId), "publication run ID is invalid");
  assert(
    /^[1-9][0-9]{0,5}$/.test(expected.publicationRunAttempt),
    "publication run attempt is invalid",
  );
  assert(/^[0-9a-f]{40}$/.test(expected.sourceCommit), "source commit is invalid");
  assert(/^sha256:[0-9a-f]{64}$/.test(expected.imageDigest), "image digest is invalid");
  assert(/^sha256:[0-9a-f]{64}$/.test(expected.configDigest), "config digest is invalid");
}

export function validatePublicationRun(run, expected) {
  validateExpected(expected);
  assert(String(run.id) === expected.publicationRunId, "publication run ID differs");
  assert(
    String(run.run_attempt) === expected.publicationRunAttempt,
    "publication run attempt differs",
  );
  assert(run.event === EVENT_NAME, "publication run event differs");
  assert(
    run.path === `${CALLER_PATH}@main` || run.path === `${CALLER_PATH}@refs/heads/main`,
    "publication run workflow path differs",
  );
  assert(run.head_branch === "main", "publication run branch differs");
  assert(run.head_sha === expected.sourceCommit, "publication run source commit differs");
  assert(run.status === "completed", "publication run is not complete");
  assert(run.conclusion === "success", "publication run did not succeed");
  assert(run.repository?.full_name === REPOSITORY, "publication run repository differs");
  assert(String(run.repository?.id) === REPOSITORY_ID, "publication run repository ID differs");
  assert(
    String(run.repository?.owner?.id) === REPOSITORY_OWNER_ID,
    "publication run repository owner ID differs",
  );
  assert(
    Array.isArray(run.referenced_workflows) && run.referenced_workflows.length === 1,
    "publication run reusable workflow inventory differs",
  );
  const reusable = run.referenced_workflows[0];
  assert(
    reusable.path === `${REUSABLE_PATH}@main` ||
      reusable.path === `${REUSABLE_PATH}@refs/heads/main`,
    "publication run reusable workflow path differs",
  );
  assert(reusable.ref === "refs/heads/main", "publication run reusable workflow ref differs");
  assert(reusable.sha === expected.sourceCommit, "publication run reusable workflow SHA differs");
  return true;
}

export function validateScanEvidence(evidence, expected) {
  validateExpected(expected);
  exactKeys(evidence, EVIDENCE_KEYS, "scan evidence");
  assert(evidence.schema_version === 1, "scan evidence schema differs");
  assert(evidence.repository === REPOSITORY, "scan evidence repository differs");
  assert(evidence.repository_id === REPOSITORY_ID, "scan evidence repository ID differs");
  assert(
    evidence.repository_owner_id === REPOSITORY_OWNER_ID,
    "scan evidence repository owner ID differs",
  );
  assert(
    evidence.publication_run_id === expected.publicationRunId,
    "scan evidence publication run ID differs",
  );
  assert(
    evidence.publication_run_attempt === expected.publicationRunAttempt,
    "scan evidence publication run attempt differs",
  );
  assert(evidence.caller_workflow_ref === CALLER_WORKFLOW_REF, "scan evidence caller differs");
  assert(evidence.event_name === EVENT_NAME, "scan evidence event differs");
  assert(evidence.operation === "publish-image", "scan evidence operation differs");
  assert(evidence.source_commit === expected.sourceCommit, "scan evidence source commit differs");
  assert(evidence.image_digest === expected.imageDigest, "scan evidence image digest differs");
  assert(evidence.config_digest === expected.configDigest, "scan evidence config digest differs");
  assert(evidence.scan_status === "COMPLETE", "scan evidence status differs");
  assert(evidence.critical_findings === 0, "scan evidence contains critical findings");
  assert(evidence.high_findings === 0, "scan evidence contains high findings");
  assert(evidence.scan_policy === SCAN_POLICY, "scan evidence policy differs");
  return true;
}

function parseArguments(values) {
  const names = new Set([
    "--run",
    "--evidence",
    "--publication-run-id",
    "--publication-run-attempt",
    "--source-commit",
    "--image-digest",
    "--config-digest",
  ]);
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const name = values[index];
    const value = values[index + 1];
    assert(names.has(name) && value && !result[name], `unsupported or incomplete argument ${name ?? ""}`);
    result[name] = value;
  }
  assert(Object.keys(result).length === names.size, "scan evidence arguments are incomplete");
  return result;
}

function main() {
  const args = parseArguments(process.argv.slice(2));
  const expected = {
    publicationRunId: args["--publication-run-id"],
    publicationRunAttempt: args["--publication-run-attempt"],
    sourceCommit: args["--source-commit"],
    imageDigest: args["--image-digest"],
    configDigest: args["--config-digest"],
  };
  const run = JSON.parse(readFileSync(args["--run"], "utf8"));
  const evidence = JSON.parse(readFileSync(args["--evidence"], "utf8"));
  validatePublicationRun(run, expected);
  validateScanEvidence(evidence, expected);
  process.stdout.write("AWS_PHASE3_SCAN_EVIDENCE_OK\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
