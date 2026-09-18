'use client';
import { BuyerReportDocument } from '../../../witnessops-web/src/components/proofpack/buyer-report';
import { reportTitle, type RecipientReport } from '../lib/share-projection';
import styles from './recipient-reader.module.css';

/** Accept only the stored recipient projection. Never fetch a private source from this reader. */
export function RecipientReader({ model, digest, publishedAt, expiresAt, preview = false }: {
    model: RecipientReport; digest: string; publishedAt?: string | null; expiresAt?: string; preview?: boolean;
}) {
    const title = reportTitle(model), checks = model.summary.checks;
    const attention = model.findings.filter(f => f.state === 'needs_attention');
    const next = (attention.length ? attention : model.findings).filter(f => f.recommendation).slice(0, 3);
    const date = (value: string) => { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? 'Not recorded' : parsed.toISOString().replace('T', ' ').replace('.000Z', ' UTC').replace('Z', ' UTC'); };
    return <div className={styles.reader}>
        <article className={styles.screen} aria-label="Shared report reader">
            <header className={styles.hero}>
                <p className={styles.kicker}>WitnessOps · {preview ? 'Recipient preview' : 'Fixed report revision'}</p>
                <h1>{title}</h1><p className={styles.muted}>Report name supplied by the publisher; it is not a verification claim.</p>
                {model.identity.synthetic && <p className={styles.notice}>Synthetic / illustrative example. Not a customer result.</p>}
                <p>{model.identity.productName} · {model.subject.label}</p><p className={styles.muted}>Observed {date(model.subject.observedAt)}</p>
                <details><summary>Link access and expiry</summary><p>Anyone with the link can read. No workspace membership is granted. Access ends at expiry or revocation. Downloaded copies cannot be recalled.</p>{expiresAt && <p>Expires {date(expiresAt)}</p>}</details>
                <div className={styles.results} aria-label="Recorded results">
                    {checks ? <><p><strong>{checks.passed}</strong> Observed as expected</p><p><strong>{checks.needsAttention}</strong> Need attention</p><p><strong>{checks.informational}</strong> Informational</p><p><strong>{checks.undetermined}</strong> Undetermined checks</p></> : <><p><strong>{model.summary.findings.needsAttention}</strong> Findings needing attention</p><p><strong>{model.summary.findings.informational}</strong> Informational findings</p><p>No complete individual-check ledger. No overall pass inferred.</p></>}
                </div>
                <p>{model.unknowns.length} recorded unknowns · {model.collectionGaps.length} collection gaps</p>
                <h2>What to do next</h2>
                {next.length ? <ul>{next.map(f => <li key={f.id}><a href={`#recipient-${f.id}`}>{f.title}</a> — {f.recommendation}</li>)}</ul> : <p>{attention.length ? 'Inspect the attention findings. No recommendation was recorded; agree an appropriate follow-up with the responsible owner.' : model.unknowns.length || model.collectionGaps.length ? 'Review the missing evidence and recorded limits below before drawing a conclusion.' : 'Keep this bounded baseline and repeat an appropriate authorized check after a relevant change. No overall security conclusion is established.'}</p>}
                <a href="#recipient-findings">View all findings and unknowns</a>
            </header>
            <nav className={styles.nav} aria-label="Report sections">{[['scope','Scope'],['findings','Findings'],['evidence','Evidence included'],['method','Verification method'],['history','Report history'],['export','Export']].map(([id,label]) => <a key={id} href={`#recipient-${id}`}>{label}</a>)}</nav>
            <section id="recipient-scope"><h2>Scope</h2><p>{model.subject.scopeSummary}</p><p>{model.subject.scopeBoundary}</p></section>
            <section id="recipient-findings"><h2>Findings and unknowns</h2><p>Recorded order. Severity and disposition are separate; unknowns are not vulnerabilities.</p>
                {model.findings.length === 0 && <p>No findings recorded. This does not establish that the system is secure.</p>}
                {model.findings.map(f => <details id={`recipient-${f.id}`} key={f.id} className={styles.finding}><summary><strong>{f.title}</strong><span>{f.state} · {f.severity === null ? 'Severity not assessed' : `Severity: ${f.severity}`}</span></summary><h3>Recorded interpretation</h3><p>{f.interpretation || 'No interpretation recorded.'}</p><h3>Recommended next step</h3><p>{f.recommendation || 'No recommendation recorded. An appropriate follow-up test still needs to be agreed.'}</p><h3>Limits</h3>{f.limitations.length ? <ul>{f.limitations.map((l,i)=><li key={i}>{l}</li>)}</ul> : <p>No finding-specific limits recorded; the report scope and method limits still apply.</p>}<p className={styles.muted}>Detailed source observations are not included in this share.</p></details>)}
                <h3>Missing evidence and recorded limits</h3>
                {model.unknowns.map(u=><div className={styles.gap} key={u.id}><h4>{u.title}</h4><p>{u.reason}</p>{u.evidenceNeeded && <p>Evidence needed: {u.evidenceNeeded}</p>}</div>)}
                {model.collectionGaps.map(g=><div className={styles.gap} key={g.id}><h4>{g.label}</h4><p>{g.reason}</p></div>)}
                {!model.unknowns.length && !model.collectionGaps.length && <p>No unknowns or collection gaps recorded. Scope limitations still apply.</p>}
            </section>
            <section id="recipient-evidence"><h2>Evidence included</h2><p>This share includes the recorded findings, recommendations, unknowns, scope and method explanation.</p><strong>Source evidence is not included in this share.</strong><p>Request appropriately scoped source evidence separately from the publisher.</p><ul>{model.declaredExclusions.map((x,i)=><li key={i}>{x}</li>)}</ul></section>
            <section id="recipient-method"><h2>Verification method</h2><h3>{model.verification.label}</h3><p>{model.verification.method}</p><p>{model.verification.boundary}</p><ul>{model.verification.established.map((x,i)=><li key={i}>{x}</li>)}</ul><p>{model.reproduction.trustBoundary}</p><details><summary>Recorded verification checks and digest identities</summary><ul>{model.verificationChecks.map(c=><li key={c.id}>{c.label}: {c.status}. {c.detail}</li>)}</ul><p>Source SHA-256: <code>{model.identity.sourceDigest}</code></p><p>Published snapshot SHA-256: <code>{digest}</code></p><p>This digest identifies this revision; it does not establish that the findings are true.</p></details></section>
            <section id="recipient-history"><h2>Report history</h2><dl><dt>Observed</dt><dd>{date(model.subject.observedAt)}</dd><dt>Report generated</dt><dd>{date(model.identity.generatedAt)}</dd><dt>Published</dt><dd>{publishedAt ? date(publishedAt) : preview ? 'Not published — preview only' : 'Publication date unavailable'}</dd></dl><p>Fixed revision. Later checks and corrections require a new publication. These dates are not a remediation history.</p></section>
            <section id="recipient-export"><h2>Export</h2><p>PDF contains this recipient-safe revision only. Downloaded copies cannot be recalled.</p>{!preview && <button className="button secondary" onClick={()=>window.print()}>Export PDF</button>}<p><a href="https://app.witnessops.com/signup" referrerPolicy="no-referrer">Run your own check</a> · A separate account; no access to the publisher’s workspace is transferred.</p></section>
        </article>
        {!preview && <div className={styles.print}><header><h1>{title}</h1><p>Publisher-supplied report name · Fixed recipient revision</p><p>Snapshot SHA-256: {digest}</p>{publishedAt && <p>Published {date(publishedAt)}</p>}<p>Source evidence is not included in this share.</p></header><BuyerReportDocument model={model}/></div>}
    </div>;
}
