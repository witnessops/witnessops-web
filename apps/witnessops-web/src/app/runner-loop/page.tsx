import type { Metadata } from "next";
import styles from "./runner-loop.module.css";

export const metadata: Metadata = {
  title: "WITNESSOPS // RUNNER LOOP DIAGRAM",
  robots: { index: false, follow: false },
};

function RunnerLoopSvg() {
  return (
    <svg
      className={styles.diagramSvg}
      viewBox="0 0 720 980"
      xmlns="http://www.w3.org/2000/svg"
      fontFamily="IBM Plex Mono, monospace"
    >
      <defs>
        <marker
          id="arr"
          markerWidth="6"
          markerHeight="6"
          refX="3"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="#2a3040" />
        </marker>
        <marker
          id="arr-g"
          markerWidth="6"
          markerHeight="6"
          refX="3"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="#00ff9c" />
        </marker>
        <marker
          id="arr-r"
          markerWidth="6"
          markerHeight="6"
          refX="3"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="#ff2d2d" />
        </marker>
      </defs>

      {/* Human / Authorized Actor */}
      <rect x="260" y="10" width="200" height="44" fill="#060606" stroke="#2a3040" strokeWidth="1" />
      <text x="360" y="28" textAnchor="middle" fill="#b0b8c4" fontSize="9" letterSpacing="2">HUMAN / AUTHORIZED ACTOR</text>
      <text x="360" y="46" textAnchor="middle" fill="#3a3f48" fontSize="8" letterSpacing="1">intent enters here</text>

      <line x1="360" y1="54" x2="360" y2="104" stroke="#2a3040" strokeWidth="1" markerEnd="url(#arr)" />

      {/* QIN Box */}
      <rect x="60" y="106" width="600" height="170" fill="#060606" stroke="#00ff9c" strokeWidth="1" />
      <rect x="60" y="106" width="600" height="1" fill="#00ff9c" />
      <text x="360" y="124" textAnchor="middle" fill="#00ff9c" fontSize="10" letterSpacing="3" fontWeight="600">QIN</text>
      <text x="360" y="140" textAnchor="middle" fill="#5a6578" fontSize="8" letterSpacing="1.5">live operator spine &middot; verification orchestrator</text>

      {/* QIN Role */}
      <text x="120" y="162" fill="#3a3f48" fontSize="8" letterSpacing="2">ROLE</text>
      <text x="120" y="178" fill="#6a7480" fontSize="9">&middot; Primary AI inference node</text>
      <text x="120" y="192" fill="#6a7480" fontSize="9">&middot; Sits between intent + output</text>
      <text x="120" y="206" fill="#6a7480" fontSize="9">&middot; Enforces proof requirement</text>

      {/* QIN Checks */}
      <text x="290" y="162" fill="#3a3f48" fontSize="8" letterSpacing="2">CHECKS</text>
      <text x="290" y="178" fill="#6a7480" fontSize="9">&middot; Scope validation</text>
      <text x="290" y="192" fill="#6a7480" fontSize="9">&middot; Authorization checks</text>
      <text x="290" y="206" fill="#6a7480" fontSize="9">&middot; Proportionality validation</text>
      <text x="290" y="220" fill="#6a7480" fontSize="9">&middot; Evidence capture</text>

      {/* QIN Constraints */}
      <text x="470" y="162" fill="#3a3f48" fontSize="8" letterSpacing="2">CONSTRAINTS</text>
      <text x="470" y="178" fill="#6a7480" fontSize="9">&middot; No self-authorization</text>
      <text x="470" y="192" fill="#6a7480" fontSize="9">&middot; No intrusive action w/o approval</text>
      <text x="470" y="206" fill="#6a7480" fontSize="9">&middot; No closure w/o evidence</text>
      <text x="470" y="220" fill="#6a7480" fontSize="9">&middot; No compromised proof chain</text>

      {/* Dividers inside QIN */}
      <line x1="280" y1="155" x2="280" y2="268" stroke="#1a1a1a" strokeWidth="1" />
      <line x1="460" y1="155" x2="460" y2="268" stroke="#1a1a1a" strokeWidth="1" />
      <line x1="60" y1="242" x2="660" y2="242" stroke="#1a1a1a" strokeWidth="1" />

      <text x="150" y="258" textAnchor="middle" fill="#3a3f48" fontSize="8" letterSpacing="1.5">PRECONDITION GATES</text>
      <text x="360" y="258" textAnchor="middle" fill="#3a3f48" fontSize="8" letterSpacing="1.5">ROUTING DECISION</text>
      <text x="570" y="258" textAnchor="middle" fill="#3a3f48" fontSize="8" letterSpacing="1.5">ESCALATION BOUNDARY</text>
      <text x="570" y="270" textAnchor="middle" fill="#ff2d2d" fontSize="8">&rarr; TEM</text>

      {/* Lines from QIN to boxes */}
      <line x1="240" y1="276" x2="150" y2="314" stroke="#1a1a1a" strokeWidth="1" markerEnd="url(#arr)" />
      <line x1="360" y1="276" x2="360" y2="314" stroke="#1a1a1a" strokeWidth="1" markerEnd="url(#arr)" />
      <line x1="480" y1="276" x2="570" y2="314" stroke="#ff2d2d" strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#arr-r)" />

      {/* Precondition box */}
      <rect x="60" y="316" width="176" height="66" fill="#060606" stroke="#1e2228" strokeWidth="1" />
      <text x="148" y="334" textAnchor="middle" fill="#5a6578" fontSize="8.5">In scope?</text>
      <text x="148" y="349" textAnchor="middle" fill="#5a6578" fontSize="8.5">Actor authorized?</text>
      <text x="148" y="364" textAnchor="middle" fill="#5a6578" fontSize="8.5">Proof path intact?</text>
      <text x="148" y="376" textAnchor="middle" fill="#3a3f48" fontSize="7" letterSpacing="1">PRECONDITION</text>

      {/* Routing box */}
      <rect x="272" y="316" width="176" height="66" fill="#060606" stroke="#1e2228" strokeWidth="1" />
      <text x="360" y="334" textAnchor="middle" fill="#5a6578" fontSize="8.5">Which lane?</text>
      <text x="360" y="349" textAnchor="middle" fill="#5a6578" fontSize="8.5">PV &middot; WV &middot; QV &middot; PUB</text>
      <text x="360" y="376" textAnchor="middle" fill="#3a3f48" fontSize="7" letterSpacing="1">ROUTING</text>

      {/* TEM box */}
      <rect x="484" y="316" width="176" height="66" fill="#060606" stroke="#ff2d2d" strokeWidth="1" />
      <text x="572" y="334" textAnchor="middle" fill="#ff2d2d" fontSize="10" letterSpacing="2">TEM</text>
      <text x="572" y="349" textAnchor="middle" fill="#5a6578" fontSize="8.5">Guardian layer</text>
      <text x="572" y="364" textAnchor="middle" fill="#5a6578" fontSize="8.5">Escalation / boundary hold</text>
      <text x="572" y="376" textAnchor="middle" fill="#3a3f48" fontSize="7" letterSpacing="1">ESCALATION</text>

      {/* QIN Routing fabric */}
      <text x="280" y="414" textAnchor="middle" fill="#2a3040" fontSize="8" letterSpacing="2">QIN ROUTING FABRIC</text>
      <line x1="60" y1="420" x2="500" y2="420" stroke="#1a1a1a" strokeWidth="1" />

      {/* Lines to lane boxes */}
      <line x1="148" y1="382" x2="100" y2="448" stroke="#2a3040" strokeWidth="1" markerEnd="url(#arr)" />
      <line x1="280" y1="382" x2="233" y2="448" stroke="#2a3040" strokeWidth="1" markerEnd="url(#arr)" />
      <line x1="360" y1="382" x2="367" y2="448" stroke="#2a3040" strokeWidth="1" markerEnd="url(#arr)" />
      <line x1="420" y1="382" x2="500" y2="448" stroke="#2a3040" strokeWidth="1" markerEnd="url(#arr)" />

      {/* PV Lane */}
      <rect x="60" y="450" width="122" height="78" fill="#060606" stroke="#1e2228" strokeWidth="1" />
      <rect x="60" y="450" width="122" height="2" fill="#00ff9c" opacity="0.4" />
      <text x="121" y="468" textAnchor="middle" fill="#00ff9c" fontSize="10" letterSpacing="2">PV</text>
      <text x="121" y="482" textAnchor="middle" fill="#3a3f48" fontSize="7" letterSpacing="1">PRIVATE VERIFIED</text>
      <text x="121" y="498" textAnchor="middle" fill="#5a6578" fontSize="8">Canonical hashing</text>
      <text x="121" y="511" textAnchor="middle" fill="#5a6578" fontSize="8">Page records</text>
      <text x="121" y="524" textAnchor="middle" fill="#5a6578" fontSize="8">Manifest state</text>

      {/* WV Lane */}
      <rect x="194" y="450" width="122" height="78" fill="#060606" stroke="#1e2228" strokeWidth="1" />
      <rect x="194" y="450" width="122" height="2" fill="#00ff9c" opacity="0.4" />
      <text x="255" y="468" textAnchor="middle" fill="#00ff9c" fontSize="10" letterSpacing="2">WV</text>
      <text x="255" y="482" textAnchor="middle" fill="#3a3f48" fontSize="7" letterSpacing="1">WITNESSED VERIFIED</text>
      <text x="255" y="498" textAnchor="middle" fill="#5a6578" fontSize="8">Witness logging</text>
      <text x="255" y="511" textAnchor="middle" fill="#5a6578" fontSize="8">Operator trace</text>
      <text x="255" y="524" textAnchor="middle" fill="#5a6578" fontSize="8">Event continuity</text>

      {/* QV Lane */}
      <rect x="328" y="450" width="122" height="78" fill="#060606" stroke="#1e2228" strokeWidth="1" />
      <rect x="328" y="450" width="122" height="2" fill="#00ff9c" opacity="0.4" />
      <text x="389" y="468" textAnchor="middle" fill="#00ff9c" fontSize="10" letterSpacing="2">QV</text>
      <text x="389" y="482" textAnchor="middle" fill="#3a3f48" fontSize="7" letterSpacing="1">QUALIFIED VERIFIED</text>
      <text x="389" y="498" textAnchor="middle" fill="#5a6578" fontSize="8">Assertions tested</text>
      <text x="389" y="511" textAnchor="middle" fill="#5a6578" fontSize="8">Against invariants</text>
      <text x="389" y="524" textAnchor="middle" fill="#5a6578" fontSize="8">Contract checks</text>

      {/* PUB Lane */}
      <rect x="462" y="450" width="122" height="78" fill="#060606" stroke="#1e2228" strokeWidth="1" />
      <rect x="462" y="450" width="122" height="2" fill="#2a3040" />
      <text x="523" y="468" textAnchor="middle" fill="#5a6578" fontSize="10" letterSpacing="2">PUB</text>
      <text x="523" y="482" textAnchor="middle" fill="#3a3f48" fontSize="7" letterSpacing="1">PUBLIC GRADE</text>
      <text x="523" y="498" textAnchor="middle" fill="#5a6578" fontSize="8">Publishable output</text>
      <text x="523" y="511" textAnchor="middle" fill="#5a6578" fontSize="8">Public artifacts</text>
      <text x="523" y="524" textAnchor="middle" fill="#5a6578" fontSize="8">External receipts</text>

      {/* Lines from lanes to evidence layer */}
      <line x1="121" y1="528" x2="280" y2="582" stroke="#1a1a1a" strokeWidth="1" markerEnd="url(#arr)" />
      <line x1="255" y1="528" x2="300" y2="582" stroke="#1a1a1a" strokeWidth="1" markerEnd="url(#arr)" />
      <line x1="389" y1="528" x2="370" y2="582" stroke="#1a1a1a" strokeWidth="1" markerEnd="url(#arr)" />
      <line x1="523" y1="528" x2="400" y2="582" stroke="#1a1a1a" strokeWidth="1" markerEnd="url(#arr)" />

      <text x="360" y="574" textAnchor="middle" fill="#2a3040" fontSize="8" letterSpacing="2">receipts from each lane</text>

      {/* Evidence / Receipt Layer */}
      <rect x="60" y="586" width="600" height="112" fill="#060606" stroke="#1e2228" strokeWidth="1" />
      <text x="360" y="604" textAnchor="middle" fill="#9aa2ae" fontSize="9" letterSpacing="2">EVIDENCE / RECEIPT LAYER</text>
      <text x="360" y="622" textAnchor="middle" fill="#5a6578" fontSize="8.5">Every operation emits anchored evidence receipts containing at minimum:</text>
      <text x="130" y="640" fill="#5a6578" fontSize="8.5">&middot; actor / authority context</text>
      <text x="130" y="654" fill="#5a6578" fontSize="8.5">&middot; scope decision</text>
      <text x="130" y="668" fill="#5a6578" fontSize="8.5">&middot; routed lane</text>
      <text x="130" y="682" fill="#5a6578" fontSize="8.5">&middot; artifact identifier</text>
      <text x="380" y="640" fill="#5a6578" fontSize="8.5">&middot; canonical hash</text>
      <text x="380" y="654" fill="#5a6578" fontSize="8.5">&middot; timestamp</text>
      <text x="380" y="668" fill="#5a6578" fontSize="8.5">&middot; verification state</text>
      <text x="380" y="682" fill="#5a6578" fontSize="8.5">&middot; escalation record if applicable</text>

      <line x1="360" y1="698" x2="360" y2="730" stroke="#2a3040" strokeWidth="1" markerEnd="url(#arr)" />

      {/* LAWCHAIN */}
      <rect x="60" y="732" width="600" height="90" fill="#060606" stroke="#1e2228" strokeWidth="1" />
      <rect x="60" y="732" width="600" height="1" fill="#00ff9c" opacity="0.2" />
      <text x="360" y="750" textAnchor="middle" fill="#9aa2ae" fontSize="9" letterSpacing="2">LAWCHAIN / ANCHORING</text>
      <text x="360" y="770" textAnchor="middle" fill="#5a6578" fontSize="8.5">SHA-256 canonical page record &middot; state: PV &middot; anchoring: PENDING RFC-3161</text>
      <text x="360" y="788" textAnchor="middle" fill="#3a3f48" fontSize="8.5">LAWCHAIN promotion: BLAKE3 + Ed25519 + RFC-3161 + Merkle &rarr; QV &rarr; PUB</text>
      <text x="360" y="808" textAnchor="middle" fill="#2a3040" fontSize="9" letterSpacing="1">rule: no verified proof &rarr; no state change</text>

      <line x1="360" y1="822" x2="360" y2="852" stroke="#00ff9c" strokeWidth="1" opacity="0.4" markerEnd="url(#arr-g)" />

      {/* Verified Operational History */}
      <rect x="60" y="854" width="600" height="70" fill="#060606" stroke="#00ff9c" strokeWidth="1" opacity="0.3" />
      <text x="360" y="876" textAnchor="middle" fill="#9aa2ae" fontSize="9" letterSpacing="2">VERIFIED OPERATIONAL HISTORY</text>
      <text x="360" y="896" textAnchor="middle" fill="#5a6578" fontSize="8.5">Output is portable, independently checkable operational history.</text>
      <text x="360" y="912" textAnchor="middle" fill="#3a3f48" fontSize="8.5">Not &ldquo;trust me&rdquo; system state.</text>
    </svg>
  );
}

