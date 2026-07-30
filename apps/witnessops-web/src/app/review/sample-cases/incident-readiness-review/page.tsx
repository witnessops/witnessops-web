import type { Metadata } from "next";
import { getCanonicalAlternates } from "@witnessops/config";
import { OffsecSuiteSample } from "@/components/marketing/offsec-suite-sample";

const path = "/review/sample-cases/incident-readiness-review";

export const metadata: Metadata = {
  title: "Sample — Incident readiness review",
  description:
    "Synthetic incident readiness sample for one named scenario and environment. Not live incident response, not compromise attribution, not a 24/7 service.",
  alternates: getCanonicalAlternates("witnessops", path),
  openGraph: {
    title: "Sample — Incident readiness review | WitnessOps",
    description:
      "Inspect a synthetic readiness package for one named incident scenario — not live IR command.",
    siteName: "WitnessOps",
    type: "website",
  },
};

export default function IncidentReadinessSamplePage() {
  return (
    <OffsecSuiteSample
      title="Incident readiness review"
      productId="OFFSEC-INCIDENT-READY"
      runId="pr_incident_demo_20260711130000"
      situation="Situation: a team needs a bounded readiness record for one named incident class and environment — preparation, unknowns, and open decisions on the package before an event."
      bannerNote="Synthetic public sample from the OffSec suite. Not live incident response, not hack-back, not compromise, root-cause, or attribution evidence, and not a 24/7 service."
      catalogHref="/catalog/offsec-incident-ready"
      sampleBase="/samples/offsec-incident-ready"
      packageDir="incident-review-pr_incident_demo_20260711130000"
      proofpackName="proofpack-pr_incident_demo_20260711130000.proofpack"
      walkthrough={[
        [
          "Read the walkthrough",
          "Open BUYER_WALKTHROUGH.md for the inspection order of this synthetic readiness package.",
        ],
        [
          "Inspect readiness observations",
          "Review sanitised preparation observations against the admitted scenario and environment.",
        ],
        [
          "Separate unknowns",
          "Findings and open decisions stay distinct from management assertions.",
        ],
        [
          "Stay inside the boundary",
          "This is readiness packaging only — not live IR command or a guarantee of incident outcome.",
        ],
      ]}
      deliverables={[
        "sanitised readiness observations for the admitted scenario",
        "posture and findings against preparation questions",
        "unknowns, exclusions, and open decisions",
        "receipt, evidence manifest, and hash sidecars",
        "buyer walkthrough and offline verification path",
      ]}
      boundaries={[
        "No hack-back, exploitation, destructive testing, or live incident command.",
        "No compromise, root-cause, or attribution claim.",
        "Not a 24/7 service, compliance certification, or continuous monitoring.",
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
      offlineVerifyHint="Offline product verifier path: witnessops-incident-ready verify with the proofpack ZIP, detached signature, and separately obtained trust registries. Require status: valid for named checks only."
    />
  );
}
