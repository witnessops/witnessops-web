import { KBCallout } from "../components/KBCallout";
import { KBTable } from "../components/KBTable";
import { KBGuardrail } from "../components/KBGuardrail";
import { KBRelatedLinks } from "../components/KBRelatedLinks";
import Link from "next/link";

export default function OffsecGovernanceContent() {
  return (
    <>
      <KBGuardrail>
        <p>This page maps WitnessOps artifacts to regulatory timing requirements. It does not assert that any operation is compliant with DORA, NIS2, or the EU AI Act. Compliance determinations remain external. See <Link href="/knowledge-base/evidence-guardrails" style={{ color: "#ffaa00", cursor: "pointer" }}>Evidence Guardrails</Link> for the full trust boundary declaration.</p>
      </KBGuardrail>

      <h2>Purpose</h2>
      <p>Governance provides the decision architecture that ensures every security operation, investigation, action, and escalation adheres to authorization boundaries and produces evidence suitable for regulatory-grade verification. It sits above QIN{"'"}s scope validation layer and below the regulatory anchoring layer.</p>

      <h2>Core Responsibilities</h2>
      <ul>
        <li>Define explicit authorization boundaries for all WitnessOps operations</li>
        <li>Ensure no operator acts under implied permission</li>
        <li>Establish escalation rules and boundary triggers</li>
        <li>Map operational timing envelopes to regulatory timing obligations</li>
        <li>Ensure evidence meets QV-grade requirements before regulatory submission</li>
      </ul>

      <h2>Authorization Model</h2>
      <p>All WitnessOps work requires explicit authorization. Implicit authorization — assumed from role, past approval, or urgency — is not authorization. If you cannot state who authorized the work and when, you do not have authorization.</p>

      <h2>Approval Checklist</h2>
      <p>Approve when all of the following are true:</p>
      <ul>
        <li>Objective is legitimate and clearly stated</li>
        <li>Target is confirmed in scope</li>
        <li>Planned activity matches the stated objective</li>
        <li>Safety controls are in place</li>
        <li>Escalation conditions are defined</li>
        <li>Evidence expectations are clear</li>
      </ul>

      <h2>Escalation Triggers</h2>
      <p>Escalate immediately if any of the following occur:</p>
      <ul>
        <li>Scope becomes unclear</li>
        <li>Target is more sensitive than expected</li>
        <li>Privileged or sensitive accounts are involved</li>
        <li>Multiple users or systems may be affected</li>
        <li>Next action is intrusive or difficult to reverse</li>
        <li>Legal, privacy, or compliance concerns appear</li>
        <li>You cannot explain why the next action is safe</li>
      </ul>

      <KBCallout variant="warn" label="Escalation Is Not Failure">
        <p>Reaching an escalation boundary is a success state. The system is working. Continuing past a boundary without approval is the failure mode.</p>
      </KBCallout>

      <h2>Regulatory Timing Alignment</h2>

      <KBCallout variant="warn" label="Invariant">
        <p>No operator, manager, or automation layer may override a regulatory timing requirement. Governance aligns internal timing envelopes to external deadlines — not the reverse.</p>
      </KBCallout>

      <KBTable
        headers={["Regulation", "Requirement", "VaultMesh Timing Envelope", "Regulatory Deadline"]}
        rows={[
          ["DORA", "Initial ICT incident notification", "WV \u2192 QV (T\u2082 \u2192 T\u2084)", "Within 4 hours of classification; no later than 24 hours from detection"],
          ["DORA", "Intermediate incident report", "QV Anchoring (T\u2084)", "Within 72 hours"],
          ["DORA", "Final incident report", "PUB Batch / Proof Bundle Close (T\u2085)", "Within 1 month"],
          ["EU AI Act", "Retention of high-risk system documentation", "QV \u2192 PUB Retention Window", "Minimum 10 years after deployment"],
          ["NIS2", "Early warning (significant cyber incident)", "QV Anchoring (T\u2084)", "Within 24 hours of awareness"],
          ["NIS2", "Detailed incident notification", "PUB Batch or Follow-Up (T\u2085)", "Within 72 hours"],
          ["NIS2", "Final conclusive incident report", "Full Proof Bundle Closure", "Within 30 days"],
        ]}
      />

      <KBCallout variant="go" label="Operational Guarantee">
        <p>Every WitnessOps operation is timestamped, anchored, and promotable through QV within the timing windows required for regulatory action. No operation can fall outside compliance without explicit and visible contradiction in the proof chain.</p>
      </KBCallout>

      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/witnessops-evidence", label: "Evidence" },
          { href: "/knowledge-base/witnessops-runbooks", label: "Runbooks" },
          { href: "/knowledge-base/core-regulatory", label: "Regulatory Layer" },
          { href: "/knowledge-base/core-proof-bundle", label: "Proof Bundle" },
        ]}
      />
    </>
  );
}
