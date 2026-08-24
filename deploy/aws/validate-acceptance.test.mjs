import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  cutoverReadinessErrors,
  readJson,
  stagingReadinessErrors,
  validateAcceptanceRecordStructure,
  validateMigrationContract,
} from "./validate-acceptance.mjs";

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const contract = readJson(path.join(THIS_DIR, "migration-contract.v1.json"));
const example = readJson(path.join(THIS_DIR, "acceptance-record.example.json"));
const digest = (character) => `sha256:${character.repeat(64)}`;
const imageRef = (character) =>
  `123456789012.dkr.ecr.eu-central-1.amazonaws.com/witnessops-web@sha256:${character.repeat(64)}`;

function makeReadyRecord() {
  const record = structuredClone(example);
  record.recorded_at = "2026-08-24T12:00:00Z";
  record.source.head = "a".repeat(40);
  record.source.tree_clean = true;
  record.source.current_host_receipt_ref = "restricted:current-host-precopy";
  record.target.aws_account_id = "123456789012";
  record.target.availability_zone = "eu-central-1a";
  record.target.instance_id = "witnessops-web-candidate-01";
  record.target.static_ipv4_observed = "192.0.2.44";
  record.target.candidate_host_receipt_ref = "restricted:aws-candidate-01";
  record.recovery_objectives = {
    rpo_minutes: 15,
    rto_minutes: 60,
    maintenance_window_minutes: 30,
    approved: true,
  };
  record.image = {
    source_head: record.source.head,
    human_readable_alias: "main-aaaaaaaa-20260824T120000Z",
    manifest_ref: imageRef("b"),
    config_digest: digest("c"),
    supply_chain_gate_result_sha256: digest("d"),
    runtime_image_ids: [digest("c"), digest("c")],
    status: "pass",
  };

  for (const state of record.state) {
    state.status = "pass";
    state.source_file_count = 4;
    state.source_bytes = 4096;
    if (state.id === "intake_store" || state.id === "intake_events") {
      state.source_manifest_sha256 = digest("e");
      state.target_manifest_sha256 = digest("e");
      state.target_file_count = state.source_file_count;
      state.target_bytes = state.source_bytes;
      state.target_empty = false;
    } else if (state.id === "mail_out") {
      state.source_manifest_sha256 = digest("f");
      state.archive_sha256 = digest("1");
      state.target_manifest_sha256 = digest("0");
      state.target_file_count = 0;
      state.target_bytes = 0;
      state.target_empty = true;
    } else {
      state.source_manifest_sha256 = digest("2");
      state.archive_sha256 = digest("3");
      state.target_manifest_sha256 = null;
      state.target_file_count = null;
      state.target_bytes = null;
      state.target_empty = null;
    }
  }

  record.trust_boundary.pre_migration_policy_digest = digest("4");
  record.trust_boundary.post_migration_policy_digest = digest("4");
  record.deployment_automation = {
    status: "pass",
    github: {
      run_id: "9876543210",
      run_attempt: 1,
      environment: "aws-staging",
      repository_id: "1200448046",
      repository_owner_id: "272034497",
      source_ref: "refs/heads/main",
      source_sha: record.source.head,
      job_workflow_ref:
        "witnessops/witnessops-web/.github/workflows/aws-release-reusable.yml@refs/heads/main",
      oidc_subject:
        "repo:witnessops@272034497/witnessops-web@1200448046:environment:aws-staging",
      oidc_audience: "sts.amazonaws.com",
    },
    aws: {
      cloudformation_staging_deployer_role_arn:
        "arn:aws:iam::123456789012:role/witnessops-staging-deployer",
      role_arn: "arn:aws:iam::123456789012:role/witnessops-staging-deployer",
      role_session_name: "github-9876543210-1",
      sts_principal_arn:
        "arn:aws:sts::123456789012:assumed-role/witnessops-staging-deployer/github-9876543210-1",
      ecr_repository_arn:
        "arn:aws:ecr:eu-central-1:123456789012:repository/witnessops-web",
      ecr_image_digest: digest("b"),
      ecr_scanning_configuration_sha256: digest("8"),
      ecr_scan_status: "COMPLETE",
      ecr_scan_findings_sha256: digest("9"),
      ecr_scan_policy_ref: "restricted:ecr-scan-policy-v1",
      ecr_scan_policy_result: "pass",
      ssm_managed_node_id: `mi-${"c".repeat(17)}`,
      ssm_document_name: "witnessops-aws-deploy-staging-v1",
      ssm_document_version: "1",
      ssm_document_sha256: digest("6"),
      ssm_command_id: "123e4567-e89b-42d3-a456-426614174000",
      ssm_command_status: "Success",
      cloudwatch_log_group: "/witnessops/witnessops-aws/deploy",
    },
    runtime: {
      adapter_sha256: digest("7"),
      requested_image_ref: record.image.manifest_ref,
      observed_prod_image_ref: record.image.manifest_ref,
      observed_mesh_image_ref: record.image.manifest_ref,
      observed_prod_runtime_image_id: record.image.config_digest,
      observed_mesh_runtime_image_id: digest("c"),
      adapter_result: "pass",
    },
  };
  for (const check of record.checks) {
    check.status = "pass";
    check.evidence_ref = `restricted:${check.id}`;
  }
  record.observability = {
    ready: true,
    notification_contact_verified: true,
    alarm_fired_and_recovered: true,
    log_retention_and_redaction_recorded: true,
    owner: "operator-on-call",
  };
  record.rollback = {
    ready: true,
    old_host_retained: true,
    known_good_image_ref: imageRef("5"),
    state_reverse_sync_plan_recorded: true,
  };
  return record;
}

