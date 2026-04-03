import { KBCallout } from "../components/KBCallout";
import { KBTable } from "../components/KBTable";
import { KBBadge } from "../components/KBBadge";
import { KBRelatedLinks } from "../components/KBRelatedLinks";

export default function QinDeploymentContent() {
  return (
    <>
      <h2>Runtime Environment</h2>
      <KBTable
        headers={["Component", "Value", "Status"]}
        rows={[
          ["Provider", "Microsoft Azure", <KBBadge variant="live">LIVE</KBBadge>],
          ["Region", "West Europe", <KBBadge variant="live">ACTIVE</KBBadge>],
          ["Network", "Tailscale mesh", <KBBadge variant="live">UP</KBBadge>],
          ["Infra backup", "Hetzner / Akash Network", <KBBadge variant="amber">STANDBY</KBBadge>],
          ["Source control", "gitlab.vaultmesh.org", <KBBadge variant="live">LIVE</KBBadge>],
          ["Anchoring", "RFC-3161 timestamps", <KBBadge variant="live">ACTIVE</KBBadge>],
        ]}
      />

      <h2>Proof Anchoring</h2>
      <p>Every Qin session produces four anchoring artifacts: <code>manifest.json</code>, <code>receipt.json</code>, <code>hash-manifest.txt</code>, <code>campaign-receipt.json</code>. These are generated as structural byproducts of operation execution, not post-hoc summaries.</p>

      <KBCallout variant="go" label="Anchoring Stack">
        <p>BLAKE3 hashing → Ed25519 signatures → RFC-3161 timestamps → Merkle tree anchoring. Each layer wraps the previous. The chain cannot be selectively modified.</p>
      </KBCallout>

      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/offsec-receipt-spec", label: "Receipt Spec" },
          { href: "/knowledge-base/core-lawchain", label: "LAWCHAIN Protocol" },
        ]}
      />
    </>
  );
}
