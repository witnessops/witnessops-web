#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { containsCredentialMaterial } from "./credential-material.mjs";

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(THIS_DIR, "..", "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function exactSet(actual, expected, label) {
  assert(Array.isArray(actual), `${label} must be an array`);
  const left = [...actual].sort();
  const right = [...expected].sort();
  assert(JSON.stringify(left) === JSON.stringify(right), `${label} has the wrong inventory`);
}

function forbiddenAutomaticTriggers(source, label) {
  for (const trigger of ["push:", "pull_request:", "schedule:", "repository_dispatch:"]) {
    assert(!source.includes(`\n  ${trigger}`), `${label} contains automatic trigger ${trigger}`);
  }
}

function requireSingleExecutableLine(source, command, label) {
  const count = source
    .split(/\r?\n/u)
    .filter((line) => line.trim() === command).length;
  assert(count === 1, `${label} must appear exactly once as an executable line`);
}

function requireSingleExactLine(source, expected, label) {
  const count = source.split(/\r?\n/u).filter((line) => line === expected).length;
  assert(count === 1, `${label} must appear exactly once at the reviewed indentation`);
}

const EXPECTED_BUILD_IMAGE_JOB = [
  "  build_image:",
  "    name: Build exact AWS image without publication authority",
  "    needs: validate",
  "    runs-on: ubuntu-latest",
  "    timeout-minutes: 30",
  "    permissions:",
  "      contents: read",
  "    steps:",
  "      - name: Check out without persisted credentials",
  "        uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5",
  "        with:",
  "          persist-credentials: false",
  "",
  "      - name: Build the linux-amd64 AWS image",
  "        run: |",
  "          set -euo pipefail",
  "          docker build \\",
  "            --platform linux/amd64 \\",
  "            --file deploy/Dockerfile.aws \\",
  '            --build-arg "SOURCE_COMMIT=${GITHUB_SHA}" \\',
  '            --tag "witnessops-web-aws-pr:${GITHUB_SHA}" \\',
  "            .",
  "",
  "      - name: Verify the patched runtime packages and tools",
  "        run: |",
  "          set -euo pipefail",
  "          docker run --rm \\",
  "            --entrypoint /bin/sh \\",
  '            "witnessops-web-aws-pr:${GITHUB_SHA}" \\',
  "            -eu -c '",
  "              installed_apk_version() {",
  '                awk -v wanted="$1" \'\\\'\'',
  '                  $0 == "P:" wanted { found = 1; next }',
  "                  found && /^V:/ { print substr($0, 3); exit }",
  "                  found && /^$/ { exit 1 }",
  "                '\\'' /lib/apk/db/installed",
  "              }",
  '              test "$(installed_apk_version libcrypto3)" = "3.5.8-r0"',
  '              test "$(installed_apk_version libssl3)" = "3.5.8-r0"',
  "              node --version",
  "              gws --version",
  "            '",
].join("\n");

const EXPECTED_PULL_REQUEST_PATHS = [
  "apps/witnessops-web/**",
  "content/**",
  "packages/**",
  ".dockerignore",
  ".github/workflows/aws-phase3-validate.yml",
  ".github/workflows/aws-release.yml",
  ".github/workflows/aws-release-reusable.yml",
  "deploy/Dockerfile.aws",
  "deploy/aws/cloudformation/github-deployment-bootstrap.template.json",
  "deploy/aws/github-deployment-contract.v1.json",
  "deploy/aws/host/**",
  "deploy/aws/phase3-adapter-workflow-contract.v1.json",
  "deploy/aws/README.md",
  "deploy/aws/validate-phase3.mjs",
  "deploy/aws/validate-phase3.test.mjs",
  "deploy/aws/validate-ecr-scan-findings.mjs",
  "deploy/aws/validate-ecr-scan-findings.test.mjs",
  "deploy/aws/validate-github-deployment.mjs",
  "deploy/aws/validate-github-deployment.test.mjs",
  "deploy/aws/verify-scan-evidence.mjs",
  "deploy/aws/verify-scan-evidence.test.mjs",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
];

