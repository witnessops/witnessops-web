"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { logout } from '../app/actions/logout';
import { EARLY_ACCESS_DATA_NOTE, type ClientEvent, type EarlyAccessState, type FeedbackDecision, type FeedbackResponse, type FeedbackSurface } from '../lib/early-access';
import type { Run, Workspace } from '../lib/model';
import { PUBLIC_NO_SECRETS_NOTE, publicContactMailto } from '../../../witnessops-web/src/lib/public-contact';
import { EXTERNAL_ATTACK_SURFACE_OFFER } from '../../../witnessops-web/src/lib/commercial-truth';

const requestAccess = publicContactMailto('WitnessOps — Request Early Access');
export function AccessGate({ state, busy, activate }: { state: EarlyAccessState; busy: boolean; activate: () => void }) {
  return <div className="welcome"><p className="eyebrow">External Exposure · Early Access</p><h1>{state === 'invited' ? 'Your Early Access is ready' : state === 'paused' ? 'Early Access is paused' : 'Request Early Access'}</h1><p>{state === 'invited' ? 'Open a workspace, add a public hostname, and explicitly run your first saved observation.' : state === 'paused' ? 'Your access is paused. Saved workspace data has not been deleted. Contact us to discuss access.' : "We’re opening WitnessOps to a small number of users while we refine the product. Signing in does not automatically grant access."}</p><p className="quiet">A public /check snapshot is not imported. You will explicitly authorize a fresh saved observation in your workspace.</p><div className="actions">{state === 'invited' ? <button className="button" disabled={busy} onClick={activate}>Activate Early Access</button> : <a className="button" href={requestAccess}>{state === 'paused' ? 'Contact WitnessOps' : 'Request Early Access'}</a>}<form action={logout}><button className="button secondary">Sign out</button></form></div><p className="quiet">{EARLY_ACCESS_DATA_NOTE}</p></div>;
}

async function activityRequest(workspaceId: string, endpoint: 'events' | 'feedback', data?: unknown) {
  const response = await fetch(`/api/${endpoint}`, { method: data === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'X-WitnessOps-Workspace': workspaceId, ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: data === undefined ? undefined : JSON.stringify(data) });
  if (!response.ok) throw new Error('Feedback could not be saved. You can continue using the result.');
  return response.json();
}
type Activity = { event: (name: ClientEvent, run: Run, checkId?: string) => void; decisions: FeedbackDecision[] | null; submit: (surface: FeedbackSurface, run: Run, response: FeedbackResponse, comment: string | null) => Promise<void> };
const ActivityContext = createContext<Activity>({ event: () => {}, decisions: null, submit: async () => {} });
export const useProductActivity = () => useContext(ActivityContext);

/** Behavior collection is best-effort and has no authority over a run. Server
 * uniqueness also prevents duplicate counts across tabs/reloads. */
export function ProductActivity({ workspace, children }: { workspace: Workspace | null; children: ReactNode }) {
  const pathname = usePathname();
  const workspaceId = workspace?.id;
  const [decisions, setDecisions] = useState<FeedbackDecision[] | null>(null);
  const sent = useRef(new Set<string>());
  useEffect(() => {
    setDecisions(null);
    if (!workspaceId) return;
    let active = true;
    activityRequest(workspaceId, 'feedback').then(value => { if (active) setDecisions(value); }).catch(() => { /* Suppress optional prompts when state is unavailable. */ });
    return () => { active = false; };
  }, [workspaceId]);
  const event = useCallback((name: ClientEvent, run: Run, checkId?: string) => {
    if (!workspaceId) return;
    const key = `${workspaceId}:${name}:${run.id}:${checkId ?? ''}`;
    if (sent.current.has(key)) return;
    sent.current.add(key);
    void activityRequest(workspaceId, 'events', { name, runId: run.id, checkId: checkId ?? null }).catch(() => {});
  }, [workspaceId]);
  useEffect(() => {
    if (!workspace) return;
    const parts = pathname.split('/').filter(Boolean);
    const run = workspace.runs.find(item => item.id === parts[1]);
    if (run && parts[0] === 'reports' && parts.length === 2) event('report_opened', run);
    if (run && parts[0] === 'runs') {
      if (parts.length === 2) event('observation_opened', run);
      if (parts.length === 4 && parts[2] === 'observations' && run.snapshot.checks.some(check => check.check_id === parts[3])) event('evidence_opened', run, parts[3]);
    }
  }, [workspace, pathname, event]);
  async function submit(surface: FeedbackSurface, run: Run, response: FeedbackResponse, comment: string | null) {
    if (!workspace) return;
    const decision = await activityRequest(workspace.id, 'feedback', { surface, runId: run.id, response, comment });
    setDecisions(previous => [...(previous ?? []), decision]);
  }
  return <ActivityContext.Provider value={{ event, decisions, submit }}>{children}</ActivityContext.Provider>;
}

