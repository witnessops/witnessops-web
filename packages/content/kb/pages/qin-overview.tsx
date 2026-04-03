import { KBCallout } from "../components/KBCallout";
import { KBTable } from "../components/KBTable";
import { KBBadge } from "../components/KBBadge";
import { KBRelatedLinks } from "../components/KBRelatedLinks";

export default function QinOverviewContent() {
  return (
    <>
      <h2>Purpose</h2>
      <p>Qin is the operational AI layer sitting between raw human intent and cryptographically anchored output. It does not generate trust — it enforces the conditions under which trust can be generated.</p>
      <p>Every instruction that passes through Qin is subject to scope validation, authorization checks, and evidence capture. Qin neither executes nor approves work that cannot be later independently verified.</p>

      <KBCallout variant="go" label="Operational Status">
        <p>Qin is live on Azure West Europe. All proof generation workloads route through this node. Deployment receipts are anchored per session.</p>
      </KBCallout>

      <h2>Scope</h2>
      <ul>
        <li>Receive operator instructions within authorized scope</li>
        <li>Validate that actions are proportionate and authorized</li>
        <li>Route to appropriate execution layer (PV, WV, QV, PUB)</li>
        <li>Produce anchored evidence receipts on every operation</li>
        <li>Enforce escalation when scope boundaries are reached</li>
      </ul>

      <h2>What Qin Does Not Do</h2>
      <ul>
        <li>Does not self-authorize escalations</li>
        <li>Does not execute intrusive actions without explicit approval</li>
        <li>Does not close operations with incomplete evidence</li>
        <li>Does not accept instructions that would compromise the proof chain</li>
      </ul>

      <h2>Deployment</h2>
      <KBTable
        headers={["Parameter", "Value", "Status"]}
        rows={[
          ["Region", "Azure West Europe", <KBBadge variant="live">LIVE</KBBadge>],
          ["Mode", "Witness + Catalyst", <KBBadge variant="live">ACTIVE</KBBadge>],
          ["Proof anchoring", "Per session, RFC-3161", <KBBadge variant="live">LIVE</KBBadge>],
          ["Escalation handler", "Tem (Guardian layer)", <KBBadge variant="live">BOUND</KBBadge>],
        ]}
      />

      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/qin-trust-ladder", label: "Trust Promotion Ladder" },
          { href: "/knowledge-base/qin-operator-oath", label: "Operator Oath" },
          { href: "/knowledge-base/qin-layers", label: "Layer Reference" },
        ]}
      />
    </>
  );
}
