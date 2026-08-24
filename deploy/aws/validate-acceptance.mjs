#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONTRACT_PATH = path.join(THIS_DIR, "migration-contract.v1.json");
const DEFAULT_RECORD_PATH = path.join(THIS_DIR, "acceptance-record.example.json");

const EXPECTED_CHECK_IDS = [
  "repository_health_node22",
  "k3s_contract_unit_tests",
  "candidate_compute_capacity",
  "candidate_edge_local",
  "candidate_runtime_identity",
  "candidate_dual_lane",
  "candidate_public_routes",
  "per_receipt_indeterminate",
  "per_malformed_invalid",
  "state_manifest_reconciliation",
  "projection_reconstruction",
  "secret_name_and_path_preflight",
  "backup_restore_rehearsal",
  "observability_alarm_test",
  "rollback_rehearsal",
];

const EXPECTED_STATE_STRATEGIES = new Map([
  ["intake_store", "copy_and_manifest_verify"],
  ["intake_events", "copy_and_manifest_verify"],
  ["mail_out", "archive_source_then_recreate_empty"],
  ["ask_receipts", "archive_only_not_remounted"],
  ["ask_audits", "archive_only_not_remounted"],
]);

const SHA256 = /^sha256:[a-f0-9]{64}$/;
const GIT_SHA = /^[a-f0-9]{40}$/;
const IPV4 = /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/;
const RFC3339_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/;
const ALLOWED_RESULT_STATUSES = new Set(["not_run", "pass", "fail", "blocked"]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactIdSet(actual, expected, label) {
  assert(Array.isArray(actual), `${label} must be an array`);
  const ids = actual.map((item) => item?.id);
  assert(ids.every((id) => typeof id === "string"), `${label} contains a missing id`);
  assert(new Set(ids).size === ids.length, `${label} contains duplicate ids`);
  assert(ids.length === expected.length, `${label} has the wrong item count`);
  for (const id of expected) {
    assert(ids.includes(id), `${label} is missing ${id}`);
  }
}

function nonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function containsSecretMaterial(value) {
  const serialized = JSON.stringify(value);
  return (
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(serialized) ||
    /AKIA[0-9A-Z]{16}/.test(serialized) ||
    /ASIA[0-9A-Z]{16}/.test(serialized)
  );
}

export function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function validateMigrationContract(contract) {
  assert(isObject(contract), "migration contract must be an object");
  assert(
    contract.contract_id === "witnessops.aws_lightsail_migration.v1",
    "unexpected migration contract id",
  );
  assert(
    contract.status === "planned_candidate_no_apply_authority",
    "AWS contract must remain planned and non-authorizing",
  );
  assert(!containsSecretMaterial(contract), "migration contract contains credential material");

  const notAuthorized = contract.authority?.not_authorized;
  assert(Array.isArray(notAuthorized), "authority.not_authorized must be an array");
  for (const boundary of [
    "aws_resource_mutation",
    "deployment",
    "dns_change",
    "production_secret_change",
    "production_receipt_signing_key_activation",
    "production_key_registry_change",
    "merge",
  ]) {
    assert(notAuthorized.includes(boundary), `contract does not forbid ${boundary}`);
  }

  const compute = contract.compute;
  assert(compute?.provider === "aws", "compute provider must be aws");
  assert(compute?.service === "lightsail", "compute service must be lightsail");
  assert(compute?.region === "eu-central-1", "AWS target must remain eu-central-1");
  assert(compute?.blueprint === "ubuntu-24.04", "AWS blueprint must remain Ubuntu 24.04");
  assert(compute?.instance_count === 1, "migration target must remain single-instance");
  assert(compute?.plan?.memory_gib === 4, "unexpected Lightsail memory plan");
  assert(compute?.plan?.vcpu === 2, "unexpected Lightsail vCPU plan");
  assert(compute?.plan?.system_disk_gib === 80, "unexpected Lightsail disk plan");
  assert(
    compute?.runtime?.orchestrator === "single-node-k3s" &&
      compute?.runtime?.production_replicas === 1,
    "migration must preserve the current single-node/single-writer runtime",
  );

  const edge = contract.edge_and_networking;
  assert(edge?.static_ipv4_required === true, "static IPv4 must be required");
  assert(edge?.ipv6_enabled === false, "IPv6 must remain disabled in this bounded phase");
  assert(edge?.caddy_upstream === "127.0.0.1:3000", "Caddy must retain loopback upstream");
  assert(
    Array.isArray(edge?.prohibited_public_ports) &&
      [3000, 3001, 6443, 10250].every((port) => edge.prohibited_public_ports.includes(port)),
    "internal application or cluster ports are not fully prohibited",
  );

  const mappings = contract.persistent_state?.mappings;
  exactIdSet(mappings, [...EXPECTED_STATE_STRATEGIES.keys()], "persistent state mappings");
  for (const mapping of mappings) {
    assert(
      mapping.strategy === EXPECTED_STATE_STRATEGIES.get(mapping.id),
      `unexpected strategy for ${mapping.id}`,
    );
  }
  const intakeStore = mappings.find((mapping) => mapping.id === "intake_store");
  for (const transientPattern of [
    "locks/*.lock*",
    "admin-core/core-state.lock*",
    "**/*.tmp",
    "**/*.tmp.*",
  ]) {
    assert(
      intakeStore?.exclude_from_copy?.includes(transientPattern),
      `intake-store copy does not exclude transient ${transientPattern}`,
    );
  }

  const signing = contract.secrets_and_signing?.production_receipt_signing;
  assert(signing?.activation_in_scope === false, "receipt signing activation entered AWS scope");
  assert(signing?.registry_change_in_scope === false, "key-registry change entered AWS scope");
  assert(
    signing?.private_key_destination === "never_web_host_never_web_pod_never_kubernetes_secret",
    "production signing private-key custody widened to the web runtime",
  );
  assert(
    Array.isArray(signing?.allowed_public_key_ids_in_this_contract) &&
      signing.allowed_public_key_ids_in_this_contract.length === 0,
    "AWS migration contract must not authorize production receipt keys",
  );
  assert(
    signing?.required_migration_change === "none",
    "AWS migration must not change production receipt signer trust",
  );

  const immutablePattern = contract.image_provenance?.immutable_reference_pattern;
  assert(typeof immutablePattern === "string", "immutable image pattern is missing");
  const immutableRegex = new RegExp(immutablePattern);
  assert(
    immutableRegex.test(`docker.io/library/witnessops-web@sha256:${"a".repeat(64)}`),
    "immutable image pattern rejects a digest-qualified reference",
  );
  assert(
    !immutableRegex.test("docker.io/library/witnessops-web:latest"),
    "immutable image pattern accepts a mutable tag",
  );

  const contractCheckIds = contract.staging_acceptance?.required_checks;
  assert(Array.isArray(contractCheckIds), "staging required checks must be an array");
  exactIdSet(
    contractCheckIds.map((id) => ({ id })),
    EXPECTED_CHECK_IDS,
    "staging required checks",
  );
  assert(contract.staging_acceptance?.pre_dns_only === true, "candidate acceptance must be pre-DNS");
  assert(contract.cutover?.dns_changes_in_this_pr === false, "contract authorizes a DNS change");
  assert(
    contract.cutover?.production_key_activation_in_this_pr === false,
    "contract combines cutover with production key activation",
  );

  return true;
}

export function validateAcceptanceRecordStructure(contract, record) {
  validateMigrationContract(contract);
  assert(isObject(record), "acceptance record must be an object");
  assert(
    record.record_version === "witnessops.aws_migration_acceptance.v1",
    "unexpected acceptance record version",
  );
  assert(record.contract_id === contract.contract_id, "acceptance record contract id mismatch");
  assert(!containsSecretMaterial(record), "acceptance record contains credential material");
  assert(record.target?.region === contract.compute.region, "acceptance record region mismatch");

  exactIdSet(record.state, [...EXPECTED_STATE_STRATEGIES.keys()], "acceptance state records");
  exactIdSet(record.checks, EXPECTED_CHECK_IDS, "acceptance checks");
  for (const item of [...record.state, ...record.checks]) {
    assert(ALLOWED_RESULT_STATUSES.has(item.status), `unsupported result status for ${item.id}`);
  }

  const trust = record.trust_boundary;
  assert(isObject(trust), "trust boundary record is missing");
  assert(
    trust.production_key_activation_performed === false,
    "AWS acceptance record claims production key activation",
  );
  assert(
    trust.production_key_registry_changed === false,
    "AWS acceptance record claims a key-registry change",
  );
  assert(
    trust.production_signing_private_key_present_on_candidate === false,
    "production signing private key is present on the web candidate",
  );

  assert(record.cutover?.dns_changed === false, "acceptance record includes a DNS mutation");
  return true;
}

export function stagingReadinessErrors(contract, record) {
  validateAcceptanceRecordStructure(contract, record);
  const errors = [];
  const add = (condition, message) => {
    if (!condition) errors.push(message);
  };

  add(
    RFC3339_UTC.test(record.recorded_at ?? "") && Number.isFinite(Date.parse(record.recorded_at)),
    "recorded_at must be an RFC3339 UTC timestamp",
  );
  add(GIT_SHA.test(record.source?.head ?? ""), "source.head must be a full lowercase Git SHA");
  add(record.source?.tree_clean === true, "source tree must be clean");
  add(
    typeof record.source?.current_host_receipt_ref === "string" &&
      record.source.current_host_receipt_ref.length > 0,
    "current-host evidence reference is missing",
  );
  add(/^\d{12}$/.test(record.target?.aws_account_id ?? ""), "target AWS account id is missing");
  add(
    /^eu-central-1[a-z]$/.test(record.target?.availability_zone ?? ""),
    "target availability zone is missing or outside eu-central-1",
  );
  add(SAFE_ID.test(record.target?.instance_id ?? ""), "target instance id is missing");
  add(IPV4.test(record.target?.static_ipv4_observed ?? ""), "target static IPv4 observation is missing");
  add(
    typeof record.target?.candidate_host_receipt_ref === "string" &&
      record.target.candidate_host_receipt_ref.length > 0,
    "candidate-host evidence reference is missing",
  );

  const objectives = record.recovery_objectives;
  add(positiveInteger(objectives?.rpo_minutes), "approved RPO is missing");
  add(positiveInteger(objectives?.rto_minutes), "approved RTO is missing");
  add(positiveInteger(objectives?.maintenance_window_minutes), "maintenance window is missing");
  add(objectives?.approved === true, "recovery objectives are not approved");

  const image = record.image;
  const immutableRegex = new RegExp(contract.image_provenance.immutable_reference_pattern);
  add(image?.status === "pass", "image evidence did not pass");
  add(GIT_SHA.test(image?.source_head ?? ""), "image source head is missing");
  add(image?.source_head === record.source?.head, "image source head differs from migration source head");
  add(
    typeof image?.human_readable_alias === "string" && image.human_readable_alias.length > 0,
    "human-readable image alias is missing",
  );
  add(immutableRegex.test(image?.manifest_ref ?? ""), "image reference is not digest-qualified");
  add(SHA256.test(image?.config_digest ?? ""), "image config digest is missing");
  add(
    SHA256.test(image?.supply_chain_gate_result_sha256 ?? ""),
    "supply-chain gate result digest is missing",
  );
  add(
    Array.isArray(image?.runtime_image_ids) &&
      image.runtime_image_ids.length >= 2 &&
      image.runtime_image_ids.every((item) => SHA256.test(item)),
    "prod and mesh runtime image ids are incomplete",
  );

  const mappingById = new Map(contract.persistent_state.mappings.map((item) => [item.id, item]));
  for (const state of record.state) {
    const strategy = mappingById.get(state.id).strategy;
    add(state.status === "pass", `${state.id} migration did not pass`);
    add(nonNegativeInteger(state.source_file_count), `${state.id} source file count is missing`);
    add(nonNegativeInteger(state.source_bytes), `${state.id} source byte count is missing`);

    if (strategy === "copy_and_manifest_verify") {
      add(SHA256.test(state.source_manifest_sha256 ?? ""), `${state.id} source manifest is missing`);
      add(SHA256.test(state.target_manifest_sha256 ?? ""), `${state.id} target manifest is missing`);
      add(
        state.source_manifest_sha256 === state.target_manifest_sha256,
        `${state.id} source and target manifests differ`,
      );
      add(state.source_file_count === state.target_file_count, `${state.id} file counts differ`);
      add(state.source_bytes === state.target_bytes, `${state.id} byte counts differ`);
    } else if (strategy === "archive_source_then_recreate_empty") {
      add(SHA256.test(state.archive_sha256 ?? ""), `${state.id} archive digest is missing`);
      add(state.target_empty === true, `${state.id} target was not recreated empty`);
      add(state.target_file_count === 0, `${state.id} target file count is not zero`);
      add(state.target_bytes === 0, `${state.id} target byte count is not zero`);
    } else if (strategy === "archive_only_not_remounted") {
      add(SHA256.test(state.archive_sha256 ?? ""), `${state.id} archive digest is missing`);
      add(state.target_manifest_sha256 === null, `${state.id} unexpectedly has a live target manifest`);
      add(state.target_file_count === null, `${state.id} unexpectedly has a live target file count`);
      add(state.target_bytes === null, `${state.id} unexpectedly has a live target byte count`);
    }
  }

  const trust = record.trust_boundary;
  add(SHA256.test(trust.pre_migration_policy_digest ?? ""), "pre-migration trust-policy digest is missing");
  add(SHA256.test(trust.post_migration_policy_digest ?? ""), "post-migration trust-policy digest is missing");
  add(
    trust.pre_migration_policy_digest === trust.post_migration_policy_digest,
    "production signer trust changed during AWS migration",
  );

  for (const check of record.checks) {
    add(check.status === "pass", `${check.id} did not pass`);
    add(
      typeof check.evidence_ref === "string" && check.evidence_ref.length > 0,
      `${check.id} evidence reference is missing`,
    );
  }

  add(record.observability?.ready === true, "observability is not ready");
  add(
    record.observability?.notification_contact_verified === true,
    "observability notification contact is unverified",
  );
  add(
    record.observability?.alarm_fired_and_recovered === true,
    "alarm fire/recovery test is incomplete",
  );
  add(
    record.observability?.log_retention_and_redaction_recorded === true,
    "log retention/redaction is not recorded",
  );
  add(
    typeof record.observability?.owner === "string" && record.observability.owner.length > 0,
    "observability owner is missing",
  );

  add(record.rollback?.ready === true, "rollback is not ready");
  add(record.rollback?.old_host_retained === true, "old host is not retained for rollback");
  add(
    immutableRegex.test(record.rollback?.known_good_image_ref ?? ""),
    "known-good rollback image is missing or mutable",
  );
  add(
    record.rollback?.state_reverse_sync_plan_recorded === true,
    "post-write state reverse-sync plan is missing",
  );

  return errors;
}

export function cutoverReadinessErrors(contract, record) {
  const errors = stagingReadinessErrors(contract, record);
  if (record.cutover?.authorized !== true) errors.push("cutover is not separately authorized");
  if (!(typeof record.cutover?.approval_reference === "string" && record.cutover.approval_reference)) {
    errors.push("cutover approval reference is missing");
  }
  if (record.cutover?.decision !== "ready") errors.push("cutover decision is not ready");
  if (record.cutover?.performed !== false) errors.push("cutover readiness must be evaluated before cutover");
  if (record.cutover?.dns_changed !== false) errors.push("DNS changed before cutover readiness completed");
  return errors;
}

function usage() {
  console.error(
    "usage: node deploy/aws/validate-acceptance.mjs [record.json] [--require-staging-ready|--require-cutover-ready]",
  );
}

function main() {
  const args = process.argv.slice(2);
  const flags = args.filter((arg) => arg.startsWith("--"));
  const paths = args.filter((arg) => !arg.startsWith("--"));
  if (paths.length > 1 || flags.length > 1) {
    usage();
    process.exitCode = 2;
    return;
  }

  const flag = flags[0] ?? "--structure-only";
  if (!["--structure-only", "--require-staging-ready", "--require-cutover-ready"].includes(flag)) {
    usage();
    process.exitCode = 2;
    return;
  }

  const recordPath = path.resolve(paths[0] ?? DEFAULT_RECORD_PATH);
  try {
    const contract = readJson(DEFAULT_CONTRACT_PATH);
    const record = readJson(recordPath);
    validateAcceptanceRecordStructure(contract, record);

    const readinessErrors =
      flag === "--require-cutover-ready"
        ? cutoverReadinessErrors(contract, record)
        : flag === "--require-staging-ready"
          ? stagingReadinessErrors(contract, record)
          : [];

    if (readinessErrors.length > 0) {
      for (const error of readinessErrors) console.error(`BLOCKED: ${error}`);
      process.exitCode = 1;
      return;
    }

    console.log(
      flag === "--structure-only"
        ? `STRUCTURE_OK ${recordPath}`
        : `READY ${flag.replace("--require-", "").replace("-ready", "")} ${recordPath}`,
    );
  } catch (error) {
    console.error(`INVALID: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main();
}
