import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import test from "node:test";

import { HOMEPAGE_SYNTHETIC_PREVIEW } from "./homepage-synthetic-preview";

const sampleRoot = resolve(
  __dirname,
  "../../../public/samples/offsec-external-exposure",
);
const findings = JSON.parse(
  readFileSync(resolve(sampleRoot, "findings.json"), "utf8"),
) as {
  findings: Array<{
    id: string;
    title: string;
    priority: string;
    observed_condition: string;
    evidence_refs: string[];
    impact: string;
    remediation: string;
    retest: string;
  }>;
};
const evidenceRegister = JSON.parse(
  readFileSync(resolve(sampleRoot, "evidence-register.json"), "utf8"),
) as {
  evidence: Array<{ id: string; path: string; sha256: string }>;
};

test("homepage preview preserves the published F-003 to E-003 linkage", () => {
  const finding = findings.findings.find(
    (candidate) => candidate.id === HOMEPAGE_SYNTHETIC_PREVIEW.findingId,
  );
  const evidence = evidenceRegister.evidence.find(
    (candidate) => candidate.id === HOMEPAGE_SYNTHETIC_PREVIEW.evidenceId,
  );

  assert.ok(finding);
  assert.ok(evidence);
  assert.equal(finding.id, "F-003");
  assert.equal(finding.priority, HOMEPAGE_SYNTHETIC_PREVIEW.priority);
  assert.deepEqual(finding.evidence_refs, [HOMEPAGE_SYNTHETIC_PREVIEW.evidenceId]);
  assert.equal(basename(evidence.path), HOMEPAGE_SYNTHETIC_PREVIEW.evidenceArtifact);
  assert.equal(evidence.sha256, HOMEPAGE_SYNTHETIC_PREVIEW.evidenceSha256);

  const english = HOMEPAGE_SYNTHETIC_PREVIEW.localized.en;
  assert.equal(english.title, finding.title);
  assert.equal(english.observed, finding.observed_condition);
  assert.equal(english.remediation, finding.remediation);
});

test("retained Public Exposure Review preview contract names only published package artifacts", () => {
  assert.equal(
    HOMEPAGE_SYNTHETIC_PREVIEW.sampleHref,
    "/review/sample-cases/external-exposure-assessment",
  );

  for (const artifact of HOMEPAGE_SYNTHETIC_PREVIEW.packageArtifacts) {
    assert.doesNotThrow(() => readFileSync(resolve(sampleRoot, artifact.path)));
  }

  const homepageSource = readFileSync(resolve(__dirname, "buyer-homepage.tsx"), "utf8");
  assert.doesNotMatch(homepageSource, /HOMEPAGE_SYNTHETIC_PREVIEW/);
  assert.doesNotMatch(homepageSource, /data-home-synthetic-preview/);
  assert.doesNotMatch(homepageSource, /data-home-evidence/);
  assert.match(homepageSource, /\/review\/sample-cases\/ai-agent-action-proof-run/);
});
