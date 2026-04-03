import { KBCallout } from "../components/KBCallout";
import { KBRelatedLinks } from "../components/KBRelatedLinks";

export default function QinLayersContent() {
  return (
    <>
      <h2>Layer Definitions</h2>

      <h3>QIN — Raw Input Layer</h3>
      <p>Entry point for all operator instructions. Responsible for scope parsing, authorization validation, and routing decisions. No execution occurs at this layer.</p>

      <h3>PV — Private Verified</h3>
      <p>Internal proof generation. Evidence is captured but not yet externalized. The operator owns this layer. Evidence at PV must be sufficient for promotion without further work.</p>

      <h3>WV — Witnessed Verified</h3>
      <p>An independent witness reviews the PV-layer proof chain. The witness adds a signature and can reject promotion. Witness identity is logged and timestamped.</p>

      <h3>QV — Qualified Verified</h3>
      <p>Proof has been validated against the applicable regulatory or contractual standard (DORA, NIS2, EU AI Act, or contractual receipt spec). Hash is anchored at this layer.</p>

      <h3>PUB — Public Grade</h3>
      <p>The proof bundle is externally verifiable without access to private state. The Merkle anchor is published. Disclosure review complete. This is the terminal layer for regulatory submission.</p>

      <KBCallout variant="stop" label="Hard Rule">
        <p>No operation may self-promote. Promotion is always initiated by the layer above, never by the layer seeking promotion. Qin routes promotion decisions but does not execute them autonomously.</p>
      </KBCallout>

      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/qin-trust-ladder", label: "Trust Promotion Ladder" },
          { href: "/knowledge-base/core-proof-bundle", label: "Proof Bundle" },
        ]}
      />
    </>
  );
}
