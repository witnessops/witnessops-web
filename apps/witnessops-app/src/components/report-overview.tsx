"use client";

import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import type { ProofpackReportV1 } from '../../../witnessops-web/src/lib/proofpack/report-model';
import { findingReferences, reportOutcomeChart } from '../lib/report-overview-model';
import styles from './report-overview.module.css';

type Finding = ProofpackReportV1['findings'][number];
type Props = { model: ProofpackReportV1; evidenceHref: (finding: Finding) => string };
const readable = (value: string) => value.replaceAll('_', ' ');
const recordedValue = (value: unknown) => value == null ? 'No observation recorded.' : typeof value === 'string' ? value : JSON.stringify(value, null, 2);

/** An interactive reading aid over the admitted model; never a collector or verifier. */
export function ReportOverview({ model, evidenceHref }: Props) {
  const id = useId();
  const chart = reportOutcomeChart(model);
  const [selection, setSelection] = useState(model.findings.length ? 'finding:0' : model.coverage.length ? 'coverage:0' : '');
  const [active, setActive] = useState('item');
  const [kind, rawIndex] = selection.split(':');
  const index = Number(rawIndex);
  const finding = kind === 'finding' ? model.findings[index] : undefined;
  const coverage = kind === 'coverage' ? model.coverage[index] : undefined;
  const references = useMemo(() => finding ? findingReferences(model, finding) : [], [model, finding]);
  const reference = references.find(item => item.key === active);
  const visibleReferences = references.slice(0, 6);
  const itemTitle = finding?.title ?? coverage?.label ?? 'No finding or coverage item recorded';
  const detailTitle = active === 'report' ? 'Report and scope' : active === 'limits' ? 'Unknowns and collection gaps' : reference ? reference.artifact?.label ?? reference.reference : itemTitle;
  const activate = (key: string) => setActive(key);
  const nodeProps = (key: string) => ({ 'aria-pressed': active === key, 'aria-controls': `${id}-detail`, onClick: () => activate(key) });

  return <section className={styles.overview} aria-label="Visual report overview">
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>Explore this report</p><h2>From results to evidence.</h2><p className={styles.lead}>See the recorded outcomes, then follow the references behind a finding.</p></div>
      <div className={styles.identity}><span>{model.identity.productName}</span><strong>{model.subject.label}</strong><span>Observed {model.subject.observedAt}</span></div>
    </header>
    {model.identity.synthetic && <p className={styles.notice}>Synthetic / illustrative report. Not customer evidence.</p>}
    <div className={styles.summary}>
      <figure className={styles.chart} aria-label={chart.label}>
        <figcaption><h3>{chart.label}</h3><span>{chart.total} {model.summary.checks ? 'checks' : 'findings'}</span></figcaption>
        <ul className={styles.bars}>{chart.bars.map(bar => <li key={bar.tone} data-tone={bar.tone}>
          <div className={styles.barLabel}><span>{bar.label}</span><strong>{bar.count}</strong></div>
          <div className={styles.track} aria-hidden="true"><span style={{ width: `${chart.total ? bar.count / chart.total * 100 : 0}%` }} /></div>
        </li>)}</ul>
        <p className={styles.caption}>{chart.boundary}</p>
      </figure>
      <aside className={styles.limitSummary} aria-label="Evidence coverage and limits">
        <p className={styles.eyebrow}>Read alongside the results</p>
        <dl><div><dt>Coverage items with collected evidence</dt><dd>{model.summary.coverage.complete}<span> / {model.summary.coverage.total}</span></dd></div><div><dt>Collection gaps</dt><dd>{model.collectionGaps.length}</dd></div><div><dt>Recorded unknowns / limitations</dt><dd>{model.unknowns.length}</dd></div></dl>
        <p className={styles.caption}>Collection completeness is separate from outcome. Unknowns and gaps may overlap; they are not additional findings.</p>
      </aside>
    </div>
    <div className={styles.graphHeader}><div><p className={styles.eyebrow}>Follow the recorded relationships</p><h3>Evidence map</h3><p>Choose an item, then select a node to inspect it. Connections describe report references, not causation or verified truth.</p></div>
      {(model.findings.length > 0 || model.coverage.length > 0) && <label className={styles.selector} htmlFor={`${id}-selection`}>Explore finding or coverage<select id={`${id}-selection`} value={selection} onChange={event => { setSelection(event.target.value); setActive('item'); }}>
        {model.findings.length > 0 && <optgroup label="Findings">{model.findings.map((item, i) => <option key={item.id} value={`finding:${i}`}>{item.title}</option>)}</optgroup>}
        {model.coverage.length > 0 && <optgroup label="Recorded coverage">{model.coverage.map((item, i) => <option key={item.id} value={`coverage:${i}`}>{item.label}</option>)}</optgroup>}
      </select></label>}
    </div>
    <div className={styles.map} role="group" aria-label="Recorded evidence relationships">
      <div className={styles.nodeColumn}><p className={styles.columnLabel}>01 · Report</p><button className={styles.node} type="button" {...nodeProps('report')}><span className={styles.nodeType}>Saved report</span><strong>{model.subject.label}</strong><span>Scope, method and source digest</span></button><button className={styles.node} type="button" {...nodeProps('limits')}><span className={styles.nodeType}>Report limits</span><strong>Unknowns and gaps</strong><span>{model.unknowns.length} unknowns · {model.collectionGaps.length} gaps</span></button></div>
      <div className={styles.connection} aria-hidden="true"><span>{finding || coverage ? 'contains' : 'no item'}</span>{(finding || coverage) && <i />}</div>
      <div className={styles.nodeColumn}><p className={styles.columnLabel}>02 · {finding ? 'Finding' : 'Coverage'}</p><button className={styles.node} type="button" {...nodeProps('item')}><span className={styles.nodeType}>{finding ? readable(finding.state) : coverage ? 'Recorded coverage' : 'No item'}</span><strong>{itemTitle}</strong><span>{finding ? finding.severity === null ? 'Severity not assessed' : `Recorded severity: ${finding.severity}` : coverage ? coverage.complete ? 'Collection complete' : 'Collection incomplete' : 'No relationship inferred'}</span></button></div>
      <div className={styles.connection} aria-hidden="true"><span>{references.length ? 'references' : 'no references'}</span>{references.length > 0 && <i />}</div>
      <div className={styles.nodeColumn}><p className={styles.columnLabel}>03 · References</p>{visibleReferences.map(item => <button key={item.key} type="button" className={styles.node} {...nodeProps(item.key)}><span className={styles.nodeType}>{item.kind === 'evidence' ? 'Recorded evidence reference' : item.artifact ? 'Matched source artifact' : 'Unresolved source reference'}</span><strong>{item.artifact?.label ?? item.reference}</strong><span>{item.artifact ? 'Exact artifact id or path match' : 'Reference text, not a verified source'}</span></button>)}
        {!references.length && <p className={styles.empty}>No explicit evidence or source references recorded for this item. No connection is inferred.</p>}
        {references.length > visibleReferences.length && <p className={styles.caption}>Showing {visibleReferences.length} of {references.length} references. Select the finding node for the complete recorded list.</p>}
      </div>
    </div>
    <section id={`${id}-detail`} className={styles.detail} aria-label="Selected evidence details">
      <div className={styles.detailHeading}><p className={styles.eyebrow}>Selected node</p><h3 aria-live="polite" aria-atomic="true">{detailTitle}</h3></div>
      {active === 'report' ? <div className={styles.detailGrid}><div><h4>Scope</h4><p>{model.subject.scopeSummary}</p><p>{model.subject.scopeBoundary}</p></div><div><h4>Recorded verification boundary</h4><p>{model.verification.label}</p><p>{model.verification.boundary}</p><h4>Source SHA-256</h4><code>{model.identity.sourceDigest}</code><p className={styles.caption}>The digest identifies source bytes. It is not a security score.</p></div></div>
      : active === 'limits' ? <div className={styles.detailGrid}><div><h4>Recorded unknowns and limitations</h4>{model.unknowns.length ? model.unknowns.map(item => <div className={styles.fact} key={item.id}><strong>{item.title}</strong><p>{item.reason}</p>{item.evidenceNeeded && <p>Evidence needed: {item.evidenceNeeded}</p>}</div>) : <p>No unknowns recorded. Scope and method limitations still apply.</p>}</div><div><h4>Collection gaps</h4>{model.collectionGaps.length ? model.collectionGaps.map(item => <div className={styles.fact} key={item.id}><strong>{item.label}</strong><p>{item.reason}</p></div>) : <p>No collection gaps recorded. This does not establish overall security.</p>}</div></div>
      : reference ? <><p className={styles.referenceText}>{reference.reference}</p>{reference.artifact ? <><p>{reference.artifact.relationship}</p><dl className={styles.artifact}><dt>Artifact id</dt><dd>{reference.artifact.id}</dd>{reference.artifact.path && <><dt>Recorded path</dt><dd>{reference.artifact.path}</dd></>}{reference.artifact.digest && <><dt>Recorded digest</dt><dd>{reference.artifact.digest}</dd></>}</dl><p className={styles.caption}>Matched by exact id or path in this report. This view performs no new verification.</p></> : <p>{reference.kind === 'source' ? 'No unique source artifact matches this exact reference in the report.' : 'This is the evidence reference recorded with the finding; its text alone does not establish the evidence content or authenticity.'}</p>}{finding && <Link className={styles.evidenceLink} href={evidenceHref(finding)}>Inspect existing evidence →</Link>}</>
      : finding ? <><div className={styles.detailGrid}><div><h4>Recorded observation</h4><pre>{recordedValue(finding.observation)}</pre></div><div><h4>Interpretation</h4><p>{finding.interpretation || 'No interpretation recorded.'}</p><h4>Recommended next step</h4><p>{finding.recommendation || 'No recommendation recorded. Agree the appropriate follow-up with the responsible owner.'}</p><h4>Finding limits</h4>{finding.limitations.length ? <ul>{finding.limitations.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p>No finding-specific limitations recorded. The report scope and unknowns still apply.</p>}</div></div><details className={styles.references}><summary>All recorded references ({references.length})</summary>{references.length ? <ul>{references.map(item => <li key={item.key}><strong>{item.kind === 'evidence' ? 'Evidence' : 'Source'}:</strong> {item.reference}{item.kind === 'source' ? item.artifact ? ' — exact artifact match' : ' — unresolved' : ''}</li>)}</ul> : <p>No references recorded.</p>}</details><Link className={styles.evidenceLink} href={evidenceHref(finding)}>Inspect existing evidence →</Link></>
      : coverage ? <><p>{coverage.complete ? 'Collection complete' : 'Collection incomplete'} · Recorded outcome: {coverage.observedState ?? 'Not recorded'}</p><pre>{recordedValue(coverage.observation)}</pre><p className={styles.caption}>This coverage item does not declare evidence relationships. Its presence does not imply a passing outcome.</p></> : <p>No finding or coverage item is available. Read the report scope and limits.</p>}
    </section>
    <p className={styles.footer}>This map reads the saved report only. Opening nodes does not run a check, change evidence or establish remediation.</p>
  </section>;
}
