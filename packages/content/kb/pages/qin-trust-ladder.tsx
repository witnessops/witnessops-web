import { KBCallout } from "../components/KBCallout";
import { KBTable } from "../components/KBTable";
import { KBRelatedLinks } from "../components/KBRelatedLinks";

export default function QinTrustLadderContent() {
  return (
    <>
      <h2>Layer Architecture</h2>
      <p>Trust is not granted. It is promoted through demonstrated conformance at each layer. No claim skips levels. Every promotion produces evidence.</p>

      <KBTable
        headers={["Layer", "Name", "Function", "Promotion Condition"]}
        rows={[
          ["L1 \u2014 QIN", "Raw Input", "Operator instruction received and scoped", "Scope confirmed, authorization present"],
          ["L2 \u2014 PV", "Private Verified", "Internal proof generated, not yet externalized", "Evidence complete, method documented"],
          ["L3 \u2014 WV", "Witnessed Verified", "Independent witness has reviewed the proof chain", "Witness signature attached"],
          ["L4 \u2014 QV", "Qualified Verified", "Meets regulatory or contractual evidence standard", "Receipt spec satisfied, hash anchored"],
          ["L5 \u2014 PUB", "Public Grade", "Externally verifiable without access to private state", "Merkle anchor published, disclosure complete"],
        ]}
      />

      <h2>Promotion Rules</h2>
      <ul>
        <li>Promotion from L1 requires: scope confirmed + authorization exists</li>
        <li>Promotion from L2 requires: evidence complete + no open escalation</li>
        <li>Promotion from L3 requires: witness signature + no disputed findings</li>
        <li>Promotion from L4 requires: hash anchored + receipt spec passed</li>
        <li>Promotion to L5 requires: all prior conditions satisfied + disclosure review</li>
      </ul>

      <KBCallout variant="warn" label="Demotion Condition">
        <p>Any layer can be demoted if a contradiction is discovered in the underlying evidence. Demotion is logged, timestamped, and cannot be undone. The corrected chain must be rebuilt from the layer of failure.</p>
      </KBCallout>

      <h2>Invariant</h2>
      <p><code>proof &gt; power</code> — A higher-layer actor cannot override a lower-layer proof chain by authority alone. The chain must be rebuilt, not overwritten.</p>

      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/qin-overview", label: "QIN Overview" },
          { href: "/knowledge-base/core-proof-bundle", label: "Proof Bundle (VPB)" },
          { href: "/knowledge-base/offsec-evidence", label: "Evidence" },
        ]}
      />
    </>
  );
}
