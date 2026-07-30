import type { Metadata } from "next";
import { getCanonicalAlternates } from "@witnessops/config";
import { OffsecSuiteSample } from "@/components/marketing/offsec-suite-sample";

const path = "/review/sample-cases/custody-wallet-ops-review";

export const metadata: Metadata = {
  title: "Sample — Custody / wallet-ops review",
  description:
    "Synthetic custody and wallet-ops control review sample with sanitised observations and hard boundaries. Not live customer evidence; no keys, balances, or fund movement.",
  alternates: getCanonicalAlternates("witnessops", path),
  openGraph: {
    title: "Sample — Custody / wallet-ops review | WitnessOps",
    description:
      "Inspect a synthetic custody control package. No keys, balances, fund movement, or solvency claim.",
    siteName: "WitnessOps",
    type: "website",
  },
};

export default function CustodyWalletOpsSamplePage() {
  return (
    <OffsecSuiteSample
      title="Custody / wallet-ops review"
      productId="OFFSEC-CUSTODY-OPS"
      runId="pr_custody_demo_20260711130000"
      situation="Situation: a team needs a proof-backed review of custody or wallet-operations controls using sanitised observations only — without WitnessOps touching funds or secrets."
      bannerNote="Synthetic public sample from the OffSec suite. Sanitised fixture observations only. Not live customer evidence. No keys, seed phrases, balances, fund movement, custody of funds, or solvency claim."
      catalogHref="/catalog/offsec-custody-ops"
      sampleBase="/samples/offsec-custody-ops"
      packageDir="custody-review-pr_custody_demo_20260711130000"
      proofpackName="proofpack-pr_custody_demo_20260711130000.zip"
      walkthrough={[
        [
          "Read the walkthrough",
          "Start with BUYER_WALKTHROUGH.md for the inspection order of this synthetic package.",
        ],
        [
          "Inspect observations",
          "Review sanitised control observations and completeness notes — opaque references only.",
        ],
        [
          "Separate supported claims",
          "Findings name what the package supports vs what remains outside scope or unresolved.",
        ],
        [
          "Stay inside the boundary",
          "This package never includes keys, balances, or fund movement. valid is not a solvency or security grade.",
        ],
      ]}
      deliverables={[
        "sanitised posture for the admitted control surface",
        "completeness notes on what was supplied",
        "findings: supported claims vs gaps",
        "receipt, evidence manifest, and hash sidecars",
        "buyer walkthrough and offline verification path",
      ]}
      boundaries={[
        "No keys, seed phrases, balances, fund movement, taking custody, or solvency claim.",
        "Not an exchange service or compliance certification.",
        "Synthetic trust keys only — not production signing custody.",
      ]}
      inspectFiles={[
        "BUYER_WALKTHROUGH.md",
        "receipt.json",
        "evidence_manifest.json",
        "findings.json",
        "report.md",
        "verification_result.json",
      ]}
      offlineVerifyHint="Offline product verifier path: witnessops-custody-ops verify with the proofpack ZIP, detached signature, and separately obtained trust registries (including customer-authority trust when named). Require status: valid for named checks only."
    />
  );
}
