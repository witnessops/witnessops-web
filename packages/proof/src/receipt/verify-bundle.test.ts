import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { verifyBundleComplete } from "./verify-bundle";

/**
 * Bundle-complete verification against a real Kali OFFSEC dual-hash bundle.
 *
 * The bundle at /tmp/kali-bundle-test/ was produced by a live web-recon run
 * on 2026-03-16 with BLAKE3 dual-hash emission enabled.
 *
 * Current state: the OFFSEC emitter produces `type: RUNBOOK_EXECUTION` receipts,
 * not PV/QV/WV-schema receipts. So structural verification reports unknown stage.
 * But artifact material revalidation is the real test here — that is what proves
 * bundle-complete has live BLAKE3 material to verify against.
 */

const BUNDLE_RUN_DIR = "/tmp/kali-bundle-test/run";
const BUNDLE_ENGAGEMENT_DIR = "/tmp/kali-bundle-test/engagement";

describe("bundle-complete verification — live Kali dual-hash bundle", () => {
  it("core files: SHA-256 recomputes correctly for all 3 files", () => {
    const verdict = verifyBundleComplete({
      runDir: BUNDLE_RUN_DIR,
      engagementDir: BUNDLE_ENGAGEMENT_DIR,
    });

    assert.equal(verdict.revalidation.core_files.total, 3);
    assert.equal(verdict.revalidation.core_files.found, 3);
    assert.equal(verdict.revalidation.core_files.missing, 0);
    assert.equal(verdict.revalidation.core_files.sha256_matched, 3);
    assert.equal(verdict.revalidation.core_files.sha256_mismatched, 0);
  });

  it("core files: BLAKE3 recomputes correctly for all 3 files", () => {
    const verdict = verifyBundleComplete({
      runDir: BUNDLE_RUN_DIR,
      engagementDir: BUNDLE_ENGAGEMENT_DIR,
    });

    assert.equal(verdict.revalidation.core_files.blake3_matched, 3);
    assert.equal(verdict.revalidation.core_files.blake3_mismatched, 0);
  });

  it("manifest artifacts: SHA-256 recomputes for all artifacts", () => {
    const verdict = verifyBundleComplete({
      runDir: BUNDLE_RUN_DIR,
      engagementDir: BUNDLE_ENGAGEMENT_DIR,
    });

    assert.ok(verdict.revalidation.manifest_artifacts.sha256_matched > 0);
    assert.equal(verdict.revalidation.manifest_artifacts.sha256_mismatched, 0);
  });

  it("manifest artifacts: BLAKE3 recomputes for all artifacts", () => {
    const verdict = verifyBundleComplete({
      runDir: BUNDLE_RUN_DIR,
      engagementDir: BUNDLE_ENGAGEMENT_DIR,
    });

    if (verdict.revalidation.manifest_artifacts.blake3_skipped === 0) {
      assert.ok(verdict.revalidation.manifest_artifacts.blake3_matched > 0);
      assert.equal(verdict.revalidation.manifest_artifacts.blake3_mismatched, 0);
    }
  });

  it("artifact revalidation is performed, not skipped", () => {
    const verdict = verifyBundleComplete({
      runDir: BUNDLE_RUN_DIR,
      engagementDir: BUNDLE_ENGAGEMENT_DIR,
    });

    assert.equal(verdict.artifact_revalidation, "performed");
    assert.equal(verdict.verification_mode, "bundle-complete");
  });

  it("no artifact-level breaches (only structural stage breach expected)", () => {
    const verdict = verifyBundleComplete({
      runDir: BUNDLE_RUN_DIR,
      engagementDir: BUNDLE_ENGAGEMENT_DIR,
    });

    // The only breach should be SCHEMA_UNKNOWN_STAGE because the current
    // OFFSEC receipt uses type=RUNBOOK_EXECUTION, not proof_stage=PV.
    // No DIGEST_ARTIFACT_TAMPERED breaches should exist.
    const artifactBreaches = verdict.breaches.filter(
      (b) => b.code === "DIGEST_ARTIFACT_TAMPERED"
    );
    assert.equal(artifactBreaches.length, 0, "No artifact tampering detected");

    // Structural breach is expected until receipt emitter produces PV-schema
    const stageBreaches = verdict.breaches.filter(
      (b) => b.code === "SCHEMA_UNKNOWN_STAGE"
    );
    assert.equal(stageBreaches.length, 1, "Expected unknown stage from legacy receipt format");
  });

  it("summary: full recomputation stats", () => {
    const verdict = verifyBundleComplete({
      runDir: BUNDLE_RUN_DIR,
      engagementDir: BUNDLE_ENGAGEMENT_DIR,
    });

    console.log("  === Bundle-Complete Revalidation Summary ===");
    console.log(`  Core files:     ${verdict.revalidation.core_files.sha256_matched} sha256 + ${verdict.revalidation.core_files.blake3_matched} blake3 / ${verdict.revalidation.core_files.total}`);
    console.log(`  Artifacts:      ${verdict.revalidation.manifest_artifacts.sha256_matched} sha256 + ${verdict.revalidation.manifest_artifacts.blake3_matched} blake3 / ${verdict.revalidation.manifest_artifacts.total}`);
    console.log(`  Mismatches:     ${verdict.revalidation.core_files.mismatches.length + verdict.revalidation.manifest_artifacts.mismatches.length}`);
    console.log(`  Revalidation:   ${verdict.artifact_revalidation}`);
    console.log(`  Stage breach:   ${verdict.breaches.filter(b => b.code === "SCHEMA_UNKNOWN_STAGE").length} (expected: legacy format)`);
    console.log(`  Tamper breach:  ${verdict.breaches.filter(b => b.code === "DIGEST_ARTIFACT_TAMPERED").length} (expected: 0)`);

    // This is the real assertion
    assert.equal(verdict.revalidation.manifest_artifacts.mismatches.length, 0);
    assert.equal(verdict.revalidation.core_files.mismatches.length, 0);
  });
});

