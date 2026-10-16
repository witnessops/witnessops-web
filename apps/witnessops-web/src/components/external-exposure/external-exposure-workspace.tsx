'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { takeAskCheck, normalizeAskHostname, type AskCheckContext } from '@/lib/external-exposure/ask-handoff';
import { DocsAssistantContactHandoff } from '@/components/docs-assistant/docs-assistant-contact-handoff';
import { DomainCheckResults } from '@/components/external-exposure/domain-check-results';
import { publicCheckRunId } from '@/lib/external-exposure/unsigned-run-record';
import { createReportModel, type ProofpackReportV1, type ReportModelInput } from '@/lib/proofpack/report-model';
import { EXCLUSIONS, EXTERNAL_VERSION, SNAPSHOT_BOUNDARY, type ExternalSnapshotV1 } from '@/lib/external-exposure/contracts';
import { EXTERNAL_ATTACK_SURFACE_OFFER } from '@/lib/commercial-truth';
import { buyerOfferRequestHref } from '@/lib/buyer-services';
import styles from './external-exposure.module.css';

const CHECK_GROUPS = [
  { title: 'Connection security', description: 'Where the hostname points and how it connects.', topics: 'Public DNS target · TLS certificate · Legacy TLS' },
  { title: 'Web configuration', description: 'How the site handles HTTPS and public security information.', topics: 'HTTPS redirect · HSTS · Response headers · security.txt' },
  { title: 'Email & certificate policy', description: 'Published policies for email senders and certificate issuers.', topics: 'SPF · DMARC · CAA' },
];
export function ExternalExposureWorkspace({ workspaceUrl = null }: { workspaceUrl?: string | null }) {
  const [askContext, setAskContext] = useState<AskCheckContext | null>(null);
  const [discuss, setDiscuss] = useState(false);
  const runButton = useRef<HTMLButtonElement>(null);
  const handoffRead = useRef(false);
  const [hostname, setHostname] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ snapshot: ExternalSnapshotV1; model: ProofpackReportV1 } | null>(null);
  const active = useRef<{ id: number; controller: AbortController } | null>(null);
  const sequence = useRef(0);
  const hostnameInput = useRef<HTMLInputElement>(null);
  useEffect(() => () => { active.current?.controller.abort(); }, []);
  useEffect(() => {
    if (handoffRead.current) return;
    handoffRead.current = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get('source') !== 'ask' || !params.has('hostname')) return;
    try {
      const host = normalizeAskHostname(params.get('hostname')!);
      setHostname(host);
      const context = takeAskCheck(window.sessionStorage, host);
      setAskContext(context);
      // Defer until after mount cleanup/replay; the consumed marker is never retried.
      if (context) queueMicrotask(() => { void collect(host); });
      else requestAnimationFrame(() => runButton.current?.focus());
    } catch { /* The normal hostname form remains available. */ }
  }, []);
  useEffect(() => {
    if (!askContext) return;
    const timer = setTimeout(() => { setAskContext(null); setDiscuss(false); }, Math.max(0, askContext.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [askContext]);

  function clearResult(nextHostname = hostname) {
    setAskContext(null); setDiscuss(false);
    sequence.current += 1;
    active.current?.controller.abort();
    active.current = null;
    setBusy(false);
    setHostname(nextHostname);
    setResult(null);
    setError('');
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await collect(hostname);
  }
  async function collect(target: string) {
    if (active.current) return;
    const id = ++sequence.current;
    const controller = new AbortController();
    active.current = { id, controller };
    setBusy(true);
    setError('');
      setResult(null);
    try {
      const response = await fetch('/api/external-exposure', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname: target }), cache: 'no-store', signal: controller.signal,
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

  const IntroHeading = 'h1';

  return <main id="main-content" className={styles.workspace}>
    <div className={styles.screen}>
      {!result && <section className={styles.intro}>
        <p className={styles.eyebrow}>FREE HOSTNAME CHECK</p>
        <IntroHeading className={styles.title}>Check your public exposure.</IntroHeading>
        <p className={styles.lead}>Ten checks of one public hostname. No account or email required.</p>
      </section>}
      <form className={styles.form} onSubmit={submit} aria-label="Run an external exposure snapshot">
        <label htmlFor="external-hostname">Public hostname</label>
        <div className={styles.inputRow}><input ref={hostnameInput} id="external-hostname" name="hostname" type="text" autoComplete="off" spellCheck={false} autoCapitalize="none" maxLength={253} placeholder="example.com" aria-describedby="hostname-help" value={hostname} onChange={event => clearResult(event.target.value)} required /><button ref={runButton} type="submit" disabled={busy || !hostname.trim()}>{busy ? 'Collecting observations…' : 'Run free check'}</button></div>
        <p id="hostname-help">Use a hostname you own or are authorized to check, such as example.com.</p>
        <p className={styles.promise}>Read the findings and download your result. No account needed.</p>
        <details className={styles.executionDetails}><summary>How this check works</summary><p>Enter only the hostname, without https://, a path or a port. WitnessOps servers make ten bounded public DNS, TLS and HTTP observations. No exploitation or credentials; web connections use ports 80/443 only. Changing the hostname, choosing Clear, or leaving the page removes the displayed result. This feature does not store results.</p><Link className={styles.textLink} href="/docs/getting-started/free-check">Read the Free Check guide →</Link></details>
        <div className={styles.actions}>{busy && <button type="button" onClick={() => { clearResult(); hostnameInput.current?.focus(); }}>Cancel</button>}{(result || error) && <button type="button" onClick={() => { clearResult(''); hostnameInput.current?.focus(); }}>Clear</button>}</div>
        {busy && <p role="status">Collection is limited to 30 seconds, followed by brief report processing. Cancel hides the result; the bounded server run may finish.</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
      </form>
      {!result && <section className={styles.included}><h2>What gets checked</h2><ul>{CHECK_GROUPS.map(group => <li key={group.title}><h3>{group.title}</h3><p>{group.description}</p><small>{group.topics}</small></li>)}</ul><details><summary>Scope and limitations</summary><p>{SNAPSHOT_BOUNDARY}</p><ul>{EXCLUSIONS.map(item => <li key={item}>{item}</li>)}</ul></details></section>}
      {result && <div className={styles.resultsLead}>
        <DomainCheckResults snapshot={result.snapshot} runId={publicCheckRunId(result.snapshot)} surface="public" headingLevel={1} />
        <p className={styles.muted}>Keep a copy before you leave. This free result is not stored in an account. Saving as PDF opens your browser’s print dialog; choose Save as PDF.</p>
        <section className={styles.nextStep} aria-label="Save a persistent baseline"><div><h2>Keep a history in your workspace</h2><p>After sign-in, add your hostname and authorize a new saved check. Come back after a change, run again, and compare the recorded results.</p><p className={styles.muted}>Create an account, verify your email, then create your workspace. This transient snapshot is not automatically imported.</p>{workspaceUrl ? <a className={styles.textLink} href="/early-access">How workspace access works →</a> : null}</div><a className={styles.primaryLink} href={workspaceUrl ?? '/early-access'}>{workspaceUrl ? 'Open workspace' : 'See workspace access'}</a></section>
        {askContext?.email && <section aria-label="Optional follow-up" className={styles.nextStep}>
          {!discuss ? <button type="button" onClick={() => setDiscuss(true)}>Discuss this result</button> : <DocsAssistantContactHandoff expanded initialEmail={askContext.email} surface="page" onExpandedChange={setDiscuss} />}
        </section>}

        <details className={styles.boundary}><summary>Snapshot scope and limits</summary><p>{SNAPSHOT_BOUNDARY}</p><ul>{EXCLUSIONS.map(item => <li key={item}>{item}</li>)}</ul></details>
      </div>}
      <aside className={styles.offer}><div><p className={styles.eyebrow}>EXPERT HELP</p><h2>Need a closer look?</h2><p>{EXTERNAL_ATTACK_SURFACE_OFFER.name.en}: agree the scope of a human review before work begins.</p><p><strong>{EXTERNAL_ATTACK_SURFACE_OFFER.price.en}</strong> for one authorized public-facing system.</p><a className={styles.textLink} href={EXTERNAL_ATTACK_SURFACE_OFFER.route.en}>See the review scope →</a></div><a className={styles.secondaryLink} href={buyerOfferRequestHref('en', EXTERNAL_ATTACK_SURFACE_OFFER.productId)}>Ask an expert</a></aside>
    </div>
  </main>;
}
