import { KBCallout } from "../components/KBCallout";
import { KBTable } from "../components/KBTable";
import { KBRelatedLinks } from "../components/KBRelatedLinks";

export default function CoreProofBundleContent() {
  return (
    <>
      <h2>Definition</h2>
      <p>A VaultMesh Proof Bundle (VPB) is a self-contained, cryptographically anchored record of what happened, who authorized it, what evidence was collected, and what conclusion was reached. It is not a report. It is not a summary. It is an executable memory artifact.</p>

      <h2>Required Components</h2>
      <KBTable
        headers={["Component", "Content", "Required"]}
        rows={[
          ["manifest.json", "Target, objective, scope declaration, operator identity", "Always"],
          ["receipt.json", "Steps performed, timestamps, method references", "Always"],
          ["hash-manifest.txt", "BLAKE3 hashes of all evidence artifacts", "Always"],
          ["campaign-receipt.json", "Aggregated proof chain across a multi-step operation", "If multi-step"],
          ["\u03C6 seal", "Promotion state indicator (PV / WV / QV / PUB)", "On promotion"],
        ]}
      />

      <h2>Commercial Form</h2>
      <p>The AI Governance Proof Pack delivers a QV-grade VPB within 7 days. Scope: one AI system or workflow, against DORA / EU AI Act requirements. Deliverable is a submission-ready bundle, not a consultancy report.</p>

      <KBCallout variant="go" label="Commercial Offer">
        <p>AI Governance Proof Pack — \u20AC7,500 — 7-day delivery — QV-grade VPB — EU regulatory ready</p>
      </KBCallout>

      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/core-lawchain", label: "LAWCHAIN Protocol" },
          { href: "/knowledge-base/qin-trust-ladder", label: "Trust Promotion Ladder" },
          { href: "/knowledge-base/offsec-receipt-spec", label: "Receipt Spec" },
        ]}
      />
    </>
  );
}
