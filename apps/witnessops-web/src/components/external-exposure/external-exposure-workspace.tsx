'use client';
import { useEffect, useRef, useState } from 'react';
import { BuyerReportDocument } from '@/components/proofpack/buyer-report';
import { createReportModel, printBuyerReport, type ProofpackReportV1, type ReportModelInput } from '@/lib/proofpack/report-model';
import { EXCLUSIONS, EXTERNAL_VERSION, SNAPSHOT_BOUNDARY, type ExternalSnapshotV1, type CheckStatus } from '@/lib/external-exposure/contracts';
import { EXTERNAL_ATTACK_SURFACE_OFFER } from '@/lib/commercial-truth';
import { buyerOfferRequestHref } from '@/lib/buyer-services';
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
  const hostnameInput = useRef<HTMLInputElement>(null);
  useEffect(() => () => { active.current?.controller.abort(); }, []);
  useEffect(() => { if (result) resultHeading.current?.focus(); }, [result]);

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
    } catch (cause) {
      if (id === sequence.current && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'The snapshot could not be completed.');
    } finally {
      if (id === sequence.current) { active.current = null; setBusy(false); }
    }
  }

  const attention = result?.snapshot.checks.filter(check => check.status === 'NEEDS_ATTENTION') ?? [];
  const expected = result?.snapshot.checks.filter(check => check.status === 'OBSERVED_EXPECTED') ?? [];
  const unknowns = result?.snapshot.checks.filter(check => check.status === 'UNDETERMINED' || check.status === 'CHECK_ERROR') ?? [];
  const information = result?.snapshot.checks.filter(check => check.status === 'INFORMATIONAL') ?? [];
  const IntroHeading = reportOpen ? 'h2' : 'h1';

  return <main id="main-content" className={styles.workspace}>
    <div className={styles.screen}>
      <section className={styles.intro}>
        <p className={styles.eyebrow}>FREE · NO EMAIL REQUIRED</p>
        <IntroHeading className={styles.title}>External Exposure Snapshot</IntroHeading>
        <p className={styles.lead}>See what ten public checks observe about your hostname.</p>
      </section>
      <form className={styles.form} onSubmit={submit} aria-label="Run an external exposure snapshot">
        <label htmlFor="external-hostname">Public hostname</label>
        <div className={styles.inputRow}><input ref={hostnameInput} id="external-hostname" name="hostname" type="text" autoComplete="off" spellCheck={false} autoCapitalize="none" maxLength={253} placeholder="example.com" aria-describedby="hostname-help" value={hostname} onChange={event => clearResult(event.target.value)} required /><button type="submit" disabled={busy || !hostname.trim()}>{busy ? 'Collecting observations…' : 'Run free check'}</button></div>
        <p id="hostname-help">Enter a hostname you own or are authorized to check. Use only the hostname, without https://, a path or a port.</p>
        <p className={styles.promise}>10 bounded public checks. No exploitation. No credentials. Ports 80/443 only.</p>
        <details className={styles.executionDetails}><summary>How this check works</summary><p>WitnessOps servers make bounded public DNS, TLS and HTTP observations. Results stay in this page until you clear or leave it. This feature does not store results.</p></details>
        <div className={styles.actions}>{busy && <button type="button" onClick={() => { clearResult(); hostnameInput.current?.focus(); }}>Cancel</button>}{(result || error) && <button type="button" onClick={() => { clearResult(''); hostnameInput.current?.focus(); }}>Clear</button>}</div>
        {busy && <p role="status">Collection is limited to 30 seconds, followed by brief report processing. Cancel hides the result; the bounded server run may finish.</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
      </form>
      {!result && <section className={styles.included}><h2>One hostname. Ten observations.</h2><ul>{CHECK_TOPICS.map(topic => <li key={topic}>{topic}</li>)}</ul><details><summary>Scope and limitations</summary><p>{SNAPSHOT_BOUNDARY}</p><ul>{EXCLUSIONS.map(item => <li key={item}>{item}</li>)}</ul></details></section>}
      {result && <>
        <section className={styles.result} aria-label="Snapshot results">
          <p className={styles.eyebrow}>YOUR SNAPSHOT</p>
          <h2 ref={resultHeading} tabIndex={-1}>{result.snapshot.target}</h2>
          <p className={styles.muted}>{result.snapshot.checks.length} checks returned · {result.snapshot.finished_at} · {((Date.parse(result.snapshot.finished_at) - Date.parse(result.snapshot.started_at)) / 1000).toFixed(1)} seconds</p>
          <div className={styles.counts}><div><strong>{attention.length}</strong><span>Needs attention</span></div><div><strong>{expected.length}</strong><span>Observed as expected</span></div><div><strong>{information.length}</strong><span>Informational</span></div><div><strong>{unknowns.length}</strong><span>Could not determine</span></div></div>
          <p>No score or severity ranking is assigned. “Observed as expected” describes a named check, not overall security.</p>
          <div className={styles.resultColumns}>
            <section aria-labelledby="attention-heading"><h3 id="attention-heading">What needs attention?</h3>{attention.length ? <ul className={styles.observations}>{attention.map(check => <li key={check.check_id} data-status={check.status}><h4>{check.title}</h4><p>{check.interpretation}</p>{check.recommendation && <p className={styles.muted}>{check.recommendation}</p>}</li>)}</ul> : <p>No needs-attention items were observed under these ten checks. This does not establish the absence of vulnerabilities.</p>}</section>
            <section aria-labelledby="expected-heading"><h3 id="expected-heading">What was observed as expected?</h3><p>{expected.length} of the ten checks returned an expected observation. This is not an overall security assessment.</p>{expected.length > 0 && <details className={styles.information}><summary>Inspect expected observations</summary><ul>{expected.map(check => <li key={check.check_id} data-status={check.status}><strong>{check.title}</strong><p>{check.interpretation}</p></li>)}</ul></details>}</section>
          </div>
          {information.length > 0 && <details className={styles.information}><summary>{information.length} informational observations</summary><ul>{information.map(check => <li key={check.check_id}><strong>{check.title}</strong><p>{check.interpretation}</p></li>)}</ul></details>}
          <div className={styles.unknowns}><section aria-labelledby="unknown-heading"><h3 id="unknown-heading">What remains unknown?</h3>{unknowns.length ? <ul className={styles.observations}>{unknowns.map(check => <li key={check.check_id} data-status={check.status}><h4>{check.title}</h4><p>{statusLabels[check.status]}: {check.interpretation}</p></li>)}</ul> : <p>No check returned an unknown or collection error.</p>}<p className={styles.muted}>Authenticated functionality, internal infrastructure and application vulnerabilities were not tested.</p></section></div>
          <section className={styles.evidence} aria-label="Full evidence"><div><h3>Full evidence</h3><p>Inspect all ten observations, methods, source references and limitations in the buyer report.</p></div><div className={styles.actions}><button type="button" aria-expanded={reportOpen} aria-controls="external-buyer-report" onClick={() => setReportOpen(value => !value)}>{reportOpen ? 'Hide full report' : 'View full report'}</button><button type="button" onClick={() => printBuyerReport(result.model, () => window.print())}>Export PDF</button></div><details><summary>Source data and report details</summary><button type="button" onClick={() => saveSource(result.snapshot)}>Download source JSON</button><p className={styles.muted}>{EXTERNAL_VERSION}. PDF uses your browser’s print dialog. “Snapshot data validation: Passed” means the report data passed structural checks. The observations are unsigned.</p></details></section>
        </section>
        <section className={styles.nextStep} aria-label="Discuss your next step"><div><p className={styles.eyebrow}>WHAT NEXT?</p><h2>Make sense of the next step.</h2><p>Talk through what needs attention and whether a deeper review would help. Request a 30-minute conversation; we’ll confirm a time with you.</p></div><a className={styles.primaryLink} href={EXTERNAL_ATTACK_SURFACE_OFFER.requestRoute}>Request a 30-minute review call</a></section>
        <details className={styles.boundary}><summary>Snapshot scope and limits</summary><p>{SNAPSHOT_BOUNDARY}</p><ul>{EXCLUSIONS.map(item => <li key={item}>{item}</li>)}</ul></details>
      </>}
      <aside className={styles.offer}><div><p className={styles.eyebrow}>NEED US TO INVESTIGATE FURTHER?</p><h2>{EXTERNAL_ATTACK_SURFACE_OFFER.name.en}</h2><p>A bounded, authorized, human-reviewed investigation with validated findings and an evidence-backed buyer report.</p><p><strong>{EXTERNAL_ATTACK_SURFACE_OFFER.price.en}</strong> for one authorized public-facing system.</p><a className={styles.textLink} href={EXTERNAL_ATTACK_SURFACE_OFFER.route.en}>See the review scope →</a></div><a className={styles.secondaryLink} href={buyerOfferRequestHref('en', EXTERNAL_ATTACK_SURFACE_OFFER.productId)}>Request review</a></aside>
    </div>
    {result && <div id="external-buyer-report"><BuyerReportDocument model={result.model} className={`${styles.report} ${reportOpen ? styles.preview : ''}`} /></div>}
  </main>;
}
