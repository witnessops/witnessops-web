import type { Metadata } from "next";
import { getCanonicalAlternates } from "@witnessops/config";
import { OffsecSuiteSample } from "@/components/marketing/offsec-suite-sample";

const path = "/review/sample-cases/launch-readiness-review";

export const metadata: Metadata = {
  title: "Sample — Launch readiness review",
  description:
    "Synthetic launch readiness sample: baseline vs candidate, drift, findings, and proofpack limits. Not live customer evidence and not launch approval.",
  alternates: getCanonicalAlternates("witnessops", path),
  openGraph: {
    title: "Sample — Launch readiness review | WitnessOps",
    description:
      "Inspect a synthetic before/after launch readiness package with drift and named limits.",
    siteName: "WitnessOps",
    type: "website",
  },
};

export default function LaunchReadinessSamplePage() {
  return (
    <OffsecSuiteSample
      title="Launch readiness review"
      productId="OFFSEC-LAUNCH-READY"
      runId="pr_lrr_20260711120000_df6bc5d205"
      situation="Situation: one launch host needs a before-and-after readiness picture against an approved baseline — drift, findings, and open decisions on the package, never automatic launch approval."
      bannerNote="Synthetic public sample from the OffSec suite. Deterministic fixture evidence only. Not a live customer launch review, not production verification, and not launch approval."
      catalogHref="/catalog/offsec-launch-ready"
      sampleBase="/samples/offsec-launch-ready"
      packageDir="launch-readiness-pr_lrr_20260711120000_df6bc5d205"
      proofpackName="proofpack-pr_lrr_20260711120000_df6bc5d205.proofpack"
      walkthrough={[
        [
          "Read the owner signal",
          "Open review-summary.json for the decision-facing summary of this synthetic run.",
        ],
        [
          "Inspect drift",
          "Read drift.json for admitted changes between baseline and candidate snapshots.",
        ],
        [
          "Read findings and report",
          "Use findings.json and report.md for posture notes and named limits.",
        ],
        [
          "Stay inside the boundary",
          "valid means package and verifier checks passed — not that the launch is secure, ready, or approved.",
        ],
      ]}
      deliverables={[
        "baseline and candidate snapshot relationship",
        "drift notes for admitted v1 changes",
        "findings and readiness report",
        "receipt, evidence manifest, and hash sidecars",
        "buyer walkthrough and offline verification path",
      ]}
      boundaries={[
        "No launch approval, security guarantee, remediation, or arbitrary cloud review.",
        "No compliance certification or continuous monitoring.",
        "Synthetic trust keys only — not production signing custody.",
      ]}
      inspectFiles={[
        "BUYER_WALKTHROUGH.md",
        "review-summary.json",
        "drift.json",
        "findings.json",
        "report.md",
        "receipt.json",
        "evidence_manifest.json",
        "verification_result.json",
      ]}
      offlineVerifyHint="Offline product verifier path: witnessops-launch-ready verify with the proofpack ZIP, detached signature, and a separately obtained trust registry. Require exit code 0 and status: valid for the named checks only."
    />
  );
}
