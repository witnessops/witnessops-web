import { KBCallout } from "../components/KBCallout";
import { KBTable } from "../components/KBTable";
import { KBRelatedLinks } from "../components/KBRelatedLinks";

export default function CoreOverviewContent() {
  return (
    <>
      <h2>Design Principle</h2>
      <p>VaultMesh does not add verification to existing systems. It replaces the assumption of trust with a proof requirement at every layer. No verified proof, no state change.</p>
      <p>The architecture treats infrastructure components as living organisms with defined organs, interdependencies, and failure modes. The system is designed to be hostile to capture and to surface tampering through structural contradiction rather than policy enforcement.</p>

      <h2>Architectural Axes</h2>
      <KBTable
        headers={["Axis", "Domain", "Primary Forcing Function"]}
        rows={[
          ["Regulatory", "AI Act \u00b7 CRA \u00b7 DORA \u00b7 NIS2", "Verifiable compliance evidence"],
          ["Economic", "Treasury Nebula \u00b7 Proof-Credits", "Value anchored to verified state"],
          ["Security", "OFFSEC \u00b7 Red/Black Mirrors", "Adversarial validation receipts"],
          ["Cultural", "\u03A8-Field \u00b7 Narrative Integrity", "Human meaning retention"],
        ]}
      />

      <KBCallout variant="default" label="Invariant">
        <p>Axes remain orthogonal. No axis may absorb another. Economic incentives do not override regulatory proof requirements. Security findings do not override governance authorization chains.</p>
      </KBCallout>

      <h2>Infrastructure Ladder</h2>
      <ul>
        <li><strong>$10B layer</strong> — Operational proof generation. OFFSEC receipts, LAWCHAIN anchoring, QIN routing.</li>
        <li><strong>$100B layer</strong> — Institutional adoption. Regulatory submission infrastructure. Waystone-class reference deployments.</li>
        <li><strong>$1T layer</strong> — Protocol standard. Proof-as-infrastructure. AI governance primitive embedded in national frameworks.</li>
      </ul>

      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/core-proof-bundle", label: "Proof Bundle" },
          { href: "/knowledge-base/core-organs", label: "Six Organs" },
          { href: "/knowledge-base/core-invariants", label: "Invariants" },
        ]}
      />
    </>
  );
}
