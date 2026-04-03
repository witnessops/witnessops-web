import { KBCallout } from "../components/KBCallout";
import { KBRelatedLinks } from "../components/KBRelatedLinks";

export default function OffsecOperationsContent() {
  return (
    <>
      <h2>Operation Spine</h2>
      <ul>
        <li><strong>1. Confirm the task</strong> — identify target, objective, and authorization status before touching anything</li>
        <li><strong>2. Choose the right path</strong> — use an existing runbook before inventing a new process</li>
        <li><strong>3. Gather baseline evidence</strong> — understand the system before taking action</li>
        <li><strong>4. Validate carefully</strong> — use the least disruptive method that answers the question</li>
        <li><strong>5. Capture evidence</strong> — what you observed, how, and why it matters</li>
        <li><strong>6. Escalate or close</strong> — escalate if impact grows; close only when evidence is complete</li>
      </ul>

      <KBCallout variant="stop" label="Hard Stop Conditions">
        <p>Stop and escalate if: scope becomes unclear &middot; target is more sensitive than expected &middot; privileged accounts appear &middot; action would affect production &middot; next step is irreversible.</p>
      </KBCallout>

      <h2>What You May Not Do</h2>
      <ul>
        <li>Test outside approved scope</li>
        <li>Improvise intrusive actions without approval</li>
        <li>Collect unnecessary sensitive data</li>
        <li>Continue past an authorization boundary without clearance</li>
        <li>Treat {'"'}probably safe{'"'} as equivalent to approved</li>
      </ul>

      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/witnessops-evidence", label: "Evidence" },
          { href: "/knowledge-base/witnessops-governance", label: "Governance" },
          { href: "/knowledge-base/witnessops-runbooks", label: "Runbooks" },
        ]}
      />
    </>
  );
}
