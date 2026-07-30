import type { Metadata } from "next";
import { getCanonicalAlternates } from "@witnessops/config";
import { OffsecSuiteSample } from "@/components/marketing/offsec-suite-sample";

const path = "/review/sample-cases/access-removed-proof";

export const metadata: Metadata = {
  title: "Sample — Access removed proof (method)",
  description:
    "Synthetic access-removal package sample: sanitised before/after observations for one named event. Method sample only — not a public product card, not universal access-elimination.",
  alternates: getCanonicalAlternates("witnessops", path),
  openGraph: {
    title: "Sample — Access removed proof | WitnessOps",
    description:
      "Method sample for one named access-removal event. Not a product card and not proof that every shadow path is gone.",
    siteName: "WitnessOps",
    type: "website",
  },
};

export default function AccessRemovedProofSamplePage() {
  return (
    <OffsecSuiteSample
      title="Access removed proof"
      productId="OFFSEC-ACCESS-REMOVED"
      runId="pr_access_removed_demo_20260711130000"
      situation="Situation: prove one named access-removal event with sanitised before/after observations — without claiming every shadow path is gone or that a credential can never still be used."
      bannerNote="Synthetic method sample from the OffSec suite. Not a public buyer product card on the catalogue. Not live customer evidence, not access mutation, and not universal access-elimination."
      methodOnly
      sampleBase="/samples/offsec-access-removed"
      packageDir="access-removed-proof-pr_access_removed_demo_20260711130000"
      proofpackName="proofpack-pr_access_removed_demo_20260711130000.proofpack"
      walkthrough={[
        [
          "Read the walkthrough",
          "Open BUYER_WALKTHROUGH.md for the inspection order of this synthetic access-removal package.",
        ],
        [
          "Compare before and after",
          "Inspect sanitised before/after observations for the admitted opaque subjects and access paths.",
        ],
        [
          "Read findings",
          "Findings name remaining or unresolved scope — not that every possible path was discovered.",
        ],
        [
          "Stay inside the boundary",
          "This sample does not revoke access, validate credentials, or prove compromise absence.",
        ],
      ]}
      deliverables={[
        "sanitised before/after observations for one named event",
        "findings for remaining or unresolved scope",
        "receipt, evidence manifest, and hash sidecars",
        "buyer walkthrough and offline verification path",
      ]}
      boundaries={[
        "No access mutation, credential validation, secrets, or universal access-elimination claim.",
        "Not a public catalogue product card — method/example only.",
        "Not a compromise claim or compliance certification.",
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
      offlineVerifyHint="Offline product verifier path: witnessops-access-removed verify with the proofpack ZIP, detached signature, and separately obtained trust registries. Require status: valid for named checks only."
    />
  );
}