test("migration contract preserves the bounded Lightsail and signing boundary", () => {
  assert.equal(validateMigrationContract(contract), true);
});

test("checked-in acceptance record is a valid non-authorizing template", () => {
  assert.equal(validateAcceptanceRecordStructure(contract, example), true);
  assert.ok(stagingReadinessErrors(contract, example).length > 0);
  assert.equal(example.cutover.authorized, false);
  assert.equal(example.cutover.dns_changed, false);
});

test("complete synthetic evidence passes staging readiness without authorizing cutover", () => {
  const record = makeReadyRecord();
  assert.deepEqual(stagingReadinessErrors(contract, record), []);
  assert.ok(cutoverReadinessErrors(contract, record).includes("cutover is not separately authorized"));
});

test("cutover readiness requires a separate approval reference", () => {
  const record = makeReadyRecord();
  record.cutover.authorized = true;
  record.cutover.approval_reference = "restricted:change-approval-001";
  record.cutover.decision = "ready";
  assert.deepEqual(cutoverReadinessErrors(contract, record), []);
});

test("production key activation or registry changes fail closed", () => {
  const activated = makeReadyRecord();
  activated.trust_boundary.production_key_activation_performed = true;
  assert.throws(
    () => validateAcceptanceRecordStructure(contract, activated),
    /production key activation/,
  );

  const widenedContract = structuredClone(contract);
  widenedContract.secrets_and_signing.production_receipt_signing.allowed_public_key_ids_in_this_contract = [
    "production_key_001",
  ];
  assert.throws(() => validateMigrationContract(widenedContract), /must not authorize production receipt keys/);

  const privateKeyOnCandidate = makeReadyRecord();
  privateKeyOnCandidate.trust_boundary.production_signing_private_key_present_on_candidate = true;
  assert.throws(
    () => validateAcceptanceRecordStructure(contract, privateKeyOnCandidate),
    /private key is present/,
  );

  const changedTrust = makeReadyRecord();
  changedTrust.trust_boundary.post_migration_policy_digest = digest("9");
  assert.ok(
    stagingReadinessErrors(contract, changedTrust).includes(
      "production signer trust changed during AWS migration",
    ),
  );
});

