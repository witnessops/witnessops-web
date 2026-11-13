import styles from "./simple-homepage.module.css";

/**
 * Synthetic example record. Moved from the homepage to the review page by the
 * homepage cut (2026-11-13); `#example-record` is the homepage link target.
 */
export function AgentActionExampleRecord({ headline }: { headline: string }) {
  return <section id="example-record" className={styles.exampleRecord} aria-labelledby="example-record-heading" data-agent-action-specimen>
    <p className={styles.eyebrow}>Historical synthetic one-action example</p>
    <h2 id="example-record-heading">{headline}</h2>
    <div className={styles.labels}><span>Illustrative · shape only</span><span>Designed, not executed</span></div>
    <dl className={`${styles.specimenRows} crop`}>
      <div><dt>Consequential action</dt><dd><code>refund.issue</code> above a set amount, through a payments API — an illustrative action, not an executed one.<small>One action per review. Chosen with you before evidence rules are agreed.</small></dd></div>
      <div><dt>Executing identity</dt><dd><code>svc-agent-refunds@example.com</code> — a reserved example of the identity an agent would run as, not the one that configured it.</dd></div>
      <div><dt>Permission / authority boundary</dt><dd>The roles, scopes and approval steps that stand between an identity and an action, as configured.<small>Read from configuration under agreed evidence rules. Not assumed; none inspected here.</small></dd></div>
      <div><dt>Supporting evidence</dt><dd>Policy exports, the tool manifest, approval configuration and action logs for an agreed window — each attached to the claim it supports.<small>Collected only after evidence handling is agreed. No evidence was collected for this illustration.</small></dd></div>
      <div data-finding-slot="unfilled"><dt>Finding</dt><dd>A written statement of what an identity is permitted to do relative to an action, and what happens when it does it — with the evidence beside each claim.<small>Written after review. This specimen carries no finding.</small></dd></div>
      <div><dt>Explicit unknowns</dt><dd>What the evidence did not establish — for instance whether an action was exercised in the agreed window, or whether a human step exists outside the systems inspected.<small>Named in writing. These are example questions, not results.</small></dd></div>
    </dl>
    <p className={styles.exampleNote}>Illustrative. Reserved documentation names. No customer, execution, verification, authorisation failure or result is shown. This is the shape of a record, not a record.</p>
  </section>;
}
