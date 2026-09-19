'use client';
import { hasWorkspaceCapability } from '../lib/workspace-role-policy';
import { reportFollowThrough } from './report-follow-through';
import { ReportShare } from './report-share';
import Link from 'next/link';
import { CHECK_DISCOVERY } from '../lib/check-discovery';
import { publicContactMailto } from '../../../witnessops-web/src/lib/public-contact';
import { fetchLinuxCheck } from '../lib/linux-reopen';
import { useEffect, useState, type FormEvent } from 'react';
import type { LinuxComparison } from '../lib/linux-comparison';
import type { Asset, LinuxCheckRun, Workspace } from '../lib/model';
import { BuyerReportDocument } from '../../../witnessops-web/src/components/proofpack/buyer-report';
import { useBuyerReportPrint } from '../../../witnessops-web/src/components/proofpack/buyer-report-print';
import { isBuyerReport, type ProofpackReportV1 } from '../../../witnessops-web/src/lib/proofpack/report-model';

function date(value: string) {
  return `${new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

function savedChecks(workspace: Workspace, assetId?: string) {
  return (workspace.linuxRuns ?? []).filter(run => !assetId || run.assetId === assetId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}

export function LinuxHistory({ workspace, assetId }: { workspace: Workspace; assetId?: string }) {
  const runs = savedChecks(workspace, assetId);
  if (!runs.length) return !assetId ? null : <p className="quiet">No saved server checks yet. Follow the operator-assisted steps above, then import your first One Server Security Check. Its result and report will appear here.</p>;
  return <div className="linux-history">
    <div className="linux-history-head" aria-hidden="true"><span>Saved check</span><span>Observed / imported</span><span>Source at admission</span><span /></div>
    <ul className="ledger history">{runs.map(run => <li key={run.id}>
      <Link className="ledger-row linux-history-row" href={`/runs/${run.id}`}>
        <div><strong>{run.observedHostname}</strong><span>One Server Security Check · {run.synthetic ? 'Synthetic' : 'Recorded'}</span></div>
        <div><span>Observed <time dateTime={run.observedAt}>{date(run.observedAt)}</time></span><span>Imported <time dateTime={run.createdAt}>{date(run.createdAt)}</time></span></div>
        <div><span>Local Audit 1.2.2 · {run.profileId}</span><span>Package checks passed at admission</span><span>Collection: {run.outcome}</span></div>
        <span className="linux-history-open">Open saved check →</span>
      </Link>
    </li>)}</ul>
  </div>;
}

export function LinuxAsset({ workspace, asset, imported }: { workspace: Workspace; asset: Asset; imported: (run: LinuxCheckRun) => Promise<void> }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const runs = savedChecks(workspace, asset.id);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget); form.set('assetId', asset.id);
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/linux-checks', { method: 'POST', credentials: 'same-origin', headers: { 'X-WitnessOps-Workspace': workspace.id }, body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Import did not complete.');
      await imported(payload);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Import did not complete.'); }
    finally { setBusy(false); }
  }
  return <div className="linux-asset">
    <Link className="back" href="/assets">← Assets</Link>
    <header className="page-heading"><div>
      <p className="eyebrow">One Server Security Check</p>
      <h1 className="identifier">{asset.hostname}</h1>
      <div className="support"><p>Recommended check: {CHECK_DISCOVERY.linux_server.name}</p><p>Runs a bounded read-only check locally on one Linux server and preserves a verifiable Proofpack.</p></div>
    </div></header>
    <div className="linux-workflow">
      <section className="linux-setup" aria-labelledby="linux-setup-heading">
        <p className="eyebrow">Need a signed package?</p><h2 id="linux-setup-heading">How to get a server check</h2>
        <ol><li>Run WitnessOps Local Audit 1.2.2 locally on the Linux server with an authorized operator present.</li><li>The operator finalizes and signs the captured check off-host, providing a Proofpack ZIP and matching signature file.</li><li>Import both files here. WitnessOps verifies the package and saves the result.</li></ol>
        <p className="quiet">Early Access: setup is currently operator-assisted.</p>
        <a href={publicContactMailto('WitnessOps — One Server Security Check setup')}>Contact WitnessOps for setup help →</a>
      </section>
      {hasWorkspaceCapability(workspace.role, 'linux:import') ? <form className="asset-form linux-import-panel" aria-labelledby="linux-import-heading" aria-busy={busy} onSubmit={submit}>
        <div><p className="eyebrow">Import existing source</p><h2 id="linux-import-heading">Import Security Check</h2></div>
        <p>Import a signed Local Audit 1.2.2 Proofpack from a supported Linux server. It does not run a collector, connect by SSH or install software.</p>
        <p className="quiet">{CHECK_DISCOVERY.linux_server.output}</p>
        <div className="linux-file-field"><label htmlFor="linux-zip">Original Proofpack ZIP</label><input id="linux-zip" name="zip" type="file" accept=".zip" required disabled={busy} /></div>
        <div className="linux-file-field"><label htmlFor="linux-signature">Detached signature (.zip.sig.json)</label><input id="linux-signature" name="signature" type="file" accept=".json" required disabled={busy} /></div>
        <p className="quiet">The recorded hostname must match this asset. WitnessOps selects the accepted trust registry. Original source files stay intact.</p>
        {error ? <p className="error" role="alert">{error}</p> : null}
        <button className="button" disabled={busy}>{busy ? 'Verifying import…' : 'Import Security Check'}</button>
        {busy ? <p role="status">Checking the signed package and saving its original source…</p> : null}
      </form> : <div className="linux-import-panel"><p className="eyebrow">Import existing source</p><h2>Saved evidence access</h2><p>Viewer access · Only an Owner can import a check.</p></div>}
    </div>
    <p className="quiet boundary">Package verification does not establish that a server is secure, uncompromised or compliant.</p>
    <section className="section" aria-labelledby="linux-history-heading">
      <div className="section-heading"><h2 id="linux-history-heading">Saved checks</h2><p className="quiet">{runs.length} saved · Latest import first</p></div>
      <LinuxHistory workspace={workspace} assetId={asset.id} />
    </section>
    {runs[0] ? <LinuxChangesLoader workspaceId={workspace.id} runId={runs[0].id} /> : null}
  </div>;
}

function LinuxReport({ model, run, workspaceId, comparison, role }: { model: ProofpackReportV1; run: LinuxCheckRun; workspaceId: string; comparison?: LinuxComparison; role: string }) {
  const context = { linux: true, evidenceHref: (finding: typeof model.findings[number]) => `#report-evidence-${model.findings.indexOf(finding) + 1}`, recheckHref: hasWorkspaceCapability(role, 'linux:import') ? `/assets/${run.assetId}` : undefined };
  const { print, printRoot } = useBuyerReportPrint(model, reportFollowThrough(model, context, false));
  const [error, setError] = useState('');
  async function download(artifact: 'zip' | 'signature') {
    setError('');
    try {
      const response = await fetch(`/api/linux-checks?id=${run.id}`, { cache: 'no-store', credentials: 'same-origin', headers: { 'X-WitnessOps-Workspace': workspaceId, 'X-WitnessOps-Artifact': artifact } });
      if (!response.ok) throw new Error('Original source could not be reopened and verified.');
      const url = URL.createObjectURL(await response.blob()), anchor = document.createElement('a');
      anchor.href = url; anchor.download = response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'source'; anchor.click(); URL.revokeObjectURL(url);
    } catch { setError('Original source could not be reopened and verified.'); }
  }
  return <>{printRoot}
    <Link className="back" href={`/assets/${run.assetId}`}>← Linux server</Link>
    <header className="page-heading"><div>
      <p className="eyebrow">One Server Security Check</p><h1>Saved check</h1>
      <div className="support"><p>Original Local Audit 1.2.2 source reverified on reopen. This report is derived; the signed ZIP remains the source.</p></div>
      <p className="quiet linux-run-identity">{run.synthetic ? 'Synthetic check' : 'Live server check'} · App run <span className="identifier">{run.id}</span></p>
    </div></header>
    <section className="linux-export-panel" aria-labelledby="linux-export-heading">
      <div><h2 id="linux-export-heading">Report and original source</h2><p className="quiet">Save the readable report for a review. Keep the original ZIP and its signature together for verification.</p></div>
      <div className="actions"><button className="button" onClick={print}>Save report as PDF</button><button className="button secondary" onClick={() => void download('zip')}>Download original ZIP</button><button className="button secondary" onClick={() => void download('signature')}>Download detached signature</button><Link className="button secondary" href={`/reports/${run.id}`}>Open report</Link></div>
      {error ? <p className="error" role="alert">{error}</p> : null}
    </section>
    <LinuxChanges comparison={comparison} />
    <BuyerReportDocument model={model} followThrough={reportFollowThrough(model, context)} />
  </>;
}