test("migration and acceptance records reject credential-shaped JSON keys", () => {
  for (const key of ["awsSecretAccessKey", "AWSSecretAccessKey", "AWSSessionToken"]) {
    const changedContract = structuredClone(contract);
    changedContract.test_only = {
      [key]: "test-placeholder-not-a-secret",
    };
    assert.throws(
      () => validateMigrationContract(changedContract),
      /migration contract contains credential material/,
    );
  }

  for (const key of ["aws-secret-access-key", "AWSAccessKeyId", "aws_session_token"]) {
    const changedRecord = structuredClone(example);
    changedRecord.test_only = {
      [key]: "test-placeholder-not-a-secret",
    };
    assert.throws(
      () => validateAcceptanceRecordStructure(contract, changedRecord),
      /acceptance record contains credential material/,
    );
  }

  const colonDelimited = structuredClone(example);
  colonDelimited.test_only = "AWS_SECRET_ACCESS_KEY: test-placeholder-not-a-secret";
  assert.throws(
    () => validateAcceptanceRecordStructure(contract, colonDelimited),
    /acceptance record contains credential material/,
  );
});

test("mutable images and state-manifest differences block staging", () => {
  const mutable = makeReadyRecord();
  mutable.image.manifest_ref = "docker.io/library/witnessops-web:latest";
  assert.ok(stagingReadinessErrors(contract, mutable).includes("image reference is not digest-qualified"));

  const mismatched = makeReadyRecord();
  mismatched.state.find((item) => item.id === "intake_store").target_manifest_sha256 = digest("9");
  assert.ok(
    stagingReadinessErrors(contract, mismatched).includes(
      "intake_store source and target manifests differ",
    ),
  );

  const wrongTargetAccount = makeReadyRecord();
  wrongTargetAccount.target.aws_account_id = "999999999999";
  assert.ok(
    stagingReadinessErrors(contract, wrongTargetAccount).includes(
      "CloudFormation role, IAM role, STS principal, ECR repository, image reference, and target use different AWS accounts",
    ),
  );

  const staleRuntime = makeReadyRecord();
  staleRuntime.deployment_automation.runtime.observed_prod_runtime_image_id = digest("9");
  assert.ok(
    stagingReadinessErrors(contract, staleRuntime).includes(
      "prod runtime image id differs from the manifest-bound config digest",
    ),
  );

  const contradictoryImageEvidence = makeReadyRecord();
  contradictoryImageEvidence.image.runtime_image_ids[0] = digest("9");
  assert.ok(
    stagingReadinessErrors(contract, contradictoryImageEvidence).includes(
      "prod and mesh runtime image ids are incomplete",
    ),
  );
});

test("candidate helper is pre-DNS and contains no infrastructure mutation commands", () => {
  const script = readFileSync(path.join(THIS_DIR, "candidate-acceptance.sh"), "utf8");
  assert.doesNotMatch(script, /curl[^\n]*https:\/\/(?:www\.)?witnessops\.com/);
  assert.doesNotMatch(script, /\bPROD_URL\b/);
  assert.doesNotMatch(script, /\bsmoke_pair\b/);
  assert.doesNotMatch(script, /\baws\s+(?:lightsail|route53|ec2|ssm|secretsmanager)\b/);
  assert.doesNotMatch(script, /kubectl\s+(?:apply|create|delete|patch|replace|scale|set)\b/);
  assert.doesNotMatch(script, /caddy\s+reload|systemctl\s+(?:restart|reload)/);
  assert.match(script, /http:\/\/127\.0\.0\.1:3000\/api\/verify/);
  assert.match(script, /candidate admin OIDC Secret key names/);
  assert.match(script, /prod explicit environment/);
  assert.match(script, /308\|https:\/\/witnessops\.com\/docs\/aws-migration-doc-check/);
  assert.match(script, /CANDIDATE_ACCEPTANCE_OK/);
});