export default function RunnerLoopPage() {
  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.topbarIdent}>WitnessOps // Runner Loop</div>
        <div className={styles.topbarMeta}>
          Standalone state machine diagram \u00B7 portable HTML artifact
        </div>
        <div className={styles.topbarRight}>
          <div className={styles.statusChip}>
            State <span className={styles.statusChipStrong}>PV</span>
          </div>
          <div className={styles.statusChip}>Anchoring PENDING RFC-3161</div>
        </div>
      </div>

      <main className={styles.layout}>
        <section className={styles.intro}>
          <div className={styles.panel}>
            <div className={styles.eyebrow}>Canonical Path</div>
            <h1 className={styles.h1}>
              QIN \u2192 PV \u2192 WV \u2192 QV \u2192 PUB \u2192 Return
            </h1>
            <p className={styles.p}>
              The runner loop is the canonical path every WitnessOps operation
              follows. No stage is optional. No promotion can occur without a
              structurally continuous proof path.
            </p>
            <div className={styles.callout}>
              <div className={styles.calloutLabel}>Loop Invariant</div>
              <p className={styles.p}>
                <code>proof &gt; power</code> \u00B7{" "}
                <code>evolution &gt; stasis</code> \u00B7{" "}
                <code>anchor: now()</code>
              </p>
            </div>
          </div>

          <div className={`${styles.panel} ${styles.stack}`}>
            <div>
              <div className={styles.eyebrow}>Role Summary</div>
              <h2 className={styles.h2}>State Semantics</h2>
            </div>
            <div className={styles.stackItem}>
              <div className={styles.stackLabel}>QIN</div>
              <div className={styles.stackValue}>
                Admission controller and proof router. Not executor.
              </div>
            </div>
            <div className={styles.stackItem}>
              <div className={styles.stackLabel}>TEM</div>
              <div className={styles.stackValue}>
                Exception and escalation authority. Forces boundary crossings to
                become visible governance events.
              </div>
            </div>
            <div className={styles.stackItem}>
              <div className={styles.stackLabel}>LAWCHAIN</div>
              <div className={styles.stackValue}>
                Transforms runtime events into portable proof history. Not a
                trust assertion.
              </div>
            </div>
          </div>
        </section>

        <section className={styles.diagramShell}>
          <RunnerLoopSvg />
        </section>

        <section className={styles.footerGrid}>
          <div className={styles.panel}>
            <div className={styles.eyebrow}>Plain Explanation</div>
            <h2 className={styles.h2}>
              How WitnessOps Turns Operations Into Proof
            </h2>
            <ol className={styles.numberList}>
              <li>Someone requests an action.</li>
              <li>
                QIN checks that the action is allowed, properly scoped, and
                supported by an intact proof path.
              </li>
              <li>
                If something unusual happens, TEM records the exception and
                escalates it explicitly.
              </li>
              <li>The action runs and produces evidence artifacts.</li>
              <li>
                Evidence moves through verification stages: Private, Witnessed,
                Qualified, and Public.
              </li>
              <li>
                Each stage produces receipts describing what happened, who acted,
                and what verification state was achieved.
              </li>
              <li>
                LAWCHAIN anchors the receipts into durable proof history.
              </li>
            </ol>
            <p className={styles.p}>
              Result: what happened can be independently verified later.
            </p>
          </div>

          <div className={styles.panel}>
            <div className={styles.eyebrow}>Canonical Definition</div>
            <h2 className={styles.h2}>Runner Loop Specification</h2>
            <ol className={styles.numberList}>
              <li>An authorized actor submits intent.</li>
              <li>
                QIN validates scope, authorization, proportionality, and
                proof-path integrity before execution.
              </li>
              <li>
                If a boundary is crossed or policy cannot be satisfied, TEM
                escalates the request and records the exception as a governance
                event.
              </li>
              <li>Authorized execution produces evidence artifacts.</li>
              <li>
                Evidence is promoted through the trust ladder: PV \u2192 WV
                \u2192 QV \u2192 PUB.
              </li>
              <li>
                Each promotion stage emits a receipt binding actor, scope,
                artifact, timestamp, and verification state.
              </li>
              <li>
                LAWCHAIN anchors the resulting receipt graph into durable proof
                history.
              </li>
              <li>
                The system state is therefore verified operational history, not
                internal system claims.
              </li>
            </ol>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.invariantPanel}`}>
          <div className={styles.eyebrow}>System Invariant</div>
          <p className={styles.invariantStatement}>
            <strong className={styles.invariantStrong}>Invariant:</strong> No
            operational state change is considered valid unless it produces a
            verifiable receipt chain anchored in proof history.
          </p>
        </section>

        <section className={styles.sectionGrid}>
          <div className={styles.panel}>
            <div className={styles.eyebrow}>Lane Legend</div>
            <ul className={styles.legendList}>
              <li>
                <strong className={styles.legendStrong}>PV</strong> &mdash;
                private verified canonical hashing lane
              </li>
              <li>
                <strong className={styles.legendStrong}>WV</strong> &mdash;
                witnessed verified continuity lane
              </li>
              <li>
                <strong className={styles.legendStrong}>QV</strong> &mdash;
                qualified verified invariant lane
              </li>
              <li>
                <strong className={styles.legendStrong}>PUB</strong> &mdash;
                public-grade disclosure lane
              </li>
            </ul>
          </div>

          <div className={styles.panel}>
            <div className={styles.eyebrow}>Boundary Notes</div>
            <ul className={styles.legendList}>
              <li>
                <strong className={styles.legendStrong}>QIN</strong> selects and
                routes. It does not execute trust-sensitive work.
              </li>
              <li>
                <strong className={styles.legendStrong}>TEM</strong> is the
                escalation authority. It does not silently resolve
                contradictions.
              </li>
              <li>
                <strong className={styles.legendStrong}>LAWCHAIN</strong>{" "}
                anchors history; it does not manufacture trust.
              </li>
            </ul>
          </div>

          <div className={styles.panel}>
            <div className={styles.eyebrow}>Seal</div>
            <ul className={styles.sealBlock}>
              <li>
                <code className={styles.sealCode}>vaultmesh --seal</code>
              </li>
              <li>
                <code className={styles.sealCode}>--guardian Tem</code>
              </li>
              <li>
                <code className={styles.sealCode}>
                  --invariant proof&gt;power
                </code>
              </li>
              <li>
                <code className={styles.sealCode}>
                  --invariant evolution&gt;stasis
                </code>
              </li>
              <li>
                <code className={styles.sealCode}>--anchor now()</code>
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
