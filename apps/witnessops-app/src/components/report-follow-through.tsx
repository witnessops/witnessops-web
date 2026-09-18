'use client';
import { useId, useRef, useState } from 'react';
import Link from 'next/link';
import type { ProofpackReportV1 } from '../../../witnessops-web/src/lib/proofpack/report-model';
import type { ReportFollowThrough } from '../../../witnessops-web/src/components/proofpack/buyer-report';
import { PUBLIC_NO_SECRETS_NOTE, publicContactMailto } from '../../../witnessops-web/src/lib/public-contact';
import { findingAnchor, findingHelpRequest, recommendation, reportNextSteps } from '../lib/report-actions';

type Context = { evidenceHref: (finding: ProofpackReportV1['findings'][number]) => string; recheckHref?: string; linux: boolean };
function HelpDraft({ model, finding }: { model: ProofpackReportV1; finding: ProofpackReportV1['findings'][number] }) {
  const [open, setOpen] = useState(false), [title, setTitle] = useState(finding.title), [question, setQuestion] = useState(''), [neededBy, setNeededBy] = useState(''), [includeTarget, setIncludeTarget] = useState(false), [message, setMessage] = useState('');
  const trigger = useRef<HTMLButtonElement>(null), id = useId();
  const text = findingHelpRequest({ title: includeTarget ? title : title.replaceAll(model.subject.label, '[target omitted]'), method: `${model.identity.productName} ${model.identity.productVersion}`, observedAt: model.subject.observedAt, synthetic: model.identity.synthetic, question, neededBy, ...(includeTarget ? { target: model.subject.label } : {}) });
  function close() { setOpen(false); setQuestion(''); setNeededBy(''); setIncludeTarget(false); setTitle(finding.title); setMessage(''); trigger.current?.focus(); }
  return <div className="finding-interactive"><button type="button" className="button secondary" ref={trigger} aria-expanded={open} aria-controls={id} onClick={() => setOpen(true)}>Ask about this finding</button>{open && <section id={id} className="finding-draft" aria-label="Finding help request" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
    <h4>Prepare a help request</h4><p>Review the exact text below. Nothing is sent here. Opening an email draft is not sending it.</p>
    <p>Finding titles can contain sensitive details. Edit before copying or opening email. {PUBLIC_NO_SECRETS_NOTE}</p>
    <label>Finding title<input autoFocus value={title} maxLength={500} onChange={e => setTitle(e.target.value)} /></label>
    <label>What I need to establish<textarea value={question} maxLength={1500} onChange={e => setQuestion(e.target.value)} /></label>
    <label>Needed by (optional)<input value={neededBy} maxLength={100} onChange={e => setNeededBy(e.target.value)} /></label>
    <label className="authorization"><input type="checkbox" checked={includeTarget} onChange={e => setIncludeTarget(e.target.checked)} />Include target: {model.subject.label}</label>
    <p>No raw evidence, attachments, member details or Share links are added.</p><pre aria-label="Request preview">{text}</pre>
    <div className="actions"><button type="button" className="button" disabled={!question.trim() || !title.trim()} onClick={() => void navigator.clipboard.writeText(text).then(() => setMessage('Request copied. Nothing sent.')).catch(() => setMessage('Copy failed. Select and copy the preview text.'))}>Copy request</button>
    {question.trim() && title.trim() ? <a className="button secondary" href={`${publicContactMailto('WitnessOps — Finding question')}&body=${encodeURIComponent(text)}`}>Open email draft</a> : null}
    <button type="button" className="button secondary" onClick={close}>Cancel draft</button></div><p role="status">{message}</p>
  </section>}</div>;
}
function Summary({ model, interactive }: { model: ProofpackReportV1; interactive: boolean }) {
  const next = reportNextSteps(model);
  return <section className="report-next-steps" aria-label="What to do next"><h3>What to do next</h3>
    <p>{next.kind === 'attention' ? 'Start with the recorded recommendations below. This is recorded order, not a new risk ranking.' : next.kind === 'unknown' ? 'Some outcomes remain undetermined. Obtain the missing evidence or agree a suitable authorized follow-up; a collection gap is not a vulnerability.' : next.kind === 'informational' ? 'These findings provide context for an owner decision, not urgent remediation.' : 'No attention findings were recorded. Keep or share this bounded baseline and repeat after a relevant change. This does not establish overall security.'}</p>
    {next.findings.map(f => <div className="report-next-item" key={f.id}><strong>{f.title}</strong><p>{f.severity === null ? 'Severity not assessed' : `Recorded severity: ${f.severity}`}</p><p>{recommendation(f)}</p>{interactive && <a className="finding-interactive" href={`#${findingAnchor(model.findings.indexOf(f))}`}>Inspect finding →</a>}</div>)}
    {interactive && <a className="finding-interactive" href="#report-all-findings">View all findings →</a>}
    <p><strong>{next.gaps.length} collection gaps · {next.undetermined === null ? 'Individual undetermined-check total not recorded' : `${next.undetermined} undetermined checks`} · {next.unknowns.length} recorded unknowns/limitations</strong></p>
    {next.gaps.slice(0, 3).map(g => <p key={g.id}><strong>{g.label}</strong>: {g.reason}</p>)}
    {next.unknowns.filter(u => u.evidenceNeeded).slice(0, 3).map(u => <p key={u.id}><strong>{u.title}</strong>: {u.reason} Evidence needed: {u.evidenceNeeded}</p>)}
    {(next.gaps.length > 0 || next.unknowns.length > 0) && <details open={!interactive}><summary>Missing evidence and recorded limits</summary>{next.gaps.map(g => <p key={g.id}><strong>{g.label}</strong>: {g.reason}</p>)}{next.unknowns.map(u => <div key={u.id}><strong>{u.title}</strong><p>{u.reason}</p>{u.evidenceNeeded && <p>Evidence needed: {u.evidenceNeeded}</p>}</div>)}</details>}
  </section>;
}
function Finding({ model, finding, context, interactive }: { model: ProofpackReportV1; finding: ProofpackReportV1['findings'][number]; context: Context; interactive: boolean }) {
  const value = typeof finding.observation === 'string' ? finding.observation : JSON.stringify(finding.observation, null, 2) ?? 'Not recorded';
  return <div className="finding-follow-through"><h4>What we observed</h4><pre>{value.length > 2400 ? value.slice(0, 2400) + '\n[Display shortened. Inspect evidence for the recorded source.]' : value}</pre>
    <h4>What it means within this scope</h4><p>{finding.interpretation || 'No separate interpretation was recorded. Read the observation alongside its limits.'}</p>
    <h4>Recommended next step</h4><p>{recommendation(finding)}</p><h4>Check afterward</h4><p>An appropriate follow-up test still needs to be agreed. A fresh result does not by itself establish closure or comparability.</p>
    <h4>What remains unproved</h4>{finding.limitations.length ? <ul>{finding.limitations.map((limit, i) => <li key={i}>{limit}</li>)}</ul> : <p>No finding-specific limitations recorded. The report scope and unknowns still apply.</p>}
    {interactive && <><div className="actions finding-interactive"><Link href={context.evidenceHref(finding)}>Inspect evidence →</Link>{context.recheckHref ? <Link href={context.recheckHref}>{context.linux ? 'Open fresh-result / import steps' : 'Check again'} →</Link> : <span>Viewer access: ask an Owner or Contributor to arrange a fresh check.</span>}</div><HelpDraft key={`${model.identity.sourceDigest}:${finding.id}`} model={model} finding={finding}/></>}
  </div>;
}
export function reportFollowThrough(model: ProofpackReportV1, context: Context, interactive = true): ReportFollowThrough {
  return { interactive, summary: <Summary model={model} interactive={interactive}/>, finding: finding => <Finding model={model} finding={finding} context={context} interactive={interactive}/> };
}
