import { KBCallout } from "../components/KBCallout";
import { KBTable } from "../components/KBTable";
import { KBRelatedLinks } from "../components/KBRelatedLinks";

export default function QinOperatorOathContent() {
  return (
    <>
      <h2>The Oath</h2>
      <KBCallout variant="go" label="Operator Declaration">
        <p>I operate within authorized scope. I document what I do while I do it. I escalate when uncertainty appears. I do not continue beyond my authorization boundary. I produce evidence that another person can verify without my assistance. I do not treat absence of explicit prohibition as authorization. I serve the proof chain, not the outcome I prefer.</p>
      </KBCallout>

      <h2>Operational Meaning</h2>
      <ul>
        <li><strong>Within authorized scope</strong> — if you cannot state the authorization, you do not have it</li>
        <li><strong>Document while doing</strong> — retrospective reconstruction is not evidence</li>
        <li><strong>Escalate at uncertainty</strong> — uncertainty is itself an escalation condition</li>
        <li><strong>Boundary respect</strong> — reaching a boundary is a success state, not a failure</li>
        <li><strong>Independently verifiable</strong> — evidence that requires your presence to interpret is not evidence</li>
        <li><strong>No implied authorization</strong> — silence is not consent in the proof system</li>
      </ul>

      <h2>Oath Violations</h2>
      <KBTable
        headers={["Violation", "Consequence"]}
        rows={[
          ["Acting outside confirmed scope", "Operation invalidated. Evidence chain voided."],
          ["Retrospective evidence construction", "Evidence rejected. Escalation mandatory."],
          ["Crossing escalation boundary without approval", "Immediate suspension pending review."],
          ["Treating implied permission as authorization", "Operation invalidated. Re-authorization required."],
        ]}
      />

      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/qin-trust-ladder", label: "Trust Promotion Ladder" },
          { href: "/knowledge-base/offsec-governance", label: "Governance" },
        ]}
      />
    </>
  );
}
