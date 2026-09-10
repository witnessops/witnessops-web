'use client';
// Full document navigation clears the isolated local-file workspace.
import { useEffect, useMemo, useRef, useState } from 'react';
import { localAuditAdapter } from '@/lib/proofpack/local-audit-adapter';
import { useBuyerReportPrint } from './buyer-report-print';
import { verifyInWorker } from '@/lib/proofpack/run-in-worker';
import { LOCAL_AUDIT_TRUST } from '@/lib/proofpack/pinned-registry';
import type { Finding, ProofpackResult } from '@/lib/proofpack/verify.mjs';
import styles from './proofpack.module.css';
import { BuyerReportDocument } from './buyer-report';
const tabs = ['Summary', 'Findings', 'Evidence', 'Report'] as const;
const MAX_BUNDLE_SIZE = 110 * 1024 * 1024;
const readable = (value: string) => value.replaceAll('_', ' ');
function display(value: unknown) { const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2); return text && text.length > 2400 ? text.slice(0, 2400) + '\n[Display shortened. Refer to the original artifact.]' : text ?? 'Not recorded'; }
function save(text: string, name: string, type: string) { const url = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function FindingCard({ finding, print = false }: {
    finding: Finding;
    print?: boolean;
}) {
    return <article className={styles.finding}>
 <div className={styles.tags}><span data-severity={finding.severity}>{readable(finding.severity)}</span><span>{readable(finding.state)}</span></div>
 <h3>{finding.title}</h3><p>{finding.recommendation}</p>
 {print ? <><p className={styles.muted}>{finding.claim_limit}</p><pre>{display(finding.observed_value)}</pre><p>Evidence: {finding.evidence_refs.join(', ')}</p></> : <details><summary>Observation and supporting evidence</summary><pre>{display(finding.observed_value)}</pre><p className={styles.muted}>{finding.claim_limit}</p>{finding.evidence_refs.map(ref => <code key={ref}>{ref}</code>)}</details>}
 </article>;
}
export function ProofpackWorkspace() {
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<ProofpackResult | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const [tab, setTab] = useState<typeof tabs[number]>('Summary'), [severity, setSeverity] = useState('all'), [generatedAt, setGeneratedAt] = useState('');
    const abortRef = useRef<AbortController | null>(null), runRef = useRef(0), formRef = useRef<HTMLFormElement>(null), fileRef = useRef<HTMLInputElement>(null), resultRef = useRef<HTMLHeadingElement>(null);
    useEffect(() => () => { abortRef.current?.abort(); }, []);
    function selectFile(next: File | null) { runRef.current++; abortRef.current?.abort(); setFile(next); setResult(null); setError(''); setBusy(false); setTab('Summary'); setSeverity('all'); setGeneratedAt(''); }
    function clear() { selectFile(null); formRef.current?.reset(); }
    async function verify(event: React.FormEvent) {
        event.preventDefault();
        const id = ++runRef.current;
        abortRef.current?.abort();
        const abort = new AbortController();
        abortRef.current = abort;
        setBusy(true);
        setError('');
        setResult(null);
        try {
            if (!file) throw Error('Choose a .proofpack file.');
            if (file.size > MAX_BUNDLE_SIZE) throw Error('Proofpack exceeds the 110 MiB size limit.');
            if (!/\.proofpack$/i.test(file.name)) throw Error('Choose a .proofpack file.');
            const input = { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
            if (id !== runRef.current) return;
            const next = await verifyInWorker(input, abort.signal);
            if (id !== runRef.current)
                return;
            setResult(next);
            setTab('Summary');
            setGeneratedAt(new Date().toISOString());
            requestAnimationFrame(() => resultRef.current?.focus());
        }
        catch (e) {
            if (id === runRef.current)
                setError(e instanceof Error ? e.message : 'Local verification could not complete.');
        }
        finally {
            if (id === runRef.current)
                setBusy(false);
        }
    }
    const model = useMemo(() => localAuditAdapter(result, generatedAt), [result, generatedAt]);
    const report = model ? result?.report : undefined;
    const complete = report?.completeness.section_results.filter(s => s.complete).length ?? 0;
    const gaps = report?.completeness.section_results.filter(s => !s.complete) ?? [];
    const findings = report?.findings.findings ?? [];
    const counts = report ? ['critical', 'high', 'medium', 'low', 'informational'].filter(sev => report.findings.counts[sev] > 0).map(sev => `${report.findings.counts[sev]} ${sev}`).join(' · ') || 'No findings recorded' : '';
    const { print: exportPdf, printRoot } = useBuyerReportPrint(model);
    const ResultHeading = tab === 'Report' ? 'h2' : 'h1';

    return <>{printRoot}<main id="main-content" className={styles.workspace}>
 <div className={`${styles.screen} ${tab === 'Report' && report ? styles.reportOpen : ''}`}>
 {!report && <section className={styles.intro}><span className={styles.eyebrow}>EVIDENCE YOU CAN READ</span><h1>Open your proofpack.</h1><p>Choose one Proofpack file. Verification runs locally in your browser.</p><p className={styles.privacy}>Selected files are processed on this device. They are not uploaded to WitnessOps.</p></section>}
 <form onSubmit={verify} ref={formRef} className={`${styles.inputPanel} ${report ? styles.compact : ''}`} aria-label="Open proofpack">
 <div className={styles.bundleIntake}><div className={styles.file}><strong id="bundle-label">Proofpack file</strong><span id="bundle-help">Local Audit 1.2.2 · .proofpack · maximum 110 MiB</span><input ref={fileRef} className={styles.fileInput} type="file" aria-labelledby="bundle-label" aria-describedby="bundle-help" accept=".proofpack" onChange={e => selectFile(e.target.files?.[0] ?? null)} /><button type="button" onClick={() => fileRef.current?.click()}>Choose Proofpack</button><span className={styles.selectedFile} aria-live="polite">{file?.name ?? 'Choose a file to enable verification.'}</span><div className={styles.actions}><button className={styles.primary} disabled={busy || !file}>{busy ? 'Checking package locally…' : 'Verify locally'}</button><button type="button" onClick={clear}>Clear</button>{busy && <button type="button" onClick={() => { abortRef.current?.abort(); }}>Cancel verification</button>}</div></div>
 <div className={styles.trustSource}><span>Trust source</span><strong>{LOCAL_AUDIT_TRUST.name} · v{LOCAL_AUDIT_TRUST.version}</strong><code>sha256:{LOCAL_AUDIT_TRUST.sha256.slice(0, 16)}…</code><small>Supplied independently by this verifier. Full digest below.</small></div></div>
 <details className={styles.bundleDetails}><summary>Verification details</summary><p>The bundle contains a Local Audit package and its detached signature. The signature covers the enclosed package, not the outer envelope. Both are untrusted until verification succeeds.</p><p>The production registry is pinned in this application. A bundle cannot supply or replace it.</p><code>sha256:{LOCAL_AUDIT_TRUST.sha256}</code><p>Selected files are processed on this device. They are not uploaded to WitnessOps.</p><p>Bundle format: witnessops-proofpack-bundle, version 1.</p></details>
 {busy && <p role="status">Checking the enclosed package against the independent trust registry on this device.</p>}
 </form>
 {error && <p role="alert" className={styles.error}>{error}</p>}
 {result && !report && <section className={styles.failure}><h2 tabIndex={-1} ref={resultRef}>Package checks did not pass</h2><p>No verified buyer report was generated. The enclosed package must have a matching signature from a signer admitted by the production registry pinned in this verifier. Ask the provider for a supported Local Audit 1.2.2 bundle.</p><details open><summary>Verification diagnostics</summary>{Object.entries(result.checks).map(([key, c]) => <p key={key}><strong>{readable(key)}: {c.status}</strong><br />{c.detail}</p>)}</details><button onClick={() => save(JSON.stringify(result, null, 2), 'verification-diagnostics.json', 'application/json')}>Download diagnostics</button></section>}
 {report && result && <>
 <section className={styles.overview} aria-label="Audit summary"><div className={styles.titleRow}><div><span className={styles.eyebrow}>LOCAL SERVER AUDIT</span><ResultHeading tabIndex={-1} ref={resultRef}>{report.posture.target.hostname}</ResultHeading><p>{report.posture.observed_at_utc} · {report.posture.target.asset_id}</p></div>{report.posture.synthetic && <span className={styles.synthetic}>Synthetic fixture · not customer evidence</span>}</div>
 <div className={styles.statusGrid}><div><span>Package checks</span><strong className={styles.passed}>Passed</strong><small>Signature, bindings and reconstruction</small></div><div><span>Collection</span><strong>{complete} / {report.completeness.section_results.length} complete</strong><small>{gaps.length ? 'Review the named collection gaps' : 'All required sections complete'}</small></div><div><span>Findings</span><strong>{findings.length} recorded</strong><small>{counts}</small></div><div><span>Owner decision</span><strong>Not recorded</strong><small>Package validity is not approval</small></div></div>
 <p className={styles.boundary}>These checks establish the package and its declared bindings. They do not establish that the server is secure, uncompromised or compliant.</p>{tab !== 'Report' && <div className={styles.actions}><button className={styles.primary} onClick={() => setTab('Report')}>View report</button><button onClick={exportPdf}>Save report as PDF</button><button onClick={clear}>Choose another Proofpack</button></div>}</section>
 <div className={styles.tabs} role="tablist" aria-label="Proofpack sections">{tabs.map((name, i) => <button key={name} id={`tab-${name}`} role="tab" aria-selected={tab === name} aria-controls={`panel-${name}`} tabIndex={tab === name ? 0 : -1} onClick={() => setTab(name)} onKeyDown={e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
            e.preventDefault();
            const index = e.key === 'Home' ? 0 : e.key === 'End' ? 3 : (i + (e.key === 'ArrowRight' ? 1 : 3)) % 4;
            setTab(tabs[index]);
            document.getElementById(`tab-${tabs[index]}`)?.focus();
        } }}>{name}</button>)}</div>
 <section className={styles.panel} id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
 {tab === 'Summary' && <><div className={styles.twoColumns}><section><h2>What was checked?</h2><p>One Linux host, observed at the recorded time through bounded, read-only collection.</p><p className={styles.muted}>This is a single snapshot. It does not establish a before/after change.</p><details><summary>Scope from checked authority</summary><pre>{display(report.scope)}</pre><p>Authorizer declared in the record: {report.authority.authority_source.authority_identity}</p><p>Recording this identity does not independently authenticate their approval.</p></details></section><section><h2>What remains unknown?</h2>{gaps.length ? <ul>{gaps.map(g => <li key={g.section}><strong>{readable(g.section)}: incomplete</strong><p>{display(report.posture.sections[g.section]?.diagnostic_reason ?? report.posture.sections[g.section]?.status)}</p></li>)}</ul> : <p>No required collection gaps were recorded.</p>}<p className={styles.muted}>External reachability, source-system honesty and current repository state were not independently established.</p></section></div><h2>What needs attention?</h2>{findings.length ? findings.slice(0, 3).map(f => <FindingCard key={f.finding_id} finding={f}/>) : <p>No deterministic posture findings were emitted from the supplied observations. This is not a whole-host assurance.</p>}{findings.length > 3 && <button onClick={() => setTab('Findings')}>View all {findings.length} findings</button>}</>}
 {tab === 'Findings' && <><div className={styles.sectionHeader}><h2>Findings and next steps</h2><label>Severity <select value={severity} onChange={e => setSeverity(e.target.value)}><option value="all">All severities</option>{Object.keys(report.findings.counts).map(s => <option key={s} value={s}>{s}</option>)}</select></label></div><p className={styles.muted}>Recommendations are proposed follow-up work. No remediation is established by this report.</p>{findings.filter(f => severity === 'all' || f.severity === severity).map(f => <FindingCard key={f.finding_id} finding={f}/>)}{!findings.some(f => severity === 'all' || f.severity === severity) && <p>No findings match this filter.</p>}</>}
 {tab === 'Evidence' && <><h2>Coverage and evidence</h2><div className={styles.coverage}>{report.completeness.section_results.map(c => <details key={c.section}><summary>{readable(c.section)} <span>{c.complete ? 'Complete' : 'Incomplete'}</span></summary><pre>{display(report.posture.sections[c.section])}</pre></details>)}</div><h2>Package verification</h2><p>Signer <code>{report.signerId}</code> was admitted by the production registry pinned in this verifier. The declared authorizer’s approval is not independently authenticated.</p><details><summary>View every verification check</summary>{Object.entries(result.checks).map(([key, c]) => <p key={key}><strong>{readable(key)}: {c.status}</strong><br />{c.detail}</p>)}</details><h2>Original artifacts</h2>{report.manifest.artifacts.map(a => <details key={a.artifact_id}><summary>{readable(a.artifact_id)}</summary><code>{a.path}</code><code>{a.sha256}</code></details>)}<details><summary>Repeat the check offline</summary><p>Use the matching Local Audit 1.2.2 CLI with your original files and independently obtained public registry.</p><pre>witnessops audit verify PROOFPACK.zip --trust-registry TRUSTED-KEYS.json</pre></details></>}
 {tab === 'Report' && <><h2>Your buyer report</h2><p>A readable presentation derived from the checked package. The new PDF is not covered by the detached signature on the enclosed Local Audit package.</p><div className={styles.actions}><button className={styles.primary} onClick={exportPdf}>Save report as PDF</button><button onClick={() => save(report.originalReport, 'original-report.md', 'text/markdown')}>Download original report</button><button onClick={() => { const { report: omitted, ...verification } = result; void omitted; save(JSON.stringify(verification, null, 2), 'verification-result.json', 'application/json'); }}>Download verification results</button></div><p className={styles.muted}>PDF export opens your browser print dialog. Choose Save as PDF. Use Chrome for page numbers and page identity footers. The report includes all findings and collection gaps.</p><details><summary>Read the original package report</summary><pre>{report.originalReport.slice(0, 100000)}</pre>{report.originalReport.length > 100000 && <p>Preview shortened. Download the original for the complete report.</p>}</details></>}
 </section></>}

 </div>
 {model && <BuyerReportDocument model={model} className={`${styles.printReport} ${tab === 'Report' ? styles.previewReport : ''}`} />}
 <footer className={styles.footer}>Local Audit 1.2.2 only. No account, hosted storage or automatic delivery.</footer>
 </main></>;
}
