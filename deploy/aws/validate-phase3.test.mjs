import assert from "node:assert/strict";
import test from "node:test";

import {
  loadPhase3Sources,
  validatePhase3Sources,
} from "./validate-phase3.mjs";

const sources = loadPhase3Sources();

function changed(key, transform) {
  const result = structuredClone(sources);
  result[key] = transform(result[key]);
  return result;
}

test("Phase 3 adapter and workflows preserve the source-only boundary", () => {
  assert.equal(validatePhase3Sources(sources), true);
});

test("automatic caller triggers are rejected", () => {
  const mutated = changed("caller", (value) =>
    value.replace("  workflow_dispatch:", "  push:\n    branches: [main]\n  workflow_dispatch:"),
  );
  assert.throws(
    () => validatePhase3Sources(mutated),
    /automatic trigger push:/,
  );
});

test("caller cannot bypass the reserved reusable workflow", () => {
  const mutated = changed("caller", (value) =>
    value.replace(
      "uses: ./.github/workflows/aws-release-reusable.yml",
      "runs-on: ubuntu-latest\n    steps:\n      - run: aws ssm send-command",
    ),
  );
  assert.throws(
    () => validatePhase3Sources(mutated),
    /bypasses the reserved reusable workflow|executable steps/,
  );
});

test("production environment removal is rejected", () => {
  const mutated = changed("reusable", (value) =>
    value.replace("environment: aws-production", "environment: aws-staging"),
  );
  assert.throws(
    () => validatePhase3Sources(mutated),
    /lacks aws-production/,
  );
});

test("reusable workflow must pin the manual dispatch event", () => {
  const mutated = changed("reusable", (value) =>
    value.replace(
      '[[ "${GITHUB_EVENT_NAME}" == "workflow_dispatch" ]]',
      '[[ -n "${GITHUB_EVENT_NAME}" ]]',
    ),
  );
  assert.throws(
    () => validatePhase3Sources(mutated),
    /GITHUB_EVENT_NAME|workflow_dispatch/,
  );
});

test("reusable workflow must pin the exact manual caller", () => {
  const mutated = changed("reusable", (value) =>
    value.replace(
      "witnessops/witnessops-web/.github/workflows/aws-release.yml@refs/heads/main",
      "witnessops/witnessops-web/.github/workflows/alternate.yml@refs/heads/main",
    ),
  );
  assert.throws(
    () => validatePhase3Sources(mutated),
    /aws-release.yml@refs\/heads\/main/,
  );
});

test("installer must bind the topology config digest", () => {
  const mutated = changed("installer", (value) =>
    value.replaceAll("--expected-config-sha256", "--unbound-config-sha256"),
  );
  assert.throws(
    () => validatePhase3Sources(mutated),
    /expected-config-sha256/,
  );
});

test("apply mode cannot execute the adapter source pathname", () => {
  const mutated = changed("installer", (value) =>
    value.replace(
      '[[ "${EUID}" -eq 0 ]]',
      'python3 "${adapter_source}" --self-test --config "${config_source}"\n[[ "${EUID}" -eq 0 ]]',
    ),
  );
  assert.throws(
    () => validatePhase3Sources(mutated),
    /execute an adapter source pathname/,
  );
});

test("publisher must bind the exact ECR repository URI", () => {
  const mutated = changed("reusable", (value) =>
    value.replace(
      '[[ "${ECR_REPOSITORY_URI}" == "${expected_repository_uri}" ]]',
      '[[ -n "${ECR_REPOSITORY_URI}" ]]',
    ),
  );
  assert.throws(
    () => validatePhase3Sources(mutated),
    /ECR_REPOSITORY_URI/,
  );
});

test("publisher must use digest-bound DescribeImageScanFindings telemetry", () => {
  const mutated = changed("reusable", (value) =>
    value.replace("aws ecr describe-image-scan-findings", "aws ecr describe-images"),
  );
  assert.throws(
    () => validatePhase3Sources(mutated),
    /describe-image-scan-findings|DescribeImages scan telemetry/,
  );
});

test("publisher must use the singular DescribeImageScanFindings image-id argument", () => {
  const mutated = changed("reusable", (value) =>
    value.replace(
      '--image-id "imageDigest=${IMAGE_DIGEST}"',
      '--image-ids "imageDigest=${IMAGE_DIGEST}"',
    ),
  );
  assert.throws(() => validatePhase3Sources(mutated), /--image-id/);
});

test("publisher must support completed basic and enhanced scan inventories", () => {
  const mutated = changed("reusable", (value) =>
    value.replace("enhancedFindings", "unreviewedEnhancedInventory"),
  );
  assert.throws(
    () => validatePhase3Sources(mutated),
    /enhancedFindings/,
  );
});

test("publisher must check out the exact scan validator before invoking it", () => {
  const sources = loadPhase3Sources();
  sources.reusable = sources.reusable.replace(
    /      - name: Check out the exact scan validator without persisted credentials[\s\S]*?          persist-credentials: false\n\n/,
    "",
  );
  assert.throws(
    () => validatePhase3Sources(sources),
    /publisher job is missing Check out the exact scan validator/,
  );
});

