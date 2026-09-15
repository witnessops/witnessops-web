import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function validateTrivyImage(report, configDigest) {
  assert.match(configDigest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(report.SchemaVersion, 2);
  assert.equal(report.ArtifactType, "container_image");
  assert.equal(report.Metadata?.ImageID, configDigest, "scanned image config differs");
  assert.equal(report.Metadata?.ImageConfig?.architecture, "amd64");
  assert.equal(report.Metadata?.ImageConfig?.os, "linux");
  assert.ok(Array.isArray(report.Results) && report.Results.length > 0, "missing scan inventory");
  assert.ok(report.Results.some((r) => r.Class === "os-pkgs"), "missing OS scan");
  assert.ok(report.Results.some((r) => r.Class === "lang-pkgs" && r.Type === "node-pkg"), "missing npm scan");
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
  for (const result of report.Results) {
    assert.ok(!result.MisconfSummary?.Failures, "unexpected scan failures");
    assert.ok(!result.ModifiedFindings?.length, "filtered findings are not permitted");
    assert.ok(result.Vulnerabilities === undefined || Array.isArray(result.Vulnerabilities));
    for (const finding of result.Vulnerabilities ?? []) {
      assert.ok(Object.hasOwn(counts, finding.Severity), "invalid severity");
      counts[finding.Severity]++;
    }
  }
  assert.equal(counts.CRITICAL, 0, "critical image vulnerabilities");
  assert.equal(counts.HIGH, 0, "high image vulnerabilities");
  return counts;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(validateTrivyImage(JSON.parse(readFileSync(process.argv[2], "utf8")), process.argv[3])));
}
