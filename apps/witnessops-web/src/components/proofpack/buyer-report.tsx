import { Fragment, type ReactNode } from 'react';
import { isBuyerReport, REPORT_TEMPLATE, type ProofpackReportV1 } from '@/lib/proofpack/report-model';
import styles from './buyer-report.module.css';
import { reportPageIdentityStyle } from './report-print-style';
import { WitnessOpsMark } from '@/components/shared/witnessops-mark';

export { REPORT_TEMPLATE } from '@/lib/proofpack/report-model';
const readable = (value: string) => value.replaceAll('_', ' ');
const number = (value: number) => String(value).padStart(2, '0');
function observation(value: unknown) {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2) ?? 'Not recorded';
    return text.length > 2400 ? text.slice(0, 2400) + '\n[Display shortened. Refer to the original artifact.]' : text;
}
function ReportBrand({ dark = false }: { dark?: boolean }) {
    return <strong className={styles.reportBrand}><WitnessOpsMark variant="mark" size="lg" tone={dark ? 'white' : 'black'} decorative />WITNESSOPS</strong>;
}
function Chapter({ number: index, label, title, children, product, dark = false }: { product: string; number: string; label: string; title: string; children: ReactNode; dark?: boolean }) {
    return <section className={`${styles.chapter} ${dark ? styles.dark : ''}`}>
        <div className={styles.running}><ReportBrand dark={dark} /><span>{label}</span><span>CH {index} / 05</span></div>
        <h2>{title}</h2>{children}
        <div className={styles.chapterFooter}><span>{product}</span><span>DERIVED BUYER REPORT</span></div>
    </section>;
}

