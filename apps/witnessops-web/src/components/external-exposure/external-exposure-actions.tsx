'use client';
import { useState } from 'react';
import { administratorTask, exposureNextActions, type ExposureCheckSummary, type ExposureNextAction } from '@/lib/external-exposure/next-actions';
import styles from './external-exposure.module.css';

type Context = { hostname: string; observedAt: string | null; example: boolean };

function ActionCard({ action, context }: { action: ExposureNextAction; context: Context }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const task = administratorTask(action, context);
  async function copy() {
    try {
      await navigator.clipboard.writeText(task);
      setCopyState('copied');
    } catch {
      setCopyState('manual');
    }
  }
  return <li className={styles.actionCard} data-action-status={action.check.status}>
    <p className={styles.actionLabel}>{action.label} · {action.check.status === 'CHECK_ERROR' ? 'Collection error' : action.check.status === 'UNDETERMINED' ? 'Undetermined' : 'Needs attention'}</p>
    <h4>{action.check.title}</h4>
    <p>{action.check.interpretation}</p>
    <dl>
      <div><dt>Suggested next step</dt><dd>{action.followUp}</dd></div>
      <div><dt>Who can help</dt><dd>{action.owner}</dd></div>
      <div><dt>How to check again</dt><dd>{action.recheck}</dd></div>
    </dl>
    <details><summary>Supporting detail and limits</summary><ul>{[...action.check.evidence, ...action.check.limitations].map((item, index) => <li key={index}>{item}</li>)}</ul></details>
    <button type="button" onClick={copy} aria-label={`Copy task for my administrator: ${action.check.title}`}>Copy task for my administrator</button>
    <p className={styles.copyStatus} role="status">{copyState === 'copied' ? 'Task copied. Nothing was sent.' : copyState === 'manual' ? 'Clipboard unavailable. Select and copy the task below.' : ''}</p>
    {copyState === 'manual' && <textarea className={styles.taskText} aria-label={`Administrator task: ${action.check.title}`} value={task} readOnly onFocus={event => event.currentTarget.select()} />}
  </li>;
}

export function ExternalExposureActions({ checks, ...context }: Context & { checks: readonly ExposureCheckSummary[] }) {
  const actions = exposureNextActions(checks);
  return <section className={styles.nextActions} aria-labelledby="next-actions-heading">
    <h3 id="next-actions-heading">Your next actions</h3>
    <p>Start with the responsible administrator. These follow-ups are not a severity ranking and do not authorize changes.</p>
    {actions.length ? <ul className={styles.actionGrid}>{actions.map(action => <ActionCard key={action.check.check_id} action={action} context={context} />)}</ul>
      : <p>No follow-up task was identified by these ten checks. Keep the snapshot as a dated reference; it does not establish overall security.</p>}
  </section>;
}
