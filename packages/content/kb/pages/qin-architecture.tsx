import { KBTable } from "../components/KBTable";
import { KBProtocolBlock } from "../components/KBProtocolBlock";
import { KBRelatedLinks } from "../components/KBRelatedLinks";

export default function QinArchitectureContent() {
  return (
    <>
      <h2>Operator Flow</h2>
      <p>QIN is not the executor of trust-sensitive work. QIN is the admission controller and proof router. TEM is the boundary guardian. PV / WV / QV / PUB are orthogonal operational lanes. LAWCHAIN anchoring converts runtime events into portable proof history.</p>

      <div className="arch-diagram">
        <svg viewBox="0 0 720 980" xmlns="http://www.w3.org/2000/svg" fontFamily="IBM Plex Mono, monospace">
          <defs>
            <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#2a3040" />
            </marker>
            <marker id="arr-g" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#00ff9c" />
            </marker>
            <marker id="arr-r" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#ff2d2d" />
            </marker>
          </defs>

          {/* HUMAN ACTOR */}
          <rect x="260" y="10" width="200" height="44" fill="#060606" stroke="#2a3040" strokeWidth="1" />
          <text x="360" y="28" textAnchor="middle" fill="#b0b8c4" fontSize="9" letterSpacing="2">HUMAN / AUTHORIZED ACTOR</text>
          <text x="360" y="46" textAnchor="middle" fill="#3a3f48" fontSize="8" letterSpacing="1">intent enters here</text>

          {/* Arrow human -> QIN */}
          <line x1="360" y1="54" x2="360" y2="104" stroke="#2a3040" strokeWidth="1" markerEnd="url(#arr)" />

          {/* QIN BOX */}
          <rect x="60" y="106" width="600" height="170" fill="#060606" stroke="#00ff9c" strokeWidth="1" />
          <rect x="60" y="106" width="600" height="1" fill="#00ff9c" />
          <text x="360" y="124" textAnchor="middle" fill="#00ff9c" fontSize="10" letterSpacing="3" fontWeight="600">QIN</text>
          <text x="360" y="140" textAnchor="middle" fill="#5a6578" fontSize="8" letterSpacing="1.5">live operator spine - verification orchestrator</text>

          {/* QIN internals */}
          <text x="120" y="162" fill="#3a3f48" fontSize="8" letterSpacing="2">ROLE</text>
          <text x="120" y="178" fill="#6a7480" fontSize="9">- Primary AI inference node</text>
          <text x="120" y="192" fill="#6a7480" fontSize="9">- Sits between intent + output</text>
          <text x="120" y="206" fill="#6a7480" fontSize="9">- Enforces proof requirement</text>

          <text x="290" y="162" fill="#3a3f48" fontSize="8" letterSpacing="2">CHECKS</text>
          <text x="290" y="178" fill="#6a7480" fontSize="9">- Scope validation</text>
          <text x="290" y="192" fill="#6a7480" fontSize="9">- Authorization checks</text>
          <text x="290" y="206" fill="#6a7480" fontSize="9">- Proportionality validation</text>
          <text x="290" y="220" fill="#6a7480" fontSize="9">- Evidence capture</text>

          <text x="470" y="162" fill="#3a3f48" fontSize="8" letterSpacing="2">CONSTRAINTS</text>
          <text x="470" y="178" fill="#6a7480" fontSize="9">- No self-authorization</text>
          <text x="470" y="192" fill="#6a7480" fontSize="9">- No intrusive action w/o approval</text>
          <text x="470" y="206" fill="#6a7480" fontSize="9">- No closure w/o evidence</text>
          <text x="470" y="220" fill="#6a7480" fontSize="9">- No compromised proof chain</text>

          {/* Dividers */}
          <line x1="280" y1="155" x2="280" y2="268" stroke="#1a1a1a" strokeWidth="1" />
          <line x1="460" y1="155" x2="460" y2="268" stroke="#1a1a1a" strokeWidth="1" />

          {/* Gate labels */}
          <line x1="60" y1="242" x2="660" y2="242" stroke="#1a1a1a" strokeWidth="1" />
          <text x="150" y="258" textAnchor="middle" fill="#3a3f48" fontSize="8" letterSpacing="1.5">PRECONDITION GATES</text>
          <text x="360" y="258" textAnchor="middle" fill="#3a3f48" fontSize="8" letterSpacing="1.5">ROUTING DECISION</text>
          <text x="570" y="258" textAnchor="middle" fill="#3a3f48" fontSize="8" letterSpacing="1.5">ESCALATION BOUNDARY</text>
          <text x="570" y="270" textAnchor="middle" fill="#ff2d2d" fontSize="8">{"\u2192"} TEM</text>

          {/* Arrows QIN -> 3 gates */}
          <line x1="240" y1="276" x2="150" y2="314" stroke="#1a1a1a" strokeWidth="1" markerEnd="url(#arr)" />
          <line x1="360" y1="276" x2="360" y2="314" stroke="#1a1a1a" strokeWidth="1" markerEnd="url(#arr)" />
          <line x1="480" y1="276" x2="570" y2="314" stroke="#ff2d2d" strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#arr-r)" />

          {/* Three gate boxes */}
          <rect x="60" y="316" width="176" height="66" fill="#060606" stroke="#1e2228" strokeWidth="1" />
          <text x="148" y="334" textAnchor="middle" fill="#5a6578" fontSize="8.5">In scope?</text>
          <text x="148" y="349" textAnchor="middle" fill="#5a6578" fontSize="8.5">Actor authorized?</text>
          <text x="148" y="364" textAnchor="middle" fill="#5a6578" fontSize="8.5">Proof path intact?</text>
          <text x="148" y="376" textAnchor="middle" fill="#3a3f48" fontSize="7" letterSpacing="1">PRECONDITION</text>

          <rect x="272" y="316" width="176" height="66" fill="#060606" stroke="#1e2228" strokeWidth="1" />
          <text x="360" y="334" textAnchor="middle" fill="#5a6578" fontSize="8.5">Which lane?</text>
          <text x="360" y="349" textAnchor="middle" fill="#5a6578" fontSize="8.5">PV - WV - QV - PUB</text>
          <text x="360" y="376" textAnchor="middle" fill="#3a3f48" fontSize="7" letterSpacing="1">ROUTING</text>

          {/* TEM box */}
          <rect x="484" y="316" width="176" height="66" fill="#060606" stroke="#ff2d2d" strokeWidth="1" />
          <text x="572" y="334" textAnchor="middle" fill="#ff2d2d" fontSize="10" letterSpacing="2">TEM</text>
          <text x="572" y="349" textAnchor="middle" fill="#5a6578" fontSize="8.5">Guardian layer</text>
          <text x="572" y="364" textAnchor="middle" fill="#5a6578" fontSize="8.5">Escalation / boundary hold</text>
          <text x="572" y="376" textAnchor="middle" fill="#3a3f48" fontSize="7" letterSpacing="1">ESCALATION</text>

          {/* Routing fabric */}
          <text x="280" y="414" textAnchor="middle" fill="#2a3040" fontSize="8" letterSpacing="2">QIN ROUTING FABRIC</text>
          <line x1="60" y1="420" x2="500" y2="420" stroke="#1a1a1a" strokeWidth="1" />

          {/* Arrows -> 4 lanes */}
          <line x1="148" y1="382" x2="100" y2="448" stroke="#2a3040" strokeWidth="1" markerEnd="url(#arr)" />
          <line x1="280" y1="382" x2="233" y2="448" stroke="#2a3040" strokeWidth="1" markerEnd="url(#arr)" />
          <line x1="360" y1="382" x2="367" y2="448" stroke="#2a3040" strokeWidth="1" markerEnd="url(#arr)" />
          <line x1="420" y1="382" x2="500" y2="448" stroke="#2a3040" strokeWidth="1" markerEnd="url(#arr)" />

          {/* 4 lane boxes */}
          <rect x="60" y="450" width="122" height="78" fill="#060606" stroke="#1e2228" strokeWidth="1" />
          <rect x="60" y="450" width="122" height="2" fill="#00ff9c" opacity="0.4" />
          <text x="121" y="468" textAnchor="middle" fill="#00ff9c" fontSize="10" letterSpacing="2">PV</text>
          <text x="121" y="482" textAnchor="middle" fill="#3a3f48" fontSize="7" letterSpacing="1">PRIVATE VERIFIED</text>
          <text x="121" y="498" textAnchor="middle" fill="#5a6578" fontSize="8">Canonical hashing</text>
          <text x="121" y="511" textAnchor="middle" fill="#5a6578" fontSize="8">Page records</text>
          <text x="121" y="524" textAnchor="middle" fill="#5a6578" fontSize="8">Manifest state</text>

          <rect x="194" y="450" width="122" height="78" fill="#060606" stroke="#1e2228" strokeWidth="1" />
          <rect x="194" y="450" width="122" height="2" fill="#00ff9c" opacity="0.4" />
          <text x="255" y="468" textAnchor="middle" fill="#00ff9c" fontSize="10" letterSpacing="2">WV</text>
          <text x="255" y="482" textAnchor="middle" fill="#3a3f48" fontSize="7" letterSpacing="1">WITNESSED VERIFIED</text>
          <text x="255" y="498" textAnchor="middle" fill="#5a6578" fontSize="8">Witness logging</text>
          <text x="255" y="511" textAnchor="middle" fill="#5a6578" fontSize="8">Operator trace</text>
          <text x="255" y="524" textAnchor="middle" fill="#5a6578" fontSize="8">Event continuity</text>

          <rect x="328" y="450" width="122" height="78" fill="#060606" stroke="#1e2228" strokeWidth="1" />
          <rect x="328" y="450" width="122" height="2" fill="#00ff9c" opacity="0.4" />
          <text x="389" y="468" textAnchor="middle" fill="#00ff9c" fontSize="10" letterSpacing="2">QV</text>
          <text x="389" y="482" textAnchor="middle" fill="#3a3f48" fontSize="7" letterSpacing="1">QUALIFIED VERIFIED</text>
          <text x="389" y="498" textAnchor="middle" fill="#5a6578" fontSize="8">Assertions tested</text>
          <text x="389" y="511" textAnchor="middle" fill="#5a6578" fontSize="8">Against invariants</text>
          <text x="389" y="524" textAnchor="middle" fill="#5a6578" fontSize="8">Contract checks</text>

          <rect x="462" y="450" width="122" height="78" fill="#060606" stroke="#1e2228" strokeWidth="1" />
          <rect x="462" y="450" width="122" height="2" fill="#2a3040" />
          <text x="523" y="468" textAnchor="middle" fill="#5a6578" fontSize="10" letterSpacing="2">PUB</text>
          <text x="523" y="482" textAnchor="middle" fill="#3a3f48" fontSize="7" letterSpacing="1">PUBLIC GRADE</text>
          <text x="523" y="498" textAnchor="middle" fill="#5a6578" fontSize="8">Publishable output</text>
          <text x="523" y="511" textAnchor="middle" fill="#5a6578" fontSize="8">Public artifacts</text>
          <text x="523" y="524" textAnchor="middle" fill="#5a6578" fontSize="8">External receipts</text>

          {/* Arrows -> Evidence */}
          <line x1="121" y1="528" x2="280" y2="582" stroke="#1a1a1a" strokeWidth="1" markerEnd="url(#arr)" />
          <line x1="255" y1="528" x2="300" y2="582" stroke="#1a1a1a" strokeWidth="1" markerEnd="url(#arr)" />
          <line x1="389" y1="528" x2="370" y2="582" stroke="#1a1a1a" strokeWidth="1" markerEnd="url(#arr)" />
          <line x1="523" y1="528" x2="400" y2="582" stroke="#1a1a1a" strokeWidth="1" markerEnd="url(#arr)" />

          <text x="360" y="574" textAnchor="middle" fill="#2a3040" fontSize="8" letterSpacing="2">receipts from each lane</text>

          {/* EVIDENCE LAYER */}
          <rect x="60" y="586" width="600" height="112" fill="#060606" stroke="#1e2228" strokeWidth="1" />
          <text x="360" y="604" textAnchor="middle" fill="#9aa2ae" fontSize="9" letterSpacing="2">EVIDENCE / RECEIPT LAYER</text>
          <text x="360" y="622" textAnchor="middle" fill="#5a6578" fontSize="8.5">Every operation emits anchored evidence receipts containing at minimum:</text>
          <text x="130" y="640" fill="#5a6578" fontSize="8.5">- actor / authority context</text>
          <text x="130" y="654" fill="#5a6578" fontSize="8.5">- scope decision</text>
          <text x="130" y="668" fill="#5a6578" fontSize="8.5">- routed lane</text>
          <text x="130" y="682" fill="#5a6578" fontSize="8.5">- artifact identifier</text>
          <text x="380" y="640" fill="#5a6578" fontSize="8.5">- canonical hash</text>
          <text x="380" y="654" fill="#5a6578" fontSize="8.5">- timestamp</text>
          <text x="380" y="668" fill="#5a6578" fontSize="8.5">- verification state</text>
          <text x="380" y="682" fill="#5a6578" fontSize="8.5">- escalation record if applicable</text>

          {/* Arrow -> LAWCHAIN */}
          <line x1="360" y1="698" x2="360" y2="730" stroke="#2a3040" strokeWidth="1" markerEnd="url(#arr)" />

          {/* LAWCHAIN */}
          <rect x="60" y="732" width="600" height="90" fill="#060606" stroke="#1e2228" strokeWidth="1" />
          <rect x="60" y="732" width="600" height="1" fill="#00ff9c" opacity="0.2" />
          <text x="360" y="750" textAnchor="middle" fill="#9aa2ae" fontSize="9" letterSpacing="2">LAWCHAIN / ANCHORING</text>
          <text x="360" y="770" textAnchor="middle" fill="#5a6578" fontSize="8.5">SHA-256 canonical page record - state: PV - anchoring: PENDING RFC-3161</text>
          <text x="360" y="788" textAnchor="middle" fill="#3a3f48" fontSize="8.5">LAWCHAIN promotion: BLAKE3 + Ed25519 + RFC-3161 + Merkle {"\u2192"} QV {"\u2192"} PUB</text>
          <text x="360" y="808" textAnchor="middle" fill="#2a3040" fontSize="9" letterSpacing="1">rule: no verified proof {"\u2192"} no state change</text>

          {/* Arrow -> Verified history */}
          <line x1="360" y1="822" x2="360" y2="852" stroke="#00ff9c" strokeWidth="1" opacity="0.4" markerEnd="url(#arr-g)" />

          {/* VERIFIED HISTORY */}
          <rect x="60" y="854" width="600" height="70" fill="#060606" stroke="#00ff9c" strokeWidth="1" opacity="0.3" />
          <text x="360" y="876" textAnchor="middle" fill="#9aa2ae" fontSize="9" letterSpacing="2">VERIFIED OPERATIONAL HISTORY</text>
          <text x="360" y="896" textAnchor="middle" fill="#5a6578" fontSize="8.5">Output is portable, independently checkable operational history.</text>
          <text x="360" y="912" textAnchor="middle" fill="#3a3f48" fontSize="8.5">{`Not "trust me" system state.`}</text>
        </svg>
      </div>

      <h2>Control Logic</h2>
      <KBProtocolBlock>
        <span style={{ color: "#3a3f48" }}>instruction_in</span>{"\n"}
        {"  "}<span style={{ color: "#3a3f48" }}>{"\u2192"}</span> <span style={{ color: "#00ff9c" }}>validate_scope</span>{"\n"}
        {"  "}<span style={{ color: "#3a3f48" }}>{"\u2192"}</span> <span style={{ color: "#00ff9c" }}>validate_authority</span>{"\n"}
        {"  "}<span style={{ color: "#3a3f48" }}>{"\u2192"}</span> <span style={{ color: "#00ff9c" }}>validate_proportionality</span>{"\n"}
        {"  "}<span style={{ color: "#3a3f48" }}>{"\u2192"}</span> <span style={{ color: "#00ff9c" }}>capture_evidence_context</span>{"\n"}
        {"  "}<span style={{ color: "#3a3f48" }}>{"\u2192"}</span> <span style={{ color: "#00ff9c" }}>select_lane</span>(<span style={{ color: "#ffaa00" }}>PV</span> | <span style={{ color: "#ffaa00" }}>WV</span> | <span style={{ color: "#ffaa00" }}>QV</span> | <span style={{ color: "#ffaa00" }}>PUB</span>){"\n"}
        {"  "}<span style={{ color: "#3a3f48" }}>{"\u2192"}</span> <span style={{ color: "#00ff9c" }}>execute_routed_work</span>{"\n"}
        {"  "}<span style={{ color: "#3a3f48" }}>{"\u2192"}</span> <span style={{ color: "#00ff9c" }}>emit_receipt</span>{"\n"}
        {"  "}<span style={{ color: "#3a3f48" }}>{"\u2192"}</span> <span style={{ color: "#00ff9c" }}>anchor_receipt</span>{"\n"}
        {"  "}<span style={{ color: "#3a3f48" }}>{"\u2192"}</span> <span style={{ color: "#00ff9c" }}>expose_verified_state</span>{"\n"}
        <span style={{ color: "#3a3f48" }}>else</span>{"\n"}
        {"  "}<span style={{ color: "#3a3f48" }}>{"\u2192"}</span> <span style={{ color: "#ffaa00" }}>escalate_to_TEM</span> or <span style={{ color: "#ffaa00" }}>deny</span>
      </KBProtocolBlock>

      <h2>Architectural Readings</h2>
      <KBTable
        headers={["Component", "Role", "What It Is Not"]}
        rows={[
          ["QIN", "Admission controller and proof router", "Not the executor of trust-sensitive work"],
          ["TEM", "Boundary guardian \u2014 holds escalations", "Not a decision-maker \u2014 it holds, not resolves"],
          ["PV / WV / QV / PUB", "Orthogonal operational lanes", "Not sequential stages \u2014 orthogonal, not ordered"],
          ["LAWCHAIN", "Turns runtime events into portable proof history", "Not a trust assertion \u2014 a structural tamper witness"],
        ]}
      />

      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/qin-overview", label: "QIN Overview" },
          { href: "/knowledge-base/qin-trust-ladder", label: "Trust Promotion Ladder" },
          { href: "/knowledge-base/qin-layers", label: "Layer Reference" },
          { href: "/knowledge-base/runner-loop", label: "Full Runner Loop" },
          { href: "/runner-loop", label: "Standalone Diagram", external: true },
        ]}
      />
    </>
  );
}