test("publisher must preserve retry recovery for an existing immutable source tag", () => {
  const mutated = changed("reusable", (value) =>
    value.replace(
      'publication_mode="reused_existing_immutable_tag"',
      'publication_mode="overwritten_existing_tag"',
    ),
  );
  assert.throws(
    () => validatePhase3Sources(mutated),
    /reused_existing_immutable_tag/,
  );
});

test("publisher must bind reused immutable tags to the verified local build identity", () => {
  const mutated = changed("reusable", (value) =>
    value.replace(
      '[[ "${config_digest}" == "${EXPECTED_BUILD_CONFIG_DIGEST}" ]]',
      '[[ "${config_digest}" =~ ^sha256: ]]',
    ),
  );
  assert.throws(
    () => validatePhase3Sources(mutated),
    /EXPECTED_BUILD_CONFIG_DIGEST/,
  );
});

test("AWS image packages must retain reviewed Alpine versions", () => {
  const mutated = changed("dockerfile", (value) => value.replace("curl=8.22.0-r0", "curl"));
  assert.throws(() => validatePhase3Sources(mutated), /curl=8\.22\.0-r0/);
});

test("AWS runtime must retain the patched OpenSSL package versions", () => {
  const staleCrypto = changed("dockerfile", (value) =>
    value.replace("libcrypto3=3.5.8-r0", "libcrypto3=3.5.7-r0"),
  );
  assert.throws(() => validatePhase3Sources(staleCrypto), /libcrypto3=3\.5\.8-r0/);

  const staleSsl = changed("dockerfile", (value) =>
    value.replace("libssl3=3.5.8-r0", "libssl3=3.5.7-r0"),
  );
  assert.throws(() => validatePhase3Sources(staleSsl), /libssl3=3\.5\.8-r0/);
});

test("PR validation must build without image publication authority", () => {
  const missingBuildInputTrigger = changed("validation", (value) =>
    value.replace('      - "apps/witnessops-web/**"\n', ""),
  );
  assert.throws(
    () => validatePhase3Sources(missingBuildInputTrigger),
    /AWS image build input apps\/witnessops-web/,
  );

  const commentedBuildInputTrigger = changed("validation", (value) =>
    value.replace(
      '      - "pnpm-lock.yaml"',
      '      # - "pnpm-lock.yaml"',
    ),
  );
  assert.throws(
    () => validatePhase3Sources(commentedBuildInputTrigger),
    /AWS image build input pnpm-lock.yaml/,
  );

  const nestedBuildInputTrigger = changed("validation", (value) =>
    value.replace(
      '      - "packages/**"',
      '        - "packages/**"',
    ),
  );
  assert.throws(
    () => validatePhase3Sources(nestedBuildInputTrigger),
    /AWS image build input packages/,
  );

  const negatedBuildInputTriggers = changed("validation", (value) =>
    value.replace(
      '      - "pnpm-workspace.yaml"',
      '      - "pnpm-workspace.yaml"\n      - "!**"',
    ),
  );
  assert.throws(
    () => validatePhase3Sources(negatedBuildInputTriggers),
    /complete reviewed inventory/,
  );

  const withoutBuild = changed("validation", (value) =>
    value.replace("docker build", "docker inspect"),
  );
  assert.throws(() => validatePhase3Sources(withoutBuild), /docker build/);

  const repositoryBackedVersionCheck = changed("validation", (value) =>
    value.replace("/lib/apk/db/installed", "/var/cache/apk/APKINDEX.tar.gz"),
  );
  assert.throws(
    () => validatePhase3Sources(repositoryBackedVersionCheck),
    /\/lib\/apk\/db\/installed/,
  );

  const staleCryptoCheck = changed("validation", (value) =>
    value.replace(
      'test "$(installed_apk_version libcrypto3)" = "3.5.8-r0"',
      'test "$(installed_apk_version libcrypto3)" = "3.5.7-r0"',
    ),
  );
  assert.throws(
    () => validatePhase3Sources(staleCryptoCheck),
    /libcrypto3 runtime version assertion/,
  );

  const staleSslCheck = changed("validation", (value) =>
    value.replace(
      'test "$(installed_apk_version libssl3)" = "3.5.8-r0"',
      'test "$(installed_apk_version libssl3)" = "3.5.7-r0"',
    ),
  );
  assert.throws(
    () => validatePhase3Sources(staleSslCheck),
    /libssl3 runtime version assertion/,
  );

  const nonEnforcingVersionCheck = changed("validation", (value) =>
    value.replace(
      'test "$(installed_apk_version libcrypto3)" = "3.5.8-r0"',
      'echo "$(installed_apk_version libcrypto3)" = "3.5.8-r0"',
    ),
  );
  assert.throws(
    () => validatePhase3Sources(nonEnforcingVersionCheck),
    /libcrypto3 runtime version assertion/,
  );

  for (const [name, expected] of [
    ["libcrypto3", 'test "$(installed_apk_version libcrypto3)" = "3.5.8-r0"'],
    ["libssl3", 'test "$(installed_apk_version libssl3)" = "3.5.8-r0"'],
  ]) {
    const commentedOutVersionCheck = changed("validation", (value) =>
      value.replace(expected, `# ${expected}`),
    );
    assert.throws(
      () => validatePhase3Sources(commentedOutVersionCheck),
      new RegExp(`${name} runtime version assertion`),
    );
  }

  const duplicateVersionCheck = changed("validation", (value) =>
    value.replace(
      'test "$(installed_apk_version libcrypto3)" = "3.5.8-r0"',
      'test "$(installed_apk_version libcrypto3)" = "3.5.8-r0"\n              test "$(installed_apk_version libcrypto3)" = "3.5.8-r0"',
    ),
  );
  assert.throws(
    () => validatePhase3Sources(duplicateVersionCheck),
    /libcrypto3 runtime version assertion/,
  );

  const deadBranchVersionCheck = changed("validation", (value) =>
    value.replace(
      '              test "$(installed_apk_version libcrypto3)" = "3.5.8-r0"',
      '              if false; then\n                test "$(installed_apk_version libcrypto3)" = "3.5.8-r0"\n              fi',
    ),
  );
  assert.throws(
    () => validatePhase3Sources(deadBranchVersionCheck),
    /exact reviewed no-publication gating structure/,
  );

  const disabledBuildJob = changed("validation", (value) =>
    value.replace("  build_image:\n", "  build_image:\n    if: false\n"),
  );
  assert.throws(
    () => validatePhase3Sources(disabledBuildJob),
    /must not be conditionally disabled/,
  );

  const maskedBuildFailure = changed("validation", (value) =>
    value.replace("  build_image:\n", "  build_image:\n    continue-on-error: true\n"),
  );
  assert.throws(
    () => validatePhase3Sources(maskedBuildFailure),
    /failures must remain gating/,
  );

  const parallelBuild = changed("validation", (value) =>
    value.replace("    needs: validate\n", ""),
  );
  assert.throws(
    () => validatePhase3Sources(parallelBuild),
    /must wait for source validation/,
  );

  const misplacedVerificationStep = changed("validation", (value) =>
    value.replace(
      "      - name: Verify the patched runtime packages and tools",
      "  parked_verification:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Verify the patched runtime packages and tools",
    ),
  );
  assert.throws(
    () => validatePhase3Sources(misplacedVerificationStep),
    /build_image|missing step/,
  );

  const withPush = changed("validation", (value) => `${value}\n      - run: docker push image\n`);
  assert.throws(() => validatePhase3Sources(withPush), /can publish an image/);
});

