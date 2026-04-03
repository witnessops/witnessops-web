import { KBCallout } from "../components/KBCallout";
import { KBTable } from "../components/KBTable";
import { KBGuardrail } from "../components/KBGuardrail";
import { KBRelatedLinks } from "../components/KBRelatedLinks";
import Link from "next/link";

export default function OffsecEvidenceContent() {
  return (
    <>
      <KBGuardrail>
        <p>This page defines evidence standards. It does not assert that any operation is compliant with a regulatory framework. Compliance determinations remain external. See <Link href="/knowledge-base/evidence-guardrails" style={{ color: "#ffaa00", cursor: "pointer" }}>Evidence Guardrails</Link> for the full trust boundary declaration.</p>
      </KBGuardrail>

      <h2>Minimum Standard</h2>
      <p>Every completed operation must produce evidence that answers five questions for someone who was not present:</p>
      <ul>
        <li>What was the target or artifact?</li>
        <li>When was it reviewed?</li>
        <li>What method was used?</li>
        <li>What was observed?</li>
        <li>What conclusion was reached?</li>
      </ul>

      <KBCallout variant="stop" label="Evidence Failure Conditions">
        <p>Do not close if: core artifact not preserved &middot; target not clearly identified &middot; conclusion depends on memory &middot; rationale not written down &middot; next reviewer would need to repeat your work from scratch.</p>
      </KBCallout>

      <h2>Evidence by Task Type</h2>
      <KBTable
        headers={["Task Type", "Required Evidence"]}
        rows={[
          ["Phishing triage", "Message / ID \u00b7 sender details \u00b7 subject \u00b7 links / attachments \u00b7 user interaction \u00b7 classification + rationale"],
          ["Suspicious login", "Account \u00b7 alert time \u00b7 source details \u00b7 access success \u00b7 behavioral match \u00b7 containment action"],
          ["Operational testing", "Target \u00b7 objective \u00b7 steps performed \u00b7 command context \u00b7 outputs \u00b7 success / fail / inconclusive verdict"],
          ["Escalation", "Escalation trigger \u00b7 known facts \u00b7 risk introduced \u00b7 decision needed"],
        ]}
      />

      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/witnessops-receipt-spec", label: "Receipt Spec" },
          { href: "/knowledge-base/witnessops-governance", label: "Governance" },
        ]}
      />
    </>
  );
}
