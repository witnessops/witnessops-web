import { KBCallout } from "../components/KBCallout";
import { KBTable } from "../components/KBTable";
import { KBGuardrail } from "../components/KBGuardrail";
import { KBRelatedLinks } from "../components/KBRelatedLinks";
import Link from "next/link";

export default function CoreRegulatoryContent() {
  return (
    <>
      <KBGuardrail>
        <p>This page maps VaultMesh capabilities to regulatory frameworks. It does not assert that VaultMesh is certified, approved, or compliant with DORA, NIS2, the EU AI Act, or the CRA. Framework determinations, control design, and legal interpretation remain external to this system. See <Link href="/knowledge-base/evidence-guardrails" style={{ color: "#ffaa00", cursor: "pointer" }}>Evidence Guardrails</Link> for the full trust boundary declaration.</p>
      </KBGuardrail>

      <h2>Primary Forcing Functions</h2>
      <KBTable
        headers={["Regulation", "Enforceable", "VaultMesh Role"]}
        rows={[
          ["DORA", "Jan 2025", "ICT resilience evidence, audit trail anchoring, testing proof"],
          ["NIS2", "Oct 2024", "Incident evidence chains, security measure documentation"],
          ["EU AI Act", "Phased 2024\u20132027", "AI system documentation, record-keeping, risk management proof"],
          ["CRA", "2026", "Cyber resilience evidence for connected products"],
        ]}
      />

      <h2>Sales Strategy</h2>
      <p>VaultMesh does not create new compliance budgets. It attaches to existing DORA compliance spend. Every regulated financial institution already has budget allocated for DORA. The question is whether they spend it on documentation (which fails audit) or proof (which survives it).</p>

      <KBCallout variant="warn" label="Key Distinction">
        <p>Documentation describes what should have happened. Proof demonstrates what did happen. Regulators under DORA and the EU AI Act require the latter.</p>
      </KBCallout>

      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/core-lawchain", label: "LAWCHAIN Protocol" },
          { href: "/knowledge-base/core-proof-bundle", label: "Proof Bundle" },
        ]}
      />
    </>
  );
}