function exactNamedWorkflowJob(source, name) {
  const marker = `  ${name}:\n`;
  const start = source.indexOf(marker);
  assert(start >= 0, `validation workflow is missing job ${name}`);
  assert(
    source.indexOf(marker, start + marker.length) < 0,
    `validation workflow contains duplicate job ${name}`,
  );
  const tail = source.slice(start + marker.length);
  const next = tail.search(/^  [A-Za-z0-9_-]+:\s*$/mu);
  return source
    .slice(start, next < 0 ? source.length : start + marker.length + next)
    .trimEnd();
}

function pullRequestPathBlock(source) {
  const marker = "  pull_request:\n    paths:\n";
  const start = source.indexOf(marker);
  assert(start >= 0, "validation workflow is missing pull_request paths");
  const contentStart = start + marker.length;
  const tail = source.slice(contentStart);
  const nextTrigger = tail.search(/^  \S/mu);
  return tail.slice(0, nextTrigger < 0 ? tail.length : nextTrigger).trimEnd();
}

export function loadPhase3Sources(root = ROOT) {
  const read = (relative) => readFileSync(path.join(root, relative), "utf8");
  return {
    contract: JSON.parse(read("deploy/aws/phase3-adapter-workflow-contract.v1.json")),
    readme: read("deploy/aws/README.md"),
    adapter: read("deploy/aws/host/witnessops-deploy-v1"),
    installer: read("deploy/aws/host/install-witnessops-deploy-v1.sh"),
    configExample: JSON.parse(
      read("deploy/aws/host/witnessops-deploy-v1.config.example.json"),
    ),
    dockerfile: read("deploy/Dockerfile.aws"),
    caller: read(".github/workflows/aws-release.yml"),
    reusable: read(".github/workflows/aws-release-reusable.yml"),
    validation: read(".github/workflows/aws-phase3-validate.yml"),
    scanVerifier: read("deploy/aws/verify-scan-evidence.mjs"),
    scanFindingsValidator: read("deploy/aws/validate-ecr-scan-findings.mjs"),
  };
}