/** Product-independent presentation. Browser preview and print use this same document. */
export function BuyerReportDocument({ model, className = '' }: { model: ProofpackReportV1; className?: string }) {
    if (!isBuyerReport(model)) return null;
    const sections = model.coverage;
    const complete = model.summary.coverage.complete;
    const gaps = model.collectionGaps;
    const findings = model.findings;
    const assessed = findings.filter((finding): finding is typeof finding & { severity: string } => finding.severity !== null);
    const unassessed = findings.filter(finding => finding.severity === null);
    const displayedFindings = unassessed.length ? [...assessed, ...unassessed] : findings;
    const product = `${model.identity.productName} ${model.identity.productVersion}`;
    const severityOrder = ['critical', 'high', 'medium', 'low', 'informational'];
    const counts = [...severityOrder, ...Object.keys(model.summary.findings.severities).filter(s => !severityOrder.includes(s))].filter(s => model.summary.findings.severities[s] > 0);
    const priorities = [...assessed].sort((a, b) => {
        const rank = (severity: string) => { const index = severityOrder.indexOf(severity); return index < 0 ? severityOrder.length : index; };
        return rank(a.severity) - rank(b.severity);
    }).slice(0, 3);
    const nextAction = priorities.length
        ? priorities[0].recommendation ?? 'Review the recorded finding with the responsible owner.'
        : unassessed.length ? 'Review the findings with the responsible owner. Their severity has not been assessed.'
            : gaps.length ? 'Arrange follow-up collection for the named gaps with the responsible operator.'
            : 'Review the scope and limitations with the responsible owner, then record their decision.';
    return <article className={`${styles.document} ${className}`} aria-label="Derived buyer report">
        <style>{reportPageIdentityStyle(model.subject.label, model.identity.sourceDigest)}</style>
        <section className={`${styles.chapter} ${styles.cover} ${styles.dark}`}>
            <div className={styles.running}><ReportBrand dark /><span>THE RESULT</span><span>CH 01 / 05</span></div>
            <p className={styles.kicker}>{model.subject.kicker}</p>
            <h1>Derived buyer report</h1>
            <p className={styles.coverTitle}>Report at a glance.</p>
            <div className={styles.accentRule} />
            <div className={styles.target}><h2>{model.subject.label}</h2><p>{model.subject.reference}<br />Observed: {model.subject.observedAt}</p></div>
            {model.identity.synthetic && <p className={styles.synthetic}>Synthetic fixture. Not customer evidence.</p>}
            <div className={styles.resultGrid}>
                <div><span>{model.verification.label}</span><strong>Passed</strong><small>{model.verification.method}</small></div>
                <div><span>Collection</span><strong>{complete} / {sections.length}</strong><small>Collection: {complete} / {sections.length} complete</small></div>
                <div><span>Findings</span><strong>{findings.length}</strong><small>{[...counts.map(s => `${model.summary.findings.severities[s]} ${s}`), ...(unassessed.length ? [`${unassessed.length} severity not assessed`] : [])].join(' · ') || 'No findings recorded'}</small></div>
                <div><span>Owner decision</span><strong>Not recorded</strong><small>Verification does not grant approval</small></div>
            </div>
            {model.summary.checks && <p className={styles.fine}>Recorded checks: {model.summary.checks.total} total · {model.summary.checks.passed} passed · {model.summary.checks.needsAttention} need attention · {model.summary.checks.informational} informational · {model.summary.checks.undetermined} undetermined. These are individual results, not an overall security grade.</p>}
            {assessed.length > 0 || !unassessed.length ? <section className={styles.prioritySummary} aria-label="Priority findings">
                <h3>Review first</h3>
                <p className={styles.fine}>{unassessed.length ? 'Up to three severity-assessed findings by recorded severity. Unassessed findings are listed separately in chapter 03.' : 'Up to three findings by recorded severity. Full observations and limitations are in chapter 03.'}</p>
                {priorities.length ? <ol>{priorities.map(finding => <li key={finding.id}><span>{readable(finding.severity)}</span><strong>{finding.title}</strong></li>)}</ol> : <p>No findings were recorded. This does not establish overall security.</p>}
            </section> : null}
            {unassessed.length > 0 && <section className={styles.prioritySummary} aria-label="Unassessed findings"><h3>Severity not assessed</h3><p>{unassessed.length} {unassessed.length === 1 ? 'finding is' : 'findings are'} recorded without an assessed severity. They are not severity-ranked. Read their observations and limitations in chapter 03.</p></section>}
            <div className={styles.decisionSummary}>
                <section aria-label="Summary collection gaps"><h3>Collection gaps</h3><p>{gaps.length ? gaps.map(g => readable(g.label)).join(', ') + '. Review these gaps before deciding whether to collect more evidence.' : 'No collection gaps were recorded.'}</p></section>
                <section aria-label="Suggested next action"><h3>Suggested next action</h3><p>{nextAction}{(priorities.length > 0 || unassessed.length > 0) && gaps.length > 0 ? ' Also arrange follow-up collection for the named gaps.' : ''}</p><p className={styles.fine}>Agree any changes with the responsible owner. No remediation is established here.</p></section>
            </div>
            <p className={styles.callout}>{model.verification.boundary}</p>
            <p className={styles.fine}>This report is a derived presentation of the source evidence.</p>
            <div className={styles.chapterFooter}><span>{REPORT_TEMPLATE}</span><span>READ THE RESULT. INSPECT THE EVIDENCE.</span></div>
        </section>

        <Chapter product={product} number="02" label="THE SCOPE" title={model.subject.scopeTitle}>
            <p className={styles.lead}>{model.subject.scopeSummary}</p>
            <div className={styles.scopeIntro}><div><span className={styles.kicker}>WHAT WAS CHECKED</span><p>{sections.length} coverage items. Completion describes the evidence collected for this report.</p></div><div><span className={styles.kicker}>SNAPSHOT LIMIT</span><p>{model.subject.scopeBoundary}</p></div></div>
            <h3>Collection coverage</h3>
            <div className={styles.coverageList}>{sections.map((section, i) => <div key={section.id} data-incomplete={!section.complete}><span className={styles.index}>{number(i + 1)}</span><strong>{section.label}</strong><span>{section.complete ? 'Complete' : 'Incomplete'}</span></div>)}</div>
            <p className={styles.callout}>{gaps.length ? `${gaps.length} collection ${gaps.length === 1 ? 'gap is' : 'gaps are'} recorded. See The proof boundary for the recorded limitations.` : 'All listed coverage items are complete. Completeness is a collection result, not a security grade.'}</p>
        </Chapter>

        <Chapter product={product} number="03" label="THE FINDINGS" title={unassessed.length ? 'Recorded findings' : 'What needs attention?'}>
            <p className={styles.lead}>{findings.length ? `${findings.length} recorded findings, with observations and proposed next steps.` : 'No findings were recorded.'}</p>
            <p className={styles.fine}>Recommendations are proposed follow-up work. No remediation is established by this report.</p>
            {displayedFindings.map((finding, i) => <Fragment key={finding.id}>
                {unassessed.length > 0 && (i === 0 || i === assessed.length) && <h3>{finding.severity === null ? 'Severity not assessed' : 'Severity-assessed findings'}</h3>}
                <section className={styles.finding}>
                <div className={styles.findingMeta}><span>{number(i + 1)} / {number(findings.length)}</span>{finding.severity === null ? <span>Severity not assessed</span> : <span data-severity={finding.severity}>{readable(finding.severity)}</span>}<span>{readable(finding.state)}</span></div>
                <h3>{finding.title}</h3>
                <div className={styles.findingBody}><div><h4>Observed</h4><pre>{observation(finding.observation)}</pre></div><div><h4>Recommended next step</h4><p>{finding.recommendation ?? 'No recommended action recorded.'}</p></div></div>
                {finding.interpretation && <div className={styles.findingLimit}><h4>Interpretation</h4><p>{finding.interpretation}</p></div>}
                <div className={styles.findingLimit}><h4>What this establishes</h4><p>{finding.limitations.join(" ")}</p></div>
                <p className={styles.evidenceRef}><strong>{finding.checkId ?? finding.id}</strong> · Evidence: {finding.evidence.join(', ')}</p>
            </section></Fragment>)}
            {!findings.length && <p className={styles.callout}>An absence of findings does not establish overall security. Read the scope and proof boundary alongside this result.</p>}
        </Chapter>

        <Chapter product={product} number="04" label="THE PROOF BOUNDARY" title="The unknowns belong in the report.">
            <div className={styles.boundaryGrid}><div><h3>Established by these checks</h3><ol>{model.verification.established.map(text => <li key={text}>{text}</li>)}</ol></div><div><h3>Not independently established</h3><ol>{model.unknowns.map(item => <li key={item.id}><strong>{item.title}</strong> <span>{item.reason}</span>{item.evidenceNeeded && <p>Evidence needed: {item.evidenceNeeded}</p>}</li>)}</ol></div></div>
            <h3>Collection gaps</h3>
            {gaps.length ? gaps.map(g => <div className={styles.gap} key={g.id}><h4>{readable(g.label)}: incomplete.</h4><p>{g.reason}</p><pre>{observation(g.observation)}</pre></div>) : <p>No collection gaps were recorded.</p>}
            <h3>Declared exclusions</h3><p>{model.declaredExclusions.join(', ') || 'None recorded.'}</p>
            <p className={styles.callout}>Owner decision: not recorded. Decide what to investigate, accept or remediate with the responsible owner.</p>
        </Chapter>

        <Chapter product={product} number="05" label="THE VERIFICATION PATH" title="Keep the source. Repeat the check.">
            <div className={styles.steps}>{model.reproduction.steps.map((step, i) => <div key={step.title}><span className={styles.index}>{number(i + 1)}</span><h3>{step.title}</h3><p>{step.description}</p></div>)}</div>
            {model.reproduction.command && <pre className={styles.command}>{model.reproduction.command}</pre>}
            <h3>Verification and provenance</h3>
            <p>This report is derived from the source artifacts. Generating it does not change those artifacts.</p>
            <dl className={styles.receipt}>{model.provenance.map(record => <Fragment key={record.id}><dt>{record.label}</dt><dd>{record.value}<br /><small>{record.mechanism}. {record.relationship}</small></dd></Fragment>)}<dt>Report ID</dt><dd>{model.identity.reportId}</dd><dt>Report model</dt><dd>{model.reportVersion}</dd><dt>Template</dt><dd>{REPORT_TEMPLATE}</dd><dt>Generated</dt><dd>{model.identity.generatedAt}</dd></dl>
            <p className={styles.fine}>{model.reproduction.trustBoundary}</p>
            <h3>Verification appendix</h3><p>Machine-readable source evidence and named checks support reconstruction. They do not extend the report scope.</p>
            <h3>Verification checks</h3><div className={styles.checks}>{model.verificationChecks.map(check => <div key={check.id}><div><strong>{check.label}</strong><span>{check.status}</span></div><p>{check.detail}</p></div>)}</div>
            {model.sourceArtifacts.filter(source => source.presentation === 'appendix').map(source => <section key={source.id} className={styles.sourceArtifact}><h3>{source.label}</h3>{source.content !== undefined && <pre>{source.format === 'json' ? JSON.stringify(source.content, null, 2) : String(source.content)}</pre>}<p className={styles.fine}>{source.relationship}</p>{source.path && <p className={styles.evidenceRef}>{source.path}</p>}{source.digest && <p className={styles.evidenceRef}>sha256:{source.digest}</p>}</section>)}
        </Chapter>
    </article>;
}