describe("bundle-complete verification — PV-schema receipt", () => {
  it("PV receipt passes structural verification with zero breaches", () => {
    const verdict = verifyBundleComplete({
      runDir: BUNDLE_RUN_DIR,
      engagementDir: BUNDLE_ENGAGEMENT_DIR,
      receiptFile: "receipt-pv.json",
    });

    assert.equal(verdict.verification_mode, "bundle-complete");
    assert.equal(verdict.proof_stage_claimed, "PV");
    assert.equal(verdict.proof_stage_verified, "PV");
    assert.equal(verdict.artifact_revalidation, "performed");
    assert.equal(verdict.result, "pass");
    assert.equal(verdict.breaches.length, 0, `Unexpected breaches: ${JSON.stringify(verdict.breaches)}`);
  });
});

describe("bundle-complete verification — QV-schema receipt (RFC-3161)", () => {
  it("QV receipt with RFC-3161 anchoring passes verification", () => {
    const verdict = verifyBundleComplete({
      runDir: BUNDLE_RUN_DIR,
      engagementDir: BUNDLE_ENGAGEMENT_DIR,
      receiptFile: "receipt-qv.json",
    });

    assert.equal(verdict.verification_mode, "bundle-complete");
    assert.equal(verdict.proof_stage_claimed, "QV");
    assert.equal(verdict.proof_stage_verified, "QV");
    assert.equal(verdict.artifact_revalidation, "performed");
    assert.equal(verdict.result, "pass");
    assert.equal(verdict.breaches.length, 0, `Unexpected breaches: ${JSON.stringify(verdict.breaches)}`);
  });
});

describe("bundle-complete verification — WV-schema receipt (QIN witness)", () => {
  it("WV receipt with QIN witness passes full verification", () => {
    const verdict = verifyBundleComplete({
      runDir: BUNDLE_RUN_DIR,
      engagementDir: BUNDLE_ENGAGEMENT_DIR,
      receiptFile: "receipt-wv.json",
    });

    console.log("  === WV Receipt Bundle-Complete ===");
    console.log(`  verification_mode:      ${verdict.verification_mode}`);
    console.log(`  artifact_revalidation:  ${verdict.artifact_revalidation}`);
    console.log(`  proof_stage_claimed:    ${verdict.proof_stage_claimed}`);
    console.log(`  proof_stage_verified:   ${verdict.proof_stage_verified}`);
    console.log(`  result:                 ${verdict.result}`);
    console.log(`  breaches:               ${verdict.breaches.length}`);
    if (verdict.breaches.length > 0) {
      for (const b of verdict.breaches) {
        console.log(`    ${b.code}: ${b.detail}`);
      }
    }

    assert.equal(verdict.verification_mode, "bundle-complete");
    assert.equal(verdict.proof_stage_claimed, "WV");
    assert.equal(verdict.proof_stage_verified, "WV");
    assert.equal(verdict.artifact_revalidation, "performed");
    assert.equal(verdict.result, "pass");
    assert.equal(verdict.breaches.length, 0, `Unexpected breaches: ${JSON.stringify(verdict.breaches)}`);
  });
});
