'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import type { Asset, LinuxCheckRun, Workspace } from '../lib/model';
import { BuyerReportDocument } from '../../../witnessops-web/src/components/proofpack/buyer-report';
import { useBuyerReportPrint } from '../../../witnessops-web/src/components/proofpack/buyer-report-print';
import { isBuyerReport, type ProofpackReportV1 } from '../../../witnessops-web/src/lib/proofpack/report-model';

export function LinuxHistory({ workspace, assetId }: { workspace: Workspace; assetId?: string }) {
  const runs = (workspace.linuxRuns ?? []).filter(run => !assetId || run.assetId === assetId);
  return <ul className="ledger history">{runs.map(run => <li key={run.id}><Link className="ledger-row" href={`/runs/${run.id}`}><div><strong>{run.observedHostname}</strong><span>One Server Security Check · {run.synthetic ? 'Synthetic' : 'Recorded'}</span><span>{new Date(run.observedAt).toLocaleString()}</span></div><span>Open saved check →</span></Link></li>)}</ul>;
}

export function LinuxAsset({ workspace, asset, imported }: { workspace: Workspace; asset: Asset; imported: (run: LinuxCheckRun) => Promise<void> }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
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
  return <div className="narrow"><Link href="/assets">← Assets</Link><p className="eyebrow">One Server Security Check</p><h1>{asset.hostname}</h1><p>Runs a bounded read-only check locally on one Linux server and preserves a verifiable Proofpack.</p><p>This app slice imports an existing synthetic Local Audit 1.2.2 check only. It does not run a collector, connect by SSH or install software.</p><p>Package verification does not establish that a server is secure, uncompromised or compliant.</p>{workspace.role === 'owner' ? <form className="asset-form" onSubmit={submit}><h2>Import Security Check</h2><label htmlFor="linux-zip">Original Proofpack ZIP</label><input id="linux-zip" name="zip" type="file" accept=".zip" required disabled={busy} /><label htmlFor="linux-signature">Detached signature (.zip.sig.json)</label><input id="linux-signature" name="signature" type="file" accept=".json" required disabled={busy} /><p className="quiet">The recorded hostname must match this asset. WitnessOps selects the accepted trust registry. Original source files stay intact.</p><button className="button" disabled={busy}>{busy ? 'Verifying import…' : 'Import Security Check'}</button></form> : <p>Viewer access · Only an Owner can import a check.</p>}{error ? <p role="alert">{error}</p> : null}<h2>Saved checks</h2><LinuxHistory workspace={workspace} assetId={asset.id} /><p className="quiet">Linux comparison is not available in this slice.</p></div>;
}

function LinuxReport({ model, run, workspaceId }: { model: ProofpackReportV1; run: LinuxCheckRun; workspaceId: string }) {
  const { print, printRoot } = useBuyerReportPrint(model);
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
  return <>{printRoot}<Link href={`/assets/${run.assetId}`}>← Linux server</Link><p className="eyebrow">One Server Security Check</p><h1>Saved check</h1><p>Original Local Audit 1.2.2 source reverified on reopen. This report is derived; the signed ZIP remains the source.</p><p className="quiet">Synthetic check · App run {run.id}</p><div className="actions"><button className="button" onClick={print}>Save report as PDF</button><button className="button secondary" onClick={() => void download('zip')}>Download original ZIP</button><button className="button secondary" onClick={() => void download('signature')}>Download detached signature</button><Link href={`/reports/${run.id}`}>Open report</Link></div>{error ? <p role="alert">{error}</p> : null}<BuyerReportDocument model={model} /></>;
}

export function LinuxCheckPage({ runId, workspaceId }: { runId: string; workspaceId: string }) {
  const [loaded, setLoaded] = useState<{ model: ProofpackReportV1; run: LinuxCheckRun } | null>(null), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoaded(null); setError('');
    fetch(`/api/linux-checks?id=${runId}`, { cache: 'no-store', credentials: 'same-origin', headers: { 'X-WitnessOps-Workspace': workspaceId } }).then(async response => {
      const payload = await response.json();
      if (!response.ok || !isBuyerReport(payload.model)) throw new Error('This saved check could not be accessed or reverified.');
      if (active) setLoaded(payload);
    }).catch(() => { if (active) setError('This saved check could not be accessed or reverified.'); });
    return () => { active = false; };
  }, [runId, workspaceId]);
  if (error) return <p role="alert">{error}</p>;
  return loaded ? <LinuxReport model={loaded.model} run={loaded.run} workspaceId={workspaceId} /> : <p role="status">Reopening and verifying original source…</p>;
}