test("both deploy jobs must require successful scan evidence", () => {
  const mutated = changed("reusable", (value) =>
    value.replace("needs: [validate, validate_scan_evidence]", "needs: validate"),
  );
  assert.throws(
    () => validatePhase3Sources(mutated),
    /both bound to successful scan evidence/,
  );
});

test("scan evidence must come from the exact publish operation", () => {
  const mutated = changed("scanVerifier", (value) =>
    value.replace(
      'evidence.operation === "publish-image"',
      'Boolean(evidence.operation)',
    ),
  );
  assert.throws(
    () => validatePhase3Sources(mutated),
    /publish-image/,
  );
});

test("smoke redirects must be checked before follow", () => {
  const mutated = changed("adapter", (value) =>
    value.replaceAll("SameAuthorityRedirects", "PermissiveRedirects"),
  );
  assert.throws(
    () => validatePhase3Sources(mutated),
    /SameAuthorityRedirects/,
  );
});

test("unreviewed credential-action revisions are rejected", () => {
  const mutated = changed("reusable", (value) =>
    value.replace(
      "aws-actions/configure-aws-credentials@61815dcd50bd041e203e49132bacad1fd04d2708",
      "aws-actions/configure-aws-credentials@main",
    ),
  );
  assert.throws(
    () => validatePhase3Sources(mutated),
    /credential action is unpinned/,
  );
});

test("arbitrary command inputs are rejected", () => {
  const mutated = changed("reusable", (value) =>
    value.replace(
      "operation:\n        type: string",
      "commands:\n        type: string\n      operation:\n        type: string",
    ),
  );
  assert.throws(
    () => validatePhase3Sources(mutated),
    /arbitrary command input/,
  );
});

test("adapter shell execution expansion is rejected", () => {
  const mutated = changed("adapter", (value) =>
    value.replace("timeout=timeout,", "timeout=timeout,\n            shell=True,"),
  );
  assert.throws(
    () => validatePhase3Sources(mutated),
    /forbidden execution surface shell=True/,
  );
});

test("activation contract cannot authorize dispatch or deployment", () => {
  const mutated = structuredClone(sources);
  mutated.contract.not_authorized = mutated.contract.not_authorized.filter(
    (value) => value !== "workflow_dispatch",
  );
  assert.throws(
    () => validatePhase3Sources(mutated),
    /non-authorized boundary has the wrong inventory/,
  );
});
