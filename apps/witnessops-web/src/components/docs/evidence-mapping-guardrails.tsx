export function EvidenceMappingGuardrails() {
  return (
    <section className="mb-10 rounded-2xl border border-amber-500/30 bg-amber-500/8 p-6">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
        Evidence-Mapping Template Only
      </div>
      <p className="mt-3 text-sm leading-6 text-text-secondary">
        This page is an evidence-mapping template. It does not state that WitnessOps is
        compliant with any framework, law, or regulation. It helps teams map emitted
        artifacts and verification records to external requirements.
      </p>

      <h2 className="mt-8 text-2xl font-semibold text-text-primary">Shared trust boundary</h2>
      <ul className="mt-4 list-inside list-disc space-y-2 text-text-secondary">
        <li>
          <strong>WitnessOps emits governed execution evidence</strong> such as receipts,
          manifests, approval-linked records, execution metadata, and preserved artifacts.
        </li>
        <li>
          <strong>Independent verification checks evidence</strong> such as signatures,
          integrity, continuity, and correspondence between declared scope and stored
          records.
        </li>
        <li>
          <strong>Neither product makes the external framework determination on its own.</strong>{" "}
          Control design, legal interpretation, policy ownership, and organizational
          accountability remain external.
        </li>
      </ul>

      <h2 className="mt-8 text-2xl font-semibold text-text-primary">Shared trust assumptions</h2>
      <p className="mt-4 leading-7 text-text-secondary">
        Record any assumptions that apply before relying on this mapping:
      </p>
      <ul className="mt-4 list-inside list-disc space-y-2 text-text-secondary">
        <li>host integrity remains a trust assumption</li>
        <li>tool and adapter integrity remain trust assumptions</li>
        <li>signing key control and availability remain trust assumptions</li>
        <li>
          scope definitions, identity sources, and approval policy configuration remain
          trust assumptions
        </li>
        <li>some controls, reviews, and legal interpretations remain manual or organization-owned</li>
      </ul>

      <h2 className="mt-8 text-2xl font-semibold text-text-primary">
        Shared failure-state explanation
      </h2>
      <p className="mt-4 leading-7 text-text-secondary">
        This mapping is only as strong as the governed evidence chain.
      </p>
      <p className="mt-4 leading-7 text-text-secondary">
        If approvals, scope records, receipts, manifests, or verification outputs are
        missing, inconsistent, or uncheckable, then the activity is not fully supported
        by the governed execution record. That does not prove the activity was invalid,
        but it does mean the auditor or reviewer cannot rely on this template alone to
        establish traceable governed execution.
      </p>
    </section>
  );
}
