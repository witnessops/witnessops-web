import { KBCallout } from "../components/KBCallout";
import { KBTable } from "../components/KBTable";
import { KBRelatedLinks } from "../components/KBRelatedLinks";

export default function OffsecRunbooksContent() {
  return (
    <>
      <h2>Available Runbooks</h2>
      <KBTable
        headers={["Runbook", "Trigger", "Output"]}
        rows={[
          ["Phishing Investigation", "User reports suspicious message", "Classification + evidence bundle"],
          ["Suspicious Login Review", "Alert: anomalous authentication", "Risk assessment + containment record"],
          ["Account Takeover Assessment", "Suspected credential compromise", "Exposure scope + remediation steps"],
          ["Scope Validation", "Before any operational work", "Scope confirmation record"],
          ["Evidence Closure", "Before closing any task", "Complete evidence package"],
        ]}
      />

      <h2>Runbook Selection Rule</h2>
      <p>If a runbook exists for your task type, use it. Do not adapt a runbook informally — if the existing runbook does not fit, escalate to the Integration Author track to create a new one with proper documentation.</p>

      <KBCallout variant="default" label="Design Note">
        <p>Runbooks are not checklists. They are execution paths that produce evidence as a byproduct of correct execution. Following a runbook incorrectly still produces evidence — of the deviation.</p>
      </KBCallout>

      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/witnessops-operations", label: "Operations" },
          { href: "/knowledge-base/witnessops-evidence", label: "Evidence" },
          { href: "/knowledge-base/witnessops-receipt-spec", label: "Receipt Spec" },
        ]}
      />
    </>
  );
}
