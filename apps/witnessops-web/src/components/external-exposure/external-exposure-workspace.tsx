'use client';
/* eslint-disable @next/next/no-html-link-for-pages */
import { useEffect, useRef, useState } from 'react';
import { BuyerReportDocument } from '@/components/proofpack/buyer-report';
import { createReportModel, printBuyerReport, type ProofpackReportV1, type ReportModelInput } from '@/lib/proofpack/report-model';
import { EXCLUSIONS, EXTERNAL_VERSION, SNAPSHOT_BOUNDARY, type ExternalSnapshotV1, type CheckStatus } from '@/lib/external-exposure/contracts';
import { EXTERNAL_ATTACK_SURFACE_OFFER } from '@/lib/commercial-truth';
import styles from './external-exposure.module.css';

const statusLabels: Record<CheckStatus, string> = {
  OBSERVED_EXPECTED: 'Observed as expected', NEEDS_ATTENTION: 'Needs attention',
  INFORMATIONAL: 'Informational', UNDETERMINED: 'Undetermined', CHECK_ERROR: 'Collection error',
};
const CHECK_TOPICS = ['Public DNS target', 'TLS certificate', 'Legacy TLS', 'HTTPS redirect', 'HSTS', 'Response headers', 'security.txt', 'SPF', 'DMARC', 'CAA'];
function saveSource(snapshot: ExternalSnapshotV1) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `external-exposure-${snapshot.target}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExternalExposureWorkspace() {
  const [hostname, setHostname] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ snapshot: ExternalSnapshotV1; model: ProofpackReportV1 } | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const active = useRef<{ id: number; controller: AbortController } | null>(null);
  const sequence = useRef(0);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => () => { active.current?.controller.abort(); }, []);

  function clearResult(nextHostname = hostname) {
    sequence.current += 1;
    active.current?.controller.abort();
    active.current = null;
    setBusy(false);
    setHostname(nextHostname);
    setResult(null);
    setReportOpen(false);
    setError('');
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current) return;
    const id = ++sequence.current;
    const controller = new AbortController();
    active.current = { id, controller };
    setBusy(true);
    setError('');
    setResult(null);
    setReportOpen(false);
    try {
      const response = await fetch('/api/external-exposure', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname }), cache: 'no-store', signal: controller.signal,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'The snapshot could not be completed.');
      if (id !== sequence.current) return;
      if (payload.snapshot?.version !== EXTERNAL_VERSION || payload.model?.identity?.productId !== 'external-exposure-snapshot' || payload.model?.subject?.label !== payload.snapshot?.target) throw new Error('The returned snapshot data could not be admitted.');
      const model = createReportModel(payload.model as ReportModelInput);
      setResult({ snapshot: payload.snapshot, model });
      requestAnimationFrame(() => resultHeading.current?.focus());
    } catch (cause) {
      if (id === sequence.current && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'The snapshot could not be completed.');
    } finally {
      if (id === sequence.current) { active.current = null; setBusy(false); }
    }
  }

  return <main id="main-content" className={styles.workspace}>
    <div className={styles.screen}>
      <header className={styles.header}><a href="/" className={styles.brand}>WITNESSOPS</a><span>PUBLIC OBSERVATIONS · FREE CHECK</span></header>
      <section className={styles.intro}>
        <p className={styles.eyebrow}>ONE HOSTNAME. TEN OBSERVATIONS.</p>
        <h1>External Exposure Snapshot</h1>
        <p className={styles.lead}>See what a few public signals reveal about your hostname. Get the observations, their limits and a report you can keep.</p>
        <p className={styles.muted}>Free. No email or account. Results stay in this page until you clear or leave it.</p>
      </section>
      <form className={styles.form} onSubmit={submit} aria-label="Run an external exposure snapshot">
        <label htmlFor="external-hostname">Public hostname</label>
        <div className={styles.inputRow}><input id="external-hostname" name="hostname" type="text" autoComplete="off" spellCheck={false} autoCapitalize="none" maxLength={253} placeholder="example.com" aria-describedby="hostname-help" value={hostname} onChange={event => clearResult(event.target.value)} required /><button type="submit" disabled={busy || !hostname.trim()}>{busy ? 'Collecting observations…' : 'Run free snapshot'}</button></div>
        <p id="hostname-help">Enter a hostname you own or are authorized to check. Use only the hostname, without https://, a path or a port.</p>
        <p className={styles.muted}>WitnessOps sends bounded public DNS queries and TLS/HTTP requests on ports 80/443. No credentials, login, subdomain enumeration or exploitation. No result storage by this feature.</p>
        <div className={styles.actions}>{busy && <button type="button" onClick={() => clearResult()}>Cancel</button>}{(result || error) && <button type="button" onClick={() => clearResult('')}>Clear</button>}</div>
        {busy && <p role="status">Collection is limited to 30 seconds, followed by brief report processing. Cancel hides the result; the bounded server run may finish.</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
      </form>
      {!result && <section className={styles.included}><h2>What is included?</h2><ul>{CHECK_TOPICS.map(topic => <li key={topic}>{topic}</li>)}</ul><p>{SNAPSHOT_BOUNDARY}</p><details><summary>What is excluded?</summary><ul>{EXCLUSIONS.map(item => <li key={item}>{item}</li>)}</ul></details></section>}
      {result && <>
        <section className={styles.result} aria-label="Snapshot results">
          <p className={styles.eyebrow}>UNSIGNED OBSERVATIONS</p>
          <h2 ref={resultHeading} tabIndex={-1}>{result.snapshot.target}</h2>
          <p className={styles.muted}>Observed {result.snapshot.finished_at} · {((Date.parse(result.snapshot.finished_at) - Date.parse(result.snapshot.started_at)) / 1000).toFixed(1)} seconds · {EXTERNAL_VERSION}</p>
          <div className={styles.counts}>{(Object.keys(statusLabels) as CheckStatus[]).map(status => <div key={status}><strong>{result.snapshot.checks.filter(check => check.status === status).length}</strong><span>{statusLabels[status]}</span></div>)}</div>
          <p>No score or severity ranking is assigned. “Observed as expected” describes a named check, not overall security.</p>
          <div className={styles.checks}>{result.snapshot.checks.map(check => <details key={check.check_id} className={styles.check} data-status={check.status}><summary><span>{check.title}</span><strong>{statusLabels[check.status]}</strong></summary><p><strong>Method:</strong> {check.method}</p><p>{check.interpretation}</p><pre>{typeof check.observation === 'string' ? check.observation : JSON.stringify(check.observation, null, 2)}</pre>{check.recommendation && <p><strong>Next step:</strong> {check.recommendation}</p>}<p className={styles.muted}>{check.limitations.join(' ')}</p><p className={styles.evidence}>{check.check_id} · {check.status} · Evidence: {check.evidence.join(', ')}</p></details>)}</div>
          <div className={styles.actions}><button type="button" onClick={() => setReportOpen(value => !value)}>{reportOpen ? 'Hide report preview' : 'Preview buyer report'}</button><button type="button" onClick={() => printBuyerReport(result.model, () => window.print())}>Save report as PDF</button><button type="button" onClick={() => saveSource(result.snapshot)}>Download source JSON</button></div>
          <p className={styles.muted}>PDF uses your browser’s print dialog. Its “Snapshot data checks: Passed” label means the report data passed structural checks. The observations are unsigned.</p>
        </section>
        <section className={styles.boundary} aria-label="Snapshot scope and limits"><h2>Read the limits alongside the result.</h2><p>{SNAPSHOT_BOUNDARY}</p><details><summary>Declared exclusions</summary><ul>{EXCLUSIONS.map(item => <li key={item}>{item}</li>)}</ul></details></section>
      </>}
      <aside className={styles.offer}><div><p className={styles.eyebrow}>FOR A BROADER, AUTHORIZED REVIEW</p><h2>{EXTERNAL_ATTACK_SURFACE_OFFER.name.en}</h2><p>{EXTERNAL_ATTACK_SURFACE_OFFER.result.en}</p><p><strong>{EXTERNAL_ATTACK_SURFACE_OFFER.price.en}</strong> for one authorized public-facing system.</p></div><a href={EXTERNAL_ATTACK_SURFACE_OFFER.route.en}>See the review scope →</a></aside>
      <footer className={styles.footer}>A bounded observation supports a next decision. It does not certify a system.</footer>
    </div>
    {result && <BuyerReportDocument model={result.model} className={`${styles.report} ${reportOpen ? styles.preview : ''}`} />}
  </main>;
}