export function ComparisonViewed({ run, children }: { run: Run; children: ReactNode }) {
  const { event } = useProductActivity();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { event('comparison_viewed', run); observer.disconnect(); } }, { threshold: 0.15 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [event, run]);
  return <div ref={ref}>{children}</div>;
}

export function RunFeedback({ workspace, run, comparison = false }: { workspace: Workspace; run: Run; comparison?: boolean }) {
  const { decisions, submit } = useProductActivity();
  const [response, setResponse] = useState<'yes' | 'not_really' | ''>('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dismissedLocally, setDismissedLocally] = useState(false);
  const surface = comparison ? 'comparison' : 'first_run';
  const first = [...workspace.runs].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))[0];
  if (!decisions || decisions.some(item => item.surface === surface) || dismissedLocally || (!comparison && first?.id !== run.id)) return null;
  async function send(answer: FeedbackResponse) {
    if (busy) return;
    setBusy(true); setError('');
    try { await submit(surface, run, answer, answer === 'dismissed' ? null : comment.trim() || null); }
    catch { if (answer === 'dismissed') setDismissedLocally(true); else setError('Feedback could not be saved. You can continue using the result.'); }
    finally { setBusy(false); }
  }
  return <aside className="feedback-panel" aria-label={comparison ? 'Comparison feedback' : 'First observation feedback'}><form onSubmit={e => { e.preventDefault(); if (response) void send(response); }}><h3>{comparison ? 'Was this comparison useful?' : 'Did this result tell you something useful?'}</h3><fieldset disabled={busy}><legend className="sr-only">Your response</legend><div className="feedback-choices">{[['yes', 'Yes'], ['not_really', 'Not really']].map(([value, label]) => <label key={value}><input type="radio" name={`feedback-${surface}`} value={value} checked={response === value} onChange={() => setResponse(value as 'yes' | 'not_really')} />{label}</label>)}</div></fieldset>{response ? <><label htmlFor={`feedback-${surface}`}>{comparison ? 'What would you want WitnessOps to check next?' : 'What was useful or missing?'} <span className="quiet">(optional)</span></label><textarea id={`feedback-${surface}`} maxLength={500} value={comment} onChange={e => setComment(e.target.value)} disabled={busy} rows={2} /><p className="quiet">{PUBLIC_NO_SECRETS_NOTE} Feedback stays separate from your evidence.</p></> : null}<div className="actions">{response ? <button className="button secondary" disabled={busy}>{busy ? 'Saving…' : 'Send feedback'}</button> : null}<button type="button" className="text-action" disabled={busy} onClick={() => void send('dismissed')}>Not now</button></div>{error ? <p role="status">{error}</p> : null}</form></aside>;
}

export function DeeperReview({ run }: { run: Run }) {
  const { event } = useProductActivity();
  return <p className="quiet deeper-review">Need deeper investigation? <a className="text-action" href={`https://witnessops.com${EXTERNAL_ATTACK_SURFACE_OFFER.route.en}`} onClick={() => event('deeper_review_clicked', run)}>See the External Attack Surface Review scope →</a></p>;
}
