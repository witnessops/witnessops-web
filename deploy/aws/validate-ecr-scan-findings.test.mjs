import assert from "node:assert/strict";
import test from "node:test";

import { validateEcrScanFindings } from "./validate-ecr-scan-findings.mjs";

const expected = {
  repository: "witnessops-web",
  imageDigest: `sha256:${"a".repeat(64)}`,
};

function validBasicPayload(findings = []) {
  return {
    registryId: "000000000000",
    repositoryName: expected.repository,
    imageId: {
      imageDigest: expected.imageDigest,
      imageTag: "source-commit",
    },
    imageScanStatus: { status: "COMPLETE", description: "The scan was completed successfully." },
    imageScanFindings: {
      findings,
      findingSeverityCounts: {},
      imageScanCompletedAt: "2026-08-24T19:00:00Z",
    },
  };
}

function validEnhancedPayload(enhancedFindings = []) {
  return {
    registryId: "000000000000",
    repositoryName: expected.repository,
    imageId: {
      imageDigest: expected.imageDigest,
      imageTag: "source-commit",
    },
    imageScanStatus: { status: "ACTIVE", description: "Continuous scan is selected." },
    imageScanFindings: {
      enhancedFindings,
      findingSeverityCounts: {},
      imageScanCompletedAt: "2026-08-24T19:00:00Z",
    },
  };
}

test("exact complete basic findings telemetry with no critical or high findings is accepted", () => {
  assert.deepEqual(validateEcrScanFindings(validBasicPayload(), expected), {
    schema_version: 1,
    repository: expected.repository,
    image_digest: expected.imageDigest,
    scan_mode: "basic",
    scan_status: "COMPLETE",
    total_findings: 0,
    critical_findings: 0,
    high_findings: 0,
  });
});

test("exact active enhanced findings telemetry with a completed inventory is accepted", () => {
  assert.deepEqual(validateEcrScanFindings(validEnhancedPayload(), expected), {
    schema_version: 1,
    repository: expected.repository,
    image_digest: expected.imageDigest,
    scan_mode: "enhanced",
    scan_status: "ACTIVE",
    total_findings: 0,
    critical_findings: 0,
    high_findings: 0,
  });
});

test("missing findings inventory is rejected instead of treated as zero", () => {
  const payload = validBasicPayload();
  delete payload.imageScanFindings.findings;
  assert.throws(
    () => validateEcrScanFindings(payload, expected),
    /findings inventory is missing/,
  );
});

test("a response for a different digest is rejected", () => {
  const payload = validBasicPayload();
  payload.imageId.imageDigest = `sha256:${"b".repeat(64)}`;
  assert.throws(() => validateEcrScanFindings(payload, expected), /image digest differs/);
});

test("an incomplete scan is rejected", () => {
  const payload = validBasicPayload();
  payload.imageScanStatus.status = "IN_PROGRESS";
  assert.throws(() => validateEcrScanFindings(payload, expected), /successful state/);
});

test("a high-severity finding is rejected", () => {
  const payload = validBasicPayload([{ name: "CVE-example", severity: "HIGH" }]);
  assert.throws(() => validateEcrScanFindings(payload, expected), /high findings/);
});

test("unknown finding severity telemetry is rejected", () => {
  const payload = validBasicPayload([{ name: "CVE-example", severity: "SEVERE" }]);
  assert.throws(
    () => validateEcrScanFindings(payload, expected),
    /severity is missing or unsupported/,
  );
});

test("enhanced scanning cannot claim success without a completed inventory", () => {
  const payload = validEnhancedPayload();
  delete payload.imageScanFindings.imageScanCompletedAt;
  assert.throws(
    () => validateEcrScanFindings(payload, expected),
    /completion timestamp is missing/,
  );
});

test("summary severity counts cannot hide a high finding", () => {
  const payload = validEnhancedPayload();
  payload.imageScanFindings.findingSeverityCounts.HIGH = 1;
  assert.throws(() => validateEcrScanFindings(payload, expected), /high findings/);
});

test("an optional absent severity summary does not override the complete inventory", () => {
  const payload = validEnhancedPayload();
  delete payload.imageScanFindings.findingSeverityCounts;
  assert.equal(validateEcrScanFindings(payload, expected).total_findings, 0);
});

test("a paginated response is rejected until the CLI has aggregated every page", () => {
  const payload = validBasicPayload();
  payload.nextToken = "more-findings";
  assert.throws(() => validateEcrScanFindings(payload, expected), /response is truncated/);
});