export function LinuxCheckPage({ runId, workspaceId, role }: { runId: string; workspaceId: string; role: string }) {
  const [loaded, setLoaded] = useState<{ model: ProofpackReportV1; run: LinuxCheckRun; comparison?: LinuxComparison } | null>(null), [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoaded(null); setError(''); setBusy(false);
    fetchLinuxCheck(runId, workspaceId, controller.signal, () => { if (active) setBusy(true); }).then(async response => {
      const payload = await response.json();
      if (!response.ok || !isBuyerReport(payload.model)) throw new Error('This saved check could not be accessed or reverified.');
      if (active) setLoaded(payload);
    }).catch(() => { if (active) setError('This saved check could not be accessed or reverified.'); });
    return () => { active = false; controller.abort(); };
  }, [runId, workspaceId]);
  if (error) return <p role="alert">{error}</p>;
  return loaded ? <><ReportShare key={`${workspaceId}:${runId}`} workspaceId={workspaceId} runId={runId} role={role}/><LinuxReport model={loaded.model} run={loaded.run} workspaceId={workspaceId} role={role} comparison={loaded.comparison} /></> : <p role="status">{busy ? 'Verification is busy. Retrying…' : 'Reopening and verifying original source…'}</p>;
}

function LinuxChanges({ comparison }: { comparison?: LinuxComparison }) {
  if (!comparison) return null;
  return <section className="change-panel linux-comparison">
    <div className="section-heading"><h2>What changed since the previous check?</h2>{comparison.baselineId ? <Link href={`/runs/${comparison.baselineId}`}>Open comparison baseline →</Link> : null}</div>
    <p>Comparison qualification: {comparison.qualification.replaceAll('_', ' ').toLowerCase()}.</p>
    <p className="quiet comparison-note">Nearest earlier imported check on this asset. Hostname alone does not prove physical-machine identity. Change does not mean vulnerability; no cause is inferred.</p>
    {!comparison.baselineId ? <p>No earlier admitted check for this asset.</p> : null}
    <div className="change-columns">{(['environment', 'coverage', 'uncertainty'] as const).map(kind => <div key={kind}>
      <h3>{kind[0].toUpperCase() + kind.slice(1)}</h3>
      {comparison[kind].length ? <ul>{comparison[kind].map((line, i) => <li key={i}>{line}</li>)}</ul> : <p>{kind === 'environment' ? (comparison.qualification === 'COMPARABLE' || comparison.qualification === 'COLLECTION_GAP' ? 'No change in comparable recorded host values.' : 'Host-value comparison not established.') : kind === 'coverage' ? 'No recorded coverage change.' : 'No additional collection uncertainty reported.'}</p>}
    </div>)}</div>
  </section>;
}
function LinuxChangesLoader({workspaceId,runId}:{workspaceId:string;runId:string}) {
  const [comparison,setComparison]=useState<LinuxComparison>();
  const [error,setError]=useState(false);
  const [busy,setBusy]=useState(false);
  useEffect(()=>{let active=true;const controller=new AbortController();setComparison(undefined);setError(false);setBusy(false);
    fetchLinuxCheck(runId,workspaceId,controller.signal,()=>{if(active)setBusy(true);}).then(async r=>{if(!r.ok)throw new Error();const data=await r.json();if(active)setComparison(data.comparison);}).catch(()=>{if(active)setError(true);});
    return()=>{active=false;controller.abort();};
  },[workspaceId,runId]);
  return error?<p role="alert">Comparison could not be reverified.</p>:!comparison&&busy?<p role="status">Verification is busy. Retrying…</p>:<LinuxChanges comparison={comparison}/>;
}
