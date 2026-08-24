import assert from "node:assert/strict";
import test from "node:test";

import { validateEcrScanFindings } from "./validate-ecr-scan-findings.mjs";

const expected = {
  repository: "witnessops-web",
  imageDigest: `sha256:${"a".repeat(64)}`,
};

function validPayload(findings = []) {
  return {
    registryId: "000000000000",
    repositoryName: expected.repository,
    imageId: {
      imageDigest: expected.imageDigest,
      imageTag: "source-commit",
    },
    imageScanStatus: { status: "COMPLETE", description: "The scan was completed successfully." },
    imageScanFindings: { findings },
  };
}

test("exact complete findings telemetry with no critical or high findings is accepted", () => {
  assert.deepEqual(validateEcrScanFindings(validPayload(), expected), {
    schema_version: 1,
    repository: expected.repository,
    image_digest: expected.imageDigest,
    scan_status: "COMPLETE",
    total_findings: 0,
    critical_findings: 0,
    high_findings: 0,
  });
});

test("missing findings inventory is rejected instead of treated as zero", () => {
  const payload = validPayload();
  delete payload.imageScanFindings.findings;
  assert.throws(
    () => validateEcrScanFindings(payload, expected),
    /findings inventory is missing/,
  );
});

test("a response for a different digest is rejected", () => {
  const payload = validPayload();
  payload.imageId.imageDigest = `sha256:${"b".repeat(64)}`;
  assert.throws(() => validateEcrScanFindings(payload, expected), /image digest differs/);
});

test("an incomplete scan is rejected", () => {
  const payload = validPayload();
  payload.imageScanStatus.status = "IN_PROGRESS";
  assert.throws(() => validateEcrScanFindings(payload, expected), /not complete/);
});

test("a high-severity finding is rejected", () => {
  const payload = validPayload([{ name: "CVE-example", severity: "HIGH" }]);
  assert.throws(() => validateEcrScanFindings(payload, expected), /high findings/);
});

test("unknown finding severity telemetry is rejected", () => {
  const payload = validPayload([{ name: "CVE-example", severity: "SEVERE" }]);
  assert.throws(
    () => validateEcrScanFindings(payload, expected),
    /severity is missing or unsupported/,
  );
});
