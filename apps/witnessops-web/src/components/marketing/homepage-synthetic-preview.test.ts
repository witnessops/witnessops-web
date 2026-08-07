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

test("homepage preview preserves the published F-002 to E-001 linkage", () => {
  const finding = findings.findings.find(
    (candidate) => candidate.id === HOMEPAGE_SYNTHETIC_PREVIEW.findingId,
  );
  const evidence = evidenceRegister.evidence.find(
    (candidate) => candidate.id === HOMEPAGE_SYNTHETIC_PREVIEW.evidenceId,
  );

  assert.ok(finding);
  assert.ok(evidence);
  assert.equal(finding.id, "F-002");
  assert.equal(finding.priority, HOMEPAGE_SYNTHETIC_PREVIEW.priority);
  assert.deepEqual(finding.evidence_refs, [HOMEPAGE_SYNTHETIC_PREVIEW.evidenceId]);
  assert.equal(basename(evidence.path), HOMEPAGE_SYNTHETIC_PREVIEW.evidenceArtifact);
  assert.equal(evidence.sha256, HOMEPAGE_SYNTHETIC_PREVIEW.evidenceSha256);

  const english = HOMEPAGE_SYNTHETIC_PREVIEW.localized.en;
  assert.equal(english.title, finding.title);
  assert.equal(english.observed, finding.observed_condition);
  assert.equal(english.impact, finding.impact);
  assert.equal(english.remediation, finding.remediation);
  assert.equal(english.retest, finding.retest);
});

test("homepage preview links to the full sample and names only published package artifacts", () => {
  assert.equal(
    HOMEPAGE_SYNTHETIC_PREVIEW.sampleHref,
    "/review/sample-cases/external-exposure-assessment",
  );

  for (const artifact of HOMEPAGE_SYNTHETIC_PREVIEW.packageArtifacts) {
    assert.doesNotThrow(() => readFileSync(resolve(sampleRoot, artifact.path)));
  }

  const homepageSource = readFileSync(resolve(__dirname, "buyer-homepage.tsx"), "utf8");
  const actionMarker = 'data-home-sample-action="finding-preview"';
  const actionMarkerIndex = homepageSource.indexOf(actionMarker);
  assert.notEqual(actionMarkerIndex, -1);
  const actionStart = homepageSource.lastIndexOf("<Link", actionMarkerIndex);
  const actionEnd = homepageSource.indexOf("</Link>", actionMarkerIndex);
  assert.notEqual(actionStart, -1);
  assert.notEqual(actionEnd, -1);
  const previewActionSource = homepageSource.slice(actionStart, actionEnd + "</Link>".length);
  assert.match(previewActionSource, /href=\{sampleHref\}/);
  assert.match(previewActionSource, /data-home-sample-action="finding-preview"/);
  assert.match(homepageSource, /data-home-synthetic-preview/);
  assert.match(homepageSource, /data-home-evidence/);
});
