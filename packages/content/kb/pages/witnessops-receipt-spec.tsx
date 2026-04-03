import { KBCallout } from "../components/KBCallout";
import { KBTable } from "../components/KBTable";
import { KBGuardrail } from "../components/KBGuardrail";
import { KBRelatedLinks } from "../components/KBRelatedLinks";
import Link from "next/link";

export default function OffsecReceiptSpecContent() {
  return (
    <>
      <KBGuardrail>
        <p>Receipt fields defined here describe what WitnessOps emits. They do not assert that a receipt constitutes proof of regulatory compliance. Field completion supports — it does not determine — whether an auditor can establish traceable governed execution. See <Link href="/knowledge-base/evidence-guardrails" style={{ color: "#ffaa00", cursor: "pointer" }}>Evidence Guardrails</Link>.</p>
      </KBGuardrail>

      <h2>Receipt Structure</h2>
      <KBTable
        headers={["Field", "Type", "Required", "Description"]}
        rows={[
          ["operation_id", "UUID", "Always", "Unique identifier for this operation"],
          ["operator_id", "String", "Always", "Identity of the executing operator"],
          ["target", "String", "Always", "Exact target \u2014 no ambiguity permitted"],
          ["objective", "String", "Always", "One-sentence objective statement"],
          ["scope_ref", "String", "Always", "Reference to authorization document"],
          ["steps[]", "Array", "Always", "Ordered array of steps with timestamps"],
          ["evidence[]", "Array", "Always", "Hashed references to evidence artifacts"],
          ["conclusion", "String", "Always", "Verdict with rationale"],
          ["escalated", "Boolean", "Always", "Whether escalation was triggered"],
          ["anchored_at", "RFC-3161 timestamp", "On close", "Cryptographic timestamp of receipt"],
          ["hash", "BLAKE3", "On close", "Hash of the complete receipt object"],
        ]}
      />

      <h2>Validation Rules</h2>
      <ul>
        <li>No field may be empty or null at close time</li>
        <li>Steps must be in chronological order</li>
        <li>Evidence hashes must match the files at path</li>
        <li>Conclusion must reference at least one evidence item</li>
        <li>Escalation flag must match the operation record</li>
      </ul>

      <KBCallout variant="stop" label="Promotion Block">
        <p>A receipt that fails validation cannot be promoted above L2 (PV). Promotion requires a valid, complete, anchored receipt. There are no exceptions.</p>
      </KBCallout>

      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/core-lawchain", label: "LAWCHAIN Protocol" },
          { href: "/knowledge-base/witnessops-evidence", label: "Evidence" },
          { href: "/knowledge-base/qin-trust-ladder", label: "Trust Promotion Ladder" },
        ]}
      />
    </>
  );
}
