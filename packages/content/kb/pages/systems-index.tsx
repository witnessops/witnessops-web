import { KBCallout } from "../components/KBCallout";
import { KBTable } from "../components/KBTable";
import { KBRelatedLinks } from "../components/KBRelatedLinks";

export default function SystemsIndexContent() {
  return (
    <>
      <h2>Subsystems</h2>

      <h3>QIN — Operator Spine</h3>
      <p>QIN is the live operator layer responsible for scope validation, authorization checks, and routing instructions into the verified execution pipeline. It enforces the preconditions under which trust can be generated.</p>
      <ul>
        <li><strong>Overview</strong> — Role and boundaries of QIN</li>
        <li><strong>Trust Promotion Ladder</strong> — L1 → L5 chain behavior</li>
        <li><strong>Operator Oath</strong> — Enforceable operator constraints</li>
        <li><strong>Layer Reference</strong> — QIN, PV, WV, QV, PUB defined</li>
        <li><strong>Deployment</strong> — Infrastructure and anchoring stack</li>
      </ul>
      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/qin-overview", label: "Enter QIN" },
          { href: "/runner-loop", label: "Standalone Diagram", external: true },
        ]}
      />

      <h3>VaultMesh Core</h3>
      <p>The constitutional, economic, and infrastructural substrate of the system. Core defines the organs, invariants, architectural axes, anchoring protocols, and regulatory mapping used across all subsystems.</p>
      <ul>
        <li><strong>Architecture</strong> — Proof-first governance design</li>
        <li><strong>Proof Bundle (VPB)</strong> — Structure and promotion state</li>
        <li><strong>LAWCHAIN Protocol</strong> — Hashing, signatures, timestamps, Merkle anchoring</li>
        <li><strong>Six Organs</strong> — Governance, Automation, Treasury, Federation, {"\u03A8"}-Field, Infrastructure</li>
        <li><strong>Engineer Invariants</strong> — Enforceable behavioral constraints</li>
        <li><strong>Regulatory Layer</strong> — Alignment with DORA, NIS2, EU AI Act</li>
      </ul>
      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/core-overview", label: "Enter VaultMesh Core" },
        ]}
      />

      <h3>OFFSEC</h3>
      <p>The adversarial and defensive verification subsystem. OFFSEC transforms operator actions, investigations, and decisions into promotable, regulatory-grade proof aligned with QIN{"'"}s scope enforcement.</p>
      <ul>
        <li><strong>Platform Overview</strong> — Purpose and boundaries</li>
        <li><strong>Operations</strong> — Execution rules and timing envelopes</li>
        <li><strong>Evidence</strong> — QV-grade evidence structure</li>
        <li><strong>Governance</strong> — Authorization, escalation, regulatory timing</li>
        <li><strong>Runbooks</strong> — Standardized workflows</li>
        <li><strong>Receipt Spec</strong> — Required artifacts and format rules</li>
        <li><strong>Full Runner Loop</strong> — QIN → PV → WV → QV → PUB → Return</li>
      </ul>
      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/offsec-toc", label: "Enter OFFSEC" },
        ]}
      />

      <h2>Navigation Model</h2>
      <p>VaultMesh is structured so each subsystem forms a vertical slice of the overall proof system. Reading order:</p>
      <ul>
        <li><strong>QIN</strong> — Operator intake, routing, and constraints</li>
        <li><strong>VaultMesh Core</strong> — Invariants, anchoring, regulatory mapping</li>
        <li><strong>OFFSEC</strong> — Evidence, operations, runbooks, promotion</li>
      </ul>

      <KBCallout variant="go" label="Subsystem Invariant">
        <p>Subsystems are orthogonal. QIN cannot override Core. OFFSEC cannot bypass QIN. Core cannot self-modify without producing a contradiction in the anchoring chain.</p>
      </KBCallout>

      <h2>System Boundaries</h2>
      <KBTable
        headers={["Subsystem", "Owns", "Does Not Own"]}
        rows={[
          ["QIN", "Scope validation, auth checks, runbook selection, L1 manifest", "Execution, evidence capture, promotion decisions"],
          ["VaultMesh Core", "Invariants, anchoring stack, proof bundle spec, regulatory mapping", "Operational decisions, scope definition, operator identity"],
          ["OFFSEC", "Evidence capture, operation execution, escalation, runbooks", "Authorization, anchoring, regulatory submission"],
        ]}
      />

      <KBRelatedLinks
        links={[
          { href: "/knowledge-base/qin-overview", label: "QIN Overview" },
          { href: "/knowledge-base/core-overview", label: "Core Architecture" },
          { href: "/knowledge-base/offsec-toc", label: "OFFSEC Index" },
          { href: "/knowledge-base/runner-loop", label: "Full Runner Loop" },
          { href: "/runner-loop", label: "Standalone Diagram", external: true },
        ]}
      />
    </>
  );
}
