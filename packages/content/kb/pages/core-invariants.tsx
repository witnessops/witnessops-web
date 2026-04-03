import { KBCallout } from "../components/KBCallout";
import { KBRelatedLinks } from "../components/KBRelatedLinks";

export default function CoreInvariantsContent() {
  return (
    <>
      <h2>Primary Invariants</h2>
      <KBCallout variant="go" label="Invariant Stack">
        <p><code>proof &gt; power &middot; evolution &gt; stasis &middot; anchor: now()</code></p>
      </KBCallout>

      <h3>proof &gt; power</h3>
      <p>No authority can override a valid proof chain. Organizational rank, urgency, or business pressure do not constitute authorization. If the proof is wrong, rebuild the chain — do not suppress the finding.</p>

      <h3>evolution &gt; stasis</h3>
      <p>The system is designed to change. Resistance to necessary evolution is a failure mode, not a safety mechanism. All evolution produces evidence of the change.</p>

      <h3>anchor: now()</h3>
      <p>Every operation is anchored to the actual time of execution. Backdating, forward-dating, and approximate timestamping are violations. <code>now()</code> is the only valid timestamp.</p>

      <h2>Alchemical Laws</h2>
      <ul>
        <li><strong>Solve et Coagula</strong> — decompose before recomposing. Never patch what should be rebuilt.</li>
        <li><strong>Astra Inclinant, Non Necessitant</strong> — context shapes decisions, but does not override authorization requirements.</li>
        <li><strong>Sacred Ratios</strong> — {"\u03C6"} &middot; {"\u03C0"} &middot; e &middot; {"\u221A"}2 preserved across all architectural decisions. Drift detected → correction applied.</li>
      </ul>

      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/qin-operator-oath", label: "Operator Oath" },
          { href: "/knowledge-base/core-overview", label: "Architecture" },
        ]}
      />
    </>
  );
}
