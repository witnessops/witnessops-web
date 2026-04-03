import { KBCallout } from "../components/KBCallout";
import { KBTable } from "../components/KBTable";
import { KBRelatedLinks } from "../components/KBRelatedLinks";
import Link from "next/link";

export default function OffsecTocContent() {
  return (
    <>
      <h2>Purpose</h2>
      <p>WitnessOps transforms security operations into promotable, regulatory-grade proof. Every page in this subsystem addresses a specific layer of that pipeline — from initial operator authorization through to evidence closure and receipt anchoring.</p>

      <h2>Reading Order</h2>
      <KBTable
        headers={["#", "Page", "Purpose", "Role"]}
        rows={[
          ["01", <Link href="/knowledge-base/witnessops-overview" style={{ color: "#00ff9c" }}>Platform Overview</Link>, "What WitnessOps is, what it produces, the four roles", "All"],
          ["02", <Link href="/knowledge-base/witnessops-operations" style={{ color: "#00ff9c" }}>Operations</Link>, "The six-step execution spine, hard stop conditions, prohibited actions", "Operator \u00b7 Defender"],
          ["03", <Link href="/knowledge-base/witnessops-evidence" style={{ color: "#00ff9c" }}>Evidence</Link>, "Minimum evidence standard, evidence by task type, failure conditions", "Operator \u00b7 Defender \u00b7 Approver"],
          ["04", <Link href="/knowledge-base/witnessops-governance" style={{ color: "#00ff9c" }}>Governance</Link>, "Authorization model, approval checklist, escalation triggers, regulatory timing", "Approver \u00b7 Manager"],
          ["05", <Link href="/knowledge-base/witnessops-runbooks" style={{ color: "#00ff9c" }}>Runbooks</Link>, "Standardized execution paths by operation type", "Operator \u00b7 Defender"],
          ["06", <Link href="/knowledge-base/witnessops-receipt-spec" style={{ color: "#00ff9c" }}>Receipt Spec</Link>, "Required fields, validation rules, promotion block conditions", "Operator \u00b7 Integration Author"],
          ["07", <Link href="/knowledge-base/runner-loop" style={{ color: "#00ff9c" }}>Full Runner Loop</Link>, "Complete lifecycle: QIN \u2192 PV \u2192 WV \u2192 QV \u2192 PUB \u2192 Return", "All"],
        ]}
      />

      <h2>Roles</h2>
      <KBTable
        headers={["Role", "Primary Pages", "Primary Output"]}
        rows={[
          ["New Operator", "Overview, Operations, Runbooks, Evidence", "PV evidence bundle"],
          ["Defender", "Operations, Evidence, Governance", "Triage record + escalation decision"],
          ["Manager / Approver", "Governance, Evidence, Receipt Spec", "Authorization record"],
          ["Integration Author", "Receipt Spec, Runbooks, Runner Loop", "Documented integration + evidence spec"],
        ]}
      />

      <h2>Evidence Grades Produced</h2>
      <KBTable
        headers={["Grade", "Produced When", "Suitable For"]}
        rows={[
          ["PV", "Operator completes execution with full evidence", "Internal review, baseline record"],
          ["WV", "Independent witness signs the PV chain", "Cross-team handoff, escalation record"],
          ["QV", "Regulatory mapping satisfied, hash anchored", "Regulatory submission, contractual proof"],
          ["PUB", "Merkle anchor published, private state removed", "External auditability, protocol-level proof"],
        ]}
      />

      <KBCallout variant="go" label="Start Here">
        <p>New to WitnessOps? Read Platform Overview → Operations → Evidence in that order. Then select the runbook that matches your task type.</p>
      </KBCallout>

      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/witnessops-overview", label: "Platform Overview" },
          { href: "/knowledge-base/runner-loop", label: "Full Runner Loop" },
          { href: "/knowledge-base/systems-index", label: "Systems Index" },
          { href: "/runner-loop", label: "Standalone Diagram", external: true },
        ]}
      />
    </>
  );
}
