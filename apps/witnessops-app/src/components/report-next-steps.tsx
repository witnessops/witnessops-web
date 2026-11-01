"use client";

import { useId } from 'react';
import type { ProofpackReportV1 } from '../../../witnessops-web/src/lib/proofpack/report-model';
import { reportFollowUpGuidance, type FollowUpTarget, type ReportFollowUpItem } from '../lib/report-follow-up-model';
import styles from './report-next-steps.module.css';

type Props = { model: ProofpackReportV1; onInspect?: (target: FollowUpTarget) => void };
const labels = { evidence: 'Clarify the evidence', attention: 'Review the finding', information: 'Optional review' };

function FollowUpCard({ item, onInspect }: { item: ReportFollowUpItem; onInspect?: Props['onInspect'] }) {
  return <li className={styles.card} data-kind={item.kind}>
    <div className={styles.cardHeading}><span className={styles.kind}>{labels[item.kind]}</span><h4>{item.title}</h4></div>
    <div className={styles.recorded}><h5>What the report records</h5>{item.recordedReasons.map((reason, index) => <p key={index}>{reason}</p>)}
      {item.recordedNextStep && <p><strong>Recorded guidance:</strong> {item.recordedNextStep}</p>}
    </div>
    <dl className={styles.guidance}><div><dt>Evidence to seek</dt><dd>{item.suggested.evidence}</dd></div><div><dt>Suggested next action</dt><dd>{item.suggested.action}</dd></div></dl>
    {item.target && onInspect && <button type="button" className={styles.inspect} aria-label={`Inspect recorded item: ${item.title}`} onClick={() => { if (item.target) onInspect(item.target); }}>Inspect recorded item <span aria-hidden="true">→</span></button>}
  </li>;
}

/** App guidance stays outside the immutable report and its exports. */
export function ReportNextSteps({ model, onInspect }: Props) {
  const id = useId();
  const guidance = reportFollowUpGuidance(model);
  const visible = guidance.items.slice(0, 3), remaining = guidance.items.slice(3);
  return <section className={styles.panel} aria-labelledby={`${id}-heading`}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Plan the follow-up</p><h3 id={`${id}-heading`}>What would help next?</h3></div>
      {guidance.evidenceGapCount > 0 && <span className={styles.count}>{guidance.evidenceGapCount} {guidance.evidenceGapCount === 1 ? 'evidence gap' : 'evidence gaps'} to clarify</span>}
    </header>
    <p className={styles.intro}>App-suggested guidance, separate from the saved report. Missing or inconclusive evidence comes first; it does not by itself establish a vulnerability.</p>
    {model.identity.synthetic && <p className={styles.notice}>Synthetic / illustrative report: these steps are examples, not actions against a customer system.</p>}
    {guidance.incompleteCheckLedger && <p className={styles.notice}>No complete individual-check ledger is available. Guidance uses recorded findings and collection gaps; no passing outcomes are inferred.</p>}
    {visible.length ? <ol className={styles.cards}>{visible.map(item => <FollowUpCard key={item.key} item={item} onInspect={onInspect} />)}</ol>
      : <p className={styles.empty}>No finding or collection gap supplies a specific follow-up item. Review the report’s scope and unknowns before deciding whether more evidence is needed; this is not an all-clear.</p>}
    {remaining.length > 0 && <details className={styles.more}><summary>More follow-up items ({remaining.length})</summary><ol className={styles.cards} start={4}>{remaining.map(item => <FollowUpCard key={item.key} item={item} onInspect={onInspect} />)}</ol></details>}
    <p className={styles.boundary}>These suggestions do not run checks, save recommendations or change evidence. Agree any collection or system change with the responsible owner. The report’s scope and material unknowns still apply.</p>
  </section>;
}
