import { KBCallout } from "../components/KBCallout";
import { KBTable } from "../components/KBTable";
import { KBGuardrail } from "../components/KBGuardrail";
import { KBRelatedLinks } from "../components/KBRelatedLinks";
import Link from "next/link";

export default function RunnerLoopContent() {
  return (
    <>
      <KBGuardrail>
        <p>Stage-level regulatory mappings in this page are templates. They identify where in the loop relevant evidence is produced. They do not assert that completing these stages constitutes compliance with DORA, NIS2, or the EU AI Act. See <Link href="/knowledge-base/evidence-guardrails" style={{ color: "#ffaa00", cursor: "pointer" }}>Evidence Guardrails</Link>.</p>
      </KBGuardrail>

      <h2>Overview</h2>
      <p>The runner loop is the canonical path every operation follows. No step is optional. No step can be skipped without producing a structural gap that blocks promotion. The loop is self-auditing — conformance is the byproduct of correct execution, not a separate check performed afterward.</p>

      <KBCallout variant="go" label="Loop Invariant">
        <p><code>QIN {"\u2192"} PV {"\u2192"} WV {"\u2192"} QV {"\u2192"} PUB {"\u2192"} Return</code> — Every operation that enters the system exits as a VPB or it does not exit at all.</p>
      </KBCallout>

      <h2>Stage 1 — QIN (L1) &middot; Raw Intent</h2>
      <h3>Operator Declares</h3>
      <ul>
        <li>Target — exact, unambiguous</li>
        <li>Objective — one sentence, falsifiable</li>
        <li>Scope — boundaries and exclusions stated</li>
        <li>Authorization — reference to approval record</li>
        <li>Method category — observation / validation / action</li>
      </ul>
      <h3>QIN Performs</h3>
      <ul>
        <li>Scope parsing — maps declaration against authorization model</li>
        <li>Authorization validation — confirms approval exists and is current</li>
        <li>Safety boundary check — identifies escalation conditions before execution</li>
        <li>Escalation boundary mapping — logs where the operator must stop and escalate</li>
        <li>Runbook selection — assigns the correct execution path</li>
        <li>Evidence manifest start — opens the evidence chain; all subsequent artifacts attach here</li>
      </ul>
      <KBCallout variant="default" label="Output — L1 Manifest">
        <p>A structured task declaration. Not yet executed. Not yet evidence. The manifest is the authorization record that all downstream layers verify against.</p>
      </KBCallout>

      <h2>Stage 2 — PV (L2) &middot; Operator Execution</h2>
      <h3>PV Receives</h3>
      <ul>
        <li>Structured task from QIN</li>
        <li>Evidence requirements (what must be captured)</li>
        <li>Expected outputs (what success looks like)</li>
        <li>Escalation triggers (what causes an immediate stop)</li>
      </ul>
      <h3>Operator Performs</h3>
      <p>Minimum necessary steps to answer the objective. No action beyond what is needed to produce a verifiable conclusion.</p>
      <h3>PV Captures</h3>
      <ul>
        <li>Timestamped steps — in execution order, not retrospectively</li>
        <li>Observations — what was seen, not what was inferred</li>
        <li>Artifacts — original files, logs, screenshots with source context</li>
        <li>Method references — which runbook steps were followed</li>
      </ul>
      <KBCallout variant="default" label="Output — PV Evidence Bundle">
        <p>A complete private evidence bundle. This is the operator{"'"}s work product. It must be sufficient for promotion without additional work — no gap-filling at WV is permitted.</p>
      </KBCallout>

      <h2>Stage 3 — WV (L3) &middot; Independent Witness</h2>
      <p>The operator does not promote their own work. The PV bundle is submitted to an independent witness who has not been involved in execution.</p>
      <h3>WV Performs</h3>
      <ul>
        <li>Structural consistency check — does the evidence support the conclusion stated?</li>
        <li>Method-to-observation validation — do the steps match what was observed?</li>
        <li>Contradiction detection — are there internal conflicts in the evidence chain?</li>
        <li>Timestamp integrity — are all timestamps RFC-3161 anchored and sequential?</li>
        <li>Operator oath conformance — does the execution conform to the Operator Oath?</li>
      </ul>
      <KBCallout variant="warn" label="Output — Signed or Demoted">
        <p>WV signs and promotes, or rejects and demotes to PV with documented findings. A rejection is not a failure — it is the system working. The operator must address the findings and resubmit. The rejection record becomes part of the final chain.</p>
      </KBCallout>

      <h2>Stage 4 — QV (L4) &middot; Regulatory Validation</h2>
      <p>The witnessed proof chain is checked against the applicable regulatory or contractual standard.</p>
      <h3>QV Checks</h3>
      <ul>
        <li>Regulatory mapping — which articles of DORA / NIS2 / EU AI Act apply, and are they satisfied?</li>
        <li>Receipt spec — structural completeness against the receipt spec field requirements</li>
        <li>Hash anchoring — all evidence artifacts hashed via BLAKE3 and signatures applied</li>
        <li>Chain continuity — no gaps between L1 manifest and L3 witness signature</li>
      </ul>
      <h3>QV Anchors</h3>
      <ul>
        <li>Manifest — hashed and signed</li>
        <li>Receipts — timestamped via RFC-3161</li>
        <li>Evidence — hash-manifest.txt generated</li>
        <li>Campaign receipt — if multi-step, aggregated here</li>
      </ul>
      <KBCallout variant="go" label="Output — QV-Grade Proof">
        <p>A regulatory-validatable proof bundle. This is the terminal state for most commercial operations. The AI Governance Proof Pack delivers at QV grade.</p>
      </KBCallout>

      <h2>Stage 5 — PUB (L5) &middot; Public Anchor</h2>
      <p>Optional terminal layer for operations requiring external verifiability without access to private state.</p>
      <h3>PUB Performs</h3>
      <ul>
        <li>Merkle aggregation — this operation{"'"}s proof root incorporated into the aggregate tree</li>
        <li>Public disclosure checks — private state removed or redacted per disclosure policy</li>
        <li>Removal of private state — operator identity, sensitive targets, internal references</li>
        <li>Deterministic reproducibility check — the published bundle must be independently verifiable</li>
      </ul>
      <KBCallout variant="go" label="Output — Public-Grade VPB">
        <p>Fully externally verifiable. The Merkle anchor is published. No trusted intermediary required to verify the chain. This is the terminal state for protocol-level proof or regulatory submission requiring public auditability.</p>
      </KBCallout>

      <h2>Stage 6 — Return to Operator</h2>
      <p>The system emits the complete VaultMesh Proof Bundle back to the originating operator.</p>
      <KBTable
        headers={["Artifact", "Content"]}
        rows={[
          ["VPB", "Complete proof bundle at promotion grade (PV / WV / QV / PUB)"],
          ["receipt.json", "Execution record with timestamps and method refs"],
          ["manifest.json", "Scope and authorization declaration"],
          ["hash-manifest.txt", "BLAKE3 hashes of all evidence artifacts"],
          ["campaign-receipt.json", "Aggregated chain (if multi-step operation)"],
          ["Escalation notes", "Any escalation events that occurred during execution"],
          ["Follow-up flags", "Open items that require further action"],
        ]}
      />

      <h2>Loop Summary</h2>
      <KBTable
        headers={["Stage", "Layer", "Actor", "Gate Condition", "Output"]}
        rows={[
          ["1", "QIN \u2014 L1", "Operator + QIN", "Scope confirmed, auth valid", "L1 manifest"],
          ["2", "PV \u2014 L2", "Operator", "Evidence complete, no open escalation", "PV evidence bundle"],
          ["3", "WV \u2014 L3", "Independent witness", "No contradiction, oath conformance", "Witnessed chain or demotion"],
          ["4", "QV \u2014 L4", "QV engine", "Regulatory mapping satisfied, hash anchored", "QV-grade proof"],
          ["5", "PUB \u2014 L5", "Protocol layer", "Disclosure complete, Merkle anchored", "Public VPB"],
          ["6", "Return", "System", "All prior stages complete", "Complete VPB + receipts"],
        ]}
      />

      <KBCallout variant="stop" label="Demotion Rule">
        <p>Any stage can trigger a demotion back to the layer of failure. Demotion is logged, timestamped, and becomes part of the permanent chain. The corrected bundle must pass all subsequent gates again. There is no fast-track re-promotion.</p>
      </KBCallout>

      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/qin-trust-ladder", label: "Trust Promotion Ladder" },
          { href: "/knowledge-base/core-proof-bundle", label: "Proof Bundle (VPB)" },
          { href: "/knowledge-base/offsec-receipt-spec", label: "Receipt Spec" },
          { href: "/knowledge-base/core-lawchain", label: "LAWCHAIN Protocol" },
          { href: "/runner-loop", label: "Standalone Diagram", external: true },
        ]}
      />
    </>
  );
}
