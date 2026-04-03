import { KBCallout } from "../components/KBCallout";
import { KBTable } from "../components/KBTable";
import { KBRelatedLinks } from "../components/KBRelatedLinks";

export default function CoreLawchainContent() {
  return (
    <>
      <h2>Stack</h2>
      <ul>
        <li><code>BLAKE3</code> — content hashing, all evidence artifacts</li>
        <li><code>Ed25519</code> — operator signatures, witness signatures</li>
        <li><code>RFC-3161</code> — trusted timestamping, per operation</li>
        <li><code>Merkle tree</code> — aggregation anchoring across operations</li>
      </ul>

      <h2>How It Works</h2>
      <p>Every artifact is hashed on creation. The hash is signed by the operator{"'"}s Ed25519 key. The signed hash receives an RFC-3161 timestamp from a trusted authority. The timestamp is incorporated into the Merkle tree. The root hash is published at defined intervals.</p>
      <p>Modification of any artifact after anchoring produces a hash mismatch visible at every layer above. There is no silent modification path.</p>

      <KBCallout variant="stop" label="Tamper Evidence">
        <p>LAWCHAIN does not prevent tampering. It makes tampering structurally detectable without requiring a trusted intermediary to assert it. The chain speaks for itself.</p>
      </KBCallout>

      <h2>Regulatory Mapping</h2>
      <KBTable
        headers={["Regulation", "LAWCHAIN Satisfies"]}
        rows={[
          ["DORA Art. 9", "ICT incident audit trail integrity"],
          ["DORA Art. 11", "Recovery testing evidence preservation"],
          ["EU AI Act Art. 12", "Technical documentation, record-keeping"],
          ["NIS2 Art. 21", "Incident handling evidence chain"],
        ]}
      />

      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/core-proof-bundle", label: "Proof Bundle" },
          { href: "/knowledge-base/offsec-receipt-spec", label: "Receipt Spec" },
          { href: "/knowledge-base/core-regulatory", label: "Regulatory Layer" },
        ]}
      />
    </>
  );
}
