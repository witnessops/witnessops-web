import { KBCallout } from "../components/KBCallout";
import { KBTable } from "../components/KBTable";
import { KBRelatedLinks } from "../components/KBRelatedLinks";

export default function OffsecOverviewContent() {
  return (
    <>
      <h2>Design Intent</h2>
      <p>WitnessOps was built to solve a specific problem: security operations produce findings, but those findings are not proof. A penetration test report is an assertion. A LAWCHAIN-anchored receipt of the same work is evidence.</p>
      <p>WitnessOps generates the latter as a structural byproduct of following the correct process — not as an afterthought.</p>

      <h2>Four Roles</h2>
      <KBTable
        headers={["Role", "Primary Function", "Key Docs"]}
        rows={[
          ["New Operator", "Hands-on security work within authorized scope", "Operations, Runbooks, Evidence"],
          ["Defender", "Triage, investigation, incident response", "Evidence, Operations, Governance"],
          ["Manager / Approver", "Authorization, evidence review, escalation governance", "Governance, Authorization Model"],
          ["Integration Author", "Tooling, adapters, documentation-linked workflows", "Integrations, Receipt Spec"],
        ]}
      />

      <KBCallout variant="go" label="Core Output">
        <p>Every completed WitnessOps operation produces: <code>manifest.json</code> &middot; <code>receipt.json</code> &middot; <code>hash-manifest.txt</code> &middot; <code>campaign-receipt.json</code></p>
      </KBCallout>

      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/witnessops-operations", label: "Operations" },
          { href: "/knowledge-base/witnessops-evidence", label: "Evidence" },
          { href: "/knowledge-base/witnessops-governance", label: "Governance" },
        ]}
      />
    </>
  );
}
