import { KBTable } from "../components/KBTable";
import { KBBadge } from "../components/KBBadge";
import { KBRelatedLinks } from "../components/KBRelatedLinks";

export default function CoreOrgansContent() {
  return (
    <>
      <h2>Organ Map</h2>
      <KBTable
        headers={["Organ", "Function", "Status"]}
        rows={[
          ["Governance", "Authorization chains, constitutional constraints, decision audit", <KBBadge variant="live">ACTIVE</KBBadge>],
          ["Automation", "Proof generation pipelines, runbook execution, receipt production", <KBBadge variant="live">ACTIVE</KBBadge>],
          ["Treasury", "Proof-Credits, economic anchoring, commercial proof packs", <KBBadge variant="amber">BUILDING</KBBadge>],
          ["Federation", "Multi-operator coordination, witness layer, cross-org trust", <KBBadge variant="draft">PLANNED</KBBadge>],
          ["\u03A8-Field", "Narrative integrity, human meaning layer, cultural continuity", <KBBadge variant="amber">BUILDING</KBBadge>],
          ["Infrastructure", "Hetzner/Azure/Akash, Tailscale mesh, self-hosted GitLab", <KBBadge variant="live">ACTIVE</KBBadge>],
        ]}
      />

      <h2>Interdependency Rule</h2>
      <p>No organ may operate in isolation. Every organ produces evidence consumed by at least one other organ. Governance authorizes what Automation executes. Automation produces what Treasury values. Treasury funds what Infrastructure runs. Infrastructure hosts what \u03A8-Field remembers.</p>

      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/core-overview", label: "Architecture" },
          { href: "/knowledge-base/core-invariants", label: "Invariants" },
        ]}
      />
    </>
  );
}