export function validatePhase3Sources(sources) {
  const {
    contract,
    readme,
    adapter,
    installer,
    configExample,
    dockerfile,
    caller,
    reusable,
    validation,
    scanVerifier,
    scanFindingsValidator,
  } = sources;

  assert(!containsCredentialMaterial(sources), "Phase 3 source contains credential material");
  assert(contract.contract_id === "witnessops.aws.adapter-workflow.v1", "contract id mismatch");
  assert(
    contract.status === "source_only_requires_review_merge_and_separate_host_apply",
    "contract status overstates activation",
  );
  exactSet(
    contract.not_authorized,
    [
      "workflow_dispatch",
      "image_publication",
      "ssm_send_command",
      "application_deployment",
      "dns_change",
      "runtime_secret_change",
      "production_signing_activation",
      "production_key_registry_change",
    ],
    "non-authorized boundary",
  );
  assert(contract.adapter.installed_path === "/usr/local/sbin/witnessops-deploy-v1");
  assert(contract.adapter.config_path === "/etc/witnessops/deploy-v1.json");
  assert(contract.adapter.credential_source === "/root/.aws/credentials");
  assert(contract.adapter.credential_handling === "read_in_memory_never_emit_never_copy");
  assert(contract.workflows.caller_trigger === "workflow_dispatch_only");
  assert(
    contract.workflows.caller_workflow_ref ===
      "witnessops/witnessops-web/.github/workflows/aws-release.yml@refs/heads/main",
    "contract exact caller ref mismatch",
  );
  assert(contract.workflows.reusable_trigger === "workflow_call_only");
  assert(contract.workflows.reusable_exact_caller_required === true);
  assert(contract.workflows.automatic_publish_or_deploy === false);
  assert(contract.workflows.exact_ecr_repository_uri_required === true);
  assert(contract.workflows.deployment_requires_publication_run_identity === true);
  assert(
    contract.workflows.successful_scan_evidence ===
      "github_run_artifact_bound_to_exact_publisher_run_attempt_source_manifest_config_and_describe_image_scan_findings_response",
  );
  assert(
    JSON.stringify(contract.workflows.successful_scan_evidence_scanning_modes) ===
      JSON.stringify(["basic_complete_findings", "enhanced_active_enhanced_findings"]),
  );
  assert(
    contract.workflows.successful_scan_evidence_pagination ===
      "aws_cli_auto_paginated_response_must_not_contain_next_token",
  );
  assert(contract.workflows.successful_scan_evidence_retention_days === 90);
  assert(
    contract.workflows.successful_scan_evidence_aws_iam_change ===
      "repository_scoped_ecr_describe_image_scan_findings_only",
  );
  assert(
    contract.workflows.immutable_tag_retry_strategy ===
      "reuse_existing_source_tag_only_after_exact_registry_manifest_config_source_label_and_verified_local_build_config_digest_validation",
  );
  assert(contract.activation_gates.merge_required_before_host_install === true);
  assert(contract.activation_gates.config_digest_required === true);
  assert(contract.activation_gates.root_staged_apply_self_test_required === true);
  assert(contract.activation_gates.successful_scan_evidence_required === true);
  assert(contract.activation_gates.workflow_dispatch_forbidden_in_activation_lane === true);
  const normalizedReadme = readme.replace(/\s+/g, " ");
  for (const required of [
    "Phase 3 activation boundary",
    "it does not run it",
    "must not dispatch the workflow",
    "existing production hybrid node is not a staging target",
  ]) {
    assert(
      normalizedReadme.includes(required),
      `Phase 3 documentation is missing ${required}`,
    );
  }

  assert(adapter.startsWith("#!/usr/bin/env python3"), "adapter interpreter is not pinned");
  for (const required of [
    'CONFIG_PATH = Path("/etc/witnessops/deploy-v1.json")',
    'LOCK_PATH = Path("/run/lock/witnessops-deploy-v1.lock")',
    'REGION = "eu-central-1"',
    'REPOSITORY = "witnessops-web"',
    "GetAuthorizationToken",
    "StripCrossHostAuthorization",
    "SameAuthorityRedirects",
    "fetch_oci_archive",
    "validate_runtime_contract",
    "expected current image",
    '"op": "test"',
    "expected_image_ref",
    "rollback refused to overwrite an unexpected runtime image",
    "rollout",
    "write_receipt",
  ]) {
    assert(adapter.includes(required), `adapter is missing ${required}`);
  }
  for (const forbidden of ["shell=True", "os.system(", "eval(", "exec("]) {
    assert(!adapter.includes(forbidden), `adapter contains forbidden execution surface ${forbidden}`);
  }
  assert(
    adapter.includes('if args.region != config["region"]') &&
      adapter.includes('if args.registry != config["registry"]') &&
      adapter.includes('if args.repository != config["repository"]'),
    "adapter does not pin account-scoped image identity inputs",
  );
  assert(
    adapter.includes("org.opencontainers.image.revision"),
    "adapter does not bind image identity to the source commit",
  );

  assert(installer.startsWith("#!/usr/bin/env bash"), "installer interpreter is not pinned");
  for (const required of [
    'mode="check"',
    "--apply",
    "--expected-sha256",
    "--expected-config-sha256",
    "expected_config_sha256",
    "installed config staging digest mismatch",
    'adapter_target="/usr/local/sbin/witnessops-deploy-v1"',
    'config_target="/etc/witnessops/deploy-v1.json"',
    "-m 0755",
    "-m 0600",
    "--self-test",
  ]) {
    assert(installer.includes(required), `installer is missing ${required}`);
  }
  assert(
    installer.indexOf('if [[ "${mode}" == "check" ]]') <
      installer.indexOf('[[ "${EUID}" -eq 0 ]]'),
    "installer does not keep check mode ahead of mutation",
  );
  const sourceSelfTest = 'python3 "${adapter_source}" --self-test --config "${config_source}"';
  const checkBranch = installer.indexOf('if [[ "${mode}" == "check" ]]');
  const rootGate = installer.indexOf('[[ "${EUID}" -eq 0 ]]');
  assert(
    installer.indexOf(sourceSelfTest) > checkBranch &&
      installer.indexOf(sourceSelfTest) < rootGate &&
      installer.indexOf(sourceSelfTest) === installer.lastIndexOf(sourceSelfTest),
    "apply mode can execute an adapter source pathname",
  );
  assert(
    installer.indexOf('python3 "${adapter_tmp}" --self-test --config "${config_tmp}"') >
      installer.indexOf("installed config staging digest mismatch") &&
      installer.indexOf('python3 "${adapter_tmp}" --self-test --config "${config_tmp}"') <
        installer.indexOf('mv -f "${adapter_tmp}" "${adapter_target}"'),
    "installer does not self-test only the digest-verified staged pair before replacement",
  );

  assert(configExample.region === "eu-central-1", "example region mismatch");
  assert(configExample.repository === "witnessops-web", "example repository mismatch");
  exactSet(Object.keys(configExample.lanes), ["staging", "production"], "example lanes");
  assert(
    configExample.credentials_file === "/root/.aws/credentials",
    "example credential source mismatch",
  );

  for (const required of [
    "node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32",
    "ARG SOURCE_COMMIT",
    'org.opencontainers.image.revision="${SOURCE_COMMIT}"',
    "NEXT_PUBLIC_OS_SITE_URL=https://witnessops.com",
    "WITNESSOPS_VERIFY_BASE_URL=https://witnessops.com",
    "gcompat=1.1.0-r4",
    "python3=3.14.7-r1",
    "make=4.4.1-r4",
    "g++=15.2.0-r5",
    "libcrypto3=3.5.8-r0",
    "libssl3=3.5.8-r0",
    "ca-certificates=20260611-r0",
    "curl=8.21.0-r0",
  ]) {
    assert(dockerfile.includes(required), `AWS Dockerfile is missing ${required}`);
  }
  assert(!dockerfile.includes(":latest"), "AWS Dockerfile uses a mutable latest reference");

  assert(caller.includes("\n  workflow_dispatch:"), "caller is not manual-dispatch only");
  forbiddenAutomaticTriggers(caller, "caller");
  assert(
    caller.includes("uses: ./.github/workflows/aws-release-reusable.yml"),
    "caller bypasses the reserved reusable workflow",
  );
  assert(!caller.includes("run:"), "caller contains executable steps outside the reusable workflow");
  for (const required of [
    "publication_run_id:",
    "publication_run_attempt:",
    "actions: read",
  ]) {
    assert(caller.includes(required), `caller is missing ${required}`);
  }

  assert(reusable.includes("\n  workflow_call:"), "reusable workflow lacks workflow_call");
  forbiddenAutomaticTriggers(reusable, "reusable workflow");
  for (const environment of ["aws-image-publish", "aws-staging", "aws-production"]) {
    assert(
      reusable.includes(`environment: ${environment}`),
      `reusable workflow lacks ${environment}`,
    );
  }
  for (const required of [
    "GITHUB_REF",
    "refs/heads/main",
    "GITHUB_REPOSITORY_ID",
    "1200448046",
    "GITHUB_REPOSITORY_OWNER_ID",
    "272034497",
    "GITHUB_EVENT_NAME",
    '[[ "${GITHUB_EVENT_NAME}" == "workflow_dispatch" ]]',
    "GITHUB_WORKFLOW_REF",
    'witnessops/witnessops-web/.github/workflows/aws-release.yml@refs/heads/main',
    "AWS_SSM_MANAGED_NODE_ID",
    "AWS_SSM_DOCUMENT_NAME",
    "ExpectedCurrentDigest",
    "CloudWatchOutputEnabled=true",
    "aws ssm send-command",
    "aws ssm wait command-executed",
    "aws ssm get-command-invocation",
    "mask-aws-account-id: true",
    'expected_repository_uri="${registry}/${ECR_REPOSITORY}"',
    '[[ "${ECR_REPOSITORY_URI}" == "${expected_repository_uri}" ]]',
    "validate_scan_evidence:",
    "aws ecr describe-image-scan-findings",
    "ImageNotFound",
    'publication_mode="reused_existing_immutable_tag"',
    'EXPECTED_BUILD_CONFIG_DIGEST: ${{ steps.local_image.outputs.config_digest }}',
    '[[ "${config_digest}" == "${EXPECTED_BUILD_CONFIG_DIGEST}" ]]',
    "ecr-scan-findings.json",
    "ecr-manifest.json",
    "IN_PROGRESS|PENDING",
    "enhancedFindings",
    "actions: read",
    "witnessops-web-aws-scan-evidence-",
    "github-token: ${{ github.token }}",
    "run-id: ${{ needs.validate.outputs.publication_run_id }}",
    "deploy/aws/verify-scan-evidence.mjs",
    "needs: [validate, validate_scan_evidence]",
  ]) {
    assert(reusable.includes(required), `reusable workflow is missing ${required}`);
  }
  assert(
    reusable.match(/aws-actions\/configure-aws-credentials@61815dcd50bd041e203e49132bacad1fd04d2708/g)
      ?.length === 3,
    "AWS credential action is unpinned or has the wrong job inventory",
  );
  assert(!reusable.includes("secrets:"), "reusable workflow accepts or forwards GitHub secrets");
  assert(!reusable.includes(":latest"), "reusable workflow uses a mutable latest reference");
  assert(
    !reusable.includes("imageScanFindingsSummary") && !reusable.includes("aws ecr describe-images"),
    "reusable workflow uses DescribeImages scan telemetry",
  );
  const publisherJob = reusable.slice(
    reusable.indexOf("\n  publish_image:"),
    reusable.indexOf("\n  validate_scan_evidence:"),
  );
  assert(publisherJob.length > 0, "publisher job boundaries are missing");
  for (const required of [
    "Check out the exact scan validator without persisted credentials",
    "ref: ${{ needs.validate.outputs.source_commit }}",
    "persist-credentials: false",
    "node deploy/aws/validate-ecr-scan-findings.mjs",
  ]) {
    assert(publisherJob.includes(required), `publisher job is missing ${required}`);
  }
  assert(
    !/\b(commands|shell_command|run_command)\b\s*:/.test(reusable),
    "reusable workflow accepts an arbitrary command input",
  );
  assert(
    reusable.includes("needs.validate.outputs.operation == 'deploy-production'"),
    "production job is not bound to the exact operation",
  );
  assert(
    reusable.match(/needs: \[validate, validate_scan_evidence\]/g)?.length === 2,
    "deployment jobs are not both bound to successful scan evidence",
  );

  for (const required of [
    'evidence.operation === "publish-image"',
    "run.path === `${CALLER_PATH}@main`",
    'run.head_branch === "main"',
    'run.head_sha === expected.sourceCommit',
    'run.conclusion === "success"',
    "reusable.sha === expected.sourceCommit",
    'reusable.ref === "refs/heads/main"',
    "evidence.image_digest === expected.imageDigest",
    "evidence.config_digest === expected.configDigest",
    "SCAN_MODE_STATUS",
    "evidence.scan_status === SCAN_MODE_STATUS[evidence.scan_mode]",
    "evidence.critical_findings === 0",
    "evidence.high_findings === 0",
    "evidence.scan_api === SCAN_API",
    "validateEcrScanFindings",
    "scan findings artifact hash differs",
  ]) {
    assert(scanVerifier.includes(required), `scan evidence verifier is missing ${required}`);
  }

  for (const required of [
    "payload.imageId.imageDigest === expected.imageDigest",
    "payload.nextToken === undefined",
    "Object.hasOwn(SCAN_MODES, scanStatus)",
    "payload.imageScanFindings[inventoryKey]",
    "isCompletionTimestamp(payload.imageScanFindings.imageScanCompletedAt)",
    "severityCounts.CRITICAL",
    "severityCounts.HIGH",
    "criticalFindings === 0",
    "highFindings === 0",
  ]) {
    assert(
      scanFindingsValidator.includes(required),
      `ECR scan findings validator is missing ${required}`,
    );
  }

  assert(validation.includes("\n  pull_request:"), "Phase 3 validation does not run on PRs");
  const prPaths = pullRequestPathBlock(validation);
  for (const buildInput of [
    "apps/witnessops-web/**",
    "content/**",
    "packages/**",
    ".dockerignore",
    "deploy/Dockerfile.aws",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
  ]) {
    requireSingleExactLine(
      prPaths,
      `      - "${buildInput}"`,
      `AWS image build input ${buildInput}`,
    );
  }
  assert(
    prPaths === EXPECTED_PULL_REQUEST_PATHS.map((entry) => `      - "${entry}"`).join("\n"),
    "validation pull_request paths must match the complete reviewed inventory",
  );
  assert(!validation.includes("id-token: write"), "validation workflow can mint OIDC tokens");
  assert(!validation.includes("secrets:"), "validation workflow uses secrets");
  assert(
    validation.includes("python3 -m unittest deploy/aws/host/test_witnessops_deploy_v1.py"),
    "validation workflow omits adapter unit tests",
  );
  assert(
    validation.includes("node --test deploy/aws/verify-scan-evidence.test.mjs"),
    "validation workflow omits scan evidence tests",
  );
  assert(
    validation.includes("node --test deploy/aws/validate-ecr-scan-findings.test.mjs"),
    "validation workflow omits ECR scan findings tests",
  );
  for (const required of [
    "Build exact AWS image without publication authority",
    "docker build",
    "--platform linux/amd64",
    "--file deploy/Dockerfile.aws",
    '--build-arg "SOURCE_COMMIT=${GITHUB_SHA}"',
    "installed_apk_version()",
    "/lib/apk/db/installed",
    "gws --version",
  ]) {
    assert(validation.includes(required), `validation workflow is missing ${required}`);
  }
  requireSingleExecutableLine(
    validation,
    'test "$(installed_apk_version libcrypto3)" = "3.5.8-r0"',
    "libcrypto3 runtime version assertion",
  );
  requireSingleExecutableLine(
    validation,
    'test "$(installed_apk_version libssl3)" = "3.5.8-r0"',
    "libssl3 runtime version assertion",
  );
  assert(!validation.includes("docker push"), "validation workflow can publish an image");
  const buildJob = exactNamedWorkflowJob(validation, "build_image");
  assert(
    !/^    if:/mu.test(buildJob),
    "build_image job must not be conditionally disabled",
  );
  assert(
    !/^    continue-on-error:/mu.test(buildJob),
    "build_image job failures must remain gating",
  );
  assert(
    buildJob.includes("\n    needs: validate\n"),
    "build_image job must wait for source validation",
  );
  assert(
    buildJob === EXPECTED_BUILD_IMAGE_JOB,
    "build_image job must retain the exact reviewed no-publication gating structure",
  );
  return true;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  validatePhase3Sources(loadPhase3Sources());
  process.stdout.write("AWS_PHASE3_SOURCE_OK\n");
}
