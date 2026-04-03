import { KBCallout } from "../components/KBCallout";
import { KBTable } from "../components/KBTable";
import { KBGuardrail } from "../components/KBGuardrail";
import { KBRelatedLinks } from "../components/KBRelatedLinks";

export default function EvidenceGuardrailsContent() {
  return (
    <>
      <KBGuardrail>
        <p>This page is an evidence-mapping template. It does not state that OFFSEC or VaultMesh is compliant with any framework, law, or regulation. It helps teams map emitted artifacts and verification records to external requirements.</p>
      </KBGuardrail>

      <h2>Shared Trust Boundary</h2>
      <ul>
        <li><strong>OFFSEC emits governed execution evidence</strong> — receipts, manifests, approval-linked records, execution metadata, and preserved artifacts.</li>
        <li><strong>VaultMesh independently verifies evidence</strong> — signatures, integrity, continuity, and correspondence between declared scope and stored records.</li>
        <li><strong>Neither product makes the external framework determination on its own.</strong> Control design, legal interpretation, policy ownership, and organizational accountability remain external.</li>
      </ul>

      <h2>Shared Trust Assumptions</h2>
      <p>Record any assumptions that apply before relying on an evidence mapping:</p>
      <ul>
        <li>Host integrity remains a trust assumption</li>
        <li>Tool and adapter integrity remain trust assumptions</li>
        <li>Signing key control and availability remain trust assumptions</li>
        <li>Scope definitions, identity sources, and approval policy configuration remain trust assumptions</li>
        <li>Some controls, reviews, and legal interpretations remain manual or organization-owned</li>
      </ul>

      <h2>Shared Failure-State Explanation</h2>
      <p>This mapping is only as strong as the governed evidence chain.</p>
      <p>If approvals, scope records, receipts, manifests, or verification outputs are missing, inconsistent, or uncheckable — the activity is not fully supported by the governed execution record. That does not prove the activity was invalid, but it does mean the auditor or reviewer cannot rely on this template alone to establish traceable governed execution.</p>

      <KBCallout variant="warn" label="Key Wording Principles">
        <p>Evidence mapping pages must avoid: saying OFFSEC {'"'}verifies{'"'} (it emits — VaultMesh verifies); saying evidence {'"'}proves compliance{'"'} (it supports — auditors determine); treating missing evidence as proof nothing happened; implying host, tools, keys, scope, and approvals are inside automatic guarantees.</p>
      </KBCallout>

      <h2>Usage</h2>
      <p>This guardrail block appears at the top of all evidence-mapping pages. It is not optional. If you are writing a page that maps OFFSEC artifacts to a regulatory framework (DORA, NIS2, EU AI Act), this block must appear before any mapping table.</p>

      <h2>Evidence Mapping Pages</h2>
      <KBTable
        headers={["Page", "Framework", "Guardrail Required"]}
        rows={[
          ["offsec-governance", "DORA \u00b7 NIS2 \u00b7 EU AI Act", "Yes \u2014 regulatory timing table"],
          ["offsec-evidence", "All", "Yes \u2014 minimum standard definitions"],
          ["core-regulatory", "DORA \u00b7 NIS2 \u00b7 EU AI Act \u00b7 CRA", "Yes \u2014 framework mapping table"],
          ["offsec-receipt-spec", "DORA \u00b7 NIS2", "Yes \u2014 receipt field definitions"],
          ["runner-loop", "DORA \u00b7 NIS2 \u00b7 EU AI Act", "Yes \u2014 stage-level regulatory mapping"],
        ]}
      />

      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/offsec-evidence", label: "Evidence" },
          { href: "/knowledge-base/offsec-governance", label: "Governance" },
          { href: "/knowledge-base/core-regulatory", label: "Regulatory Layer" },
          { href: "/knowledge-base/offsec-receipt-spec", label: "Receipt Spec" },
        ]}
      />
    </>
  );
}
