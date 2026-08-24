#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const COMPLETE = "COMPLETE";
const ALLOWED_SEVERITIES = new Set([
  "INFORMATIONAL",
  "UNDEFINED",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validateEcrScanFindings(payload, expected) {
  assert(isRecord(payload), "ECR scan response must be an object");
  assert(expected.repository === "witnessops-web", "ECR repository expectation differs");
  assert(/^sha256:[0-9a-f]{64}$/.test(expected.imageDigest), "ECR image digest is invalid");
  assert(payload.repositoryName === expected.repository, "ECR scan repository differs");
  assert(isRecord(payload.imageId), "ECR scan image identity is missing");
  assert(payload.imageId.imageDigest === expected.imageDigest, "ECR scan image digest differs");
  assert(isRecord(payload.imageScanStatus), "ECR scan status telemetry is missing");
  assert(payload.imageScanStatus.status === COMPLETE, "ECR scan is not complete");
  assert(isRecord(payload.imageScanFindings), "ECR scan findings telemetry is missing");
  assert(
    Object.hasOwn(payload.imageScanFindings, "findings") &&
      Array.isArray(payload.imageScanFindings.findings),
    "ECR scan findings inventory is missing",
  );

  const findings = payload.imageScanFindings.findings;
  for (const finding of findings) {
    assert(isRecord(finding), "ECR scan finding must be an object");
    assert(
      typeof finding.severity === "string" && ALLOWED_SEVERITIES.has(finding.severity),
      "ECR scan finding severity is missing or unsupported",
    );
  }

  const criticalFindings = findings.filter((finding) => finding.severity === "CRITICAL").length;
  const highFindings = findings.filter((finding) => finding.severity === "HIGH").length;
  assert(criticalFindings === 0, "ECR scan contains critical findings");
  assert(highFindings === 0, "ECR scan contains high findings");

  return {
    schema_version: 1,
    repository: expected.repository,
    image_digest: expected.imageDigest,
    scan_status: COMPLETE,
    total_findings: findings.length,
    critical_findings: criticalFindings,
    high_findings: highFindings,
  };
}

function parseArguments(values) {
  const names = new Set(["--scan", "--repository", "--image-digest", "--output"]);
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const name = values[index];
    const value = values[index + 1];
    assert(names.has(name) && value && !result[name], `unsupported or incomplete argument ${name ?? ""}`);
    result[name] = value;
  }
  assert(Object.keys(result).length === names.size, "ECR scan validation arguments are incomplete");
  return result;
}

function main() {
  const args = parseArguments(process.argv.slice(2));
  const payload = JSON.parse(readFileSync(args["--scan"], "utf8"));
  const summary = validateEcrScanFindings(payload, {
    repository: args["--repository"],
    imageDigest: args["--image-digest"],
  });
  writeFileSync(args["--output"], `${JSON.stringify(summary, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  process.stdout.write("AWS_ECR_SCAN_FINDINGS_OK\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
