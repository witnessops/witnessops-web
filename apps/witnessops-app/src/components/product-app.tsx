"use client";

import Link from "next/link";
import { WitnessOpsMark } from "@witnessops/ui/witnessops-mark";
import { BuyerReportDocument } from "../../../witnessops-web/src/components/proofpack/buyer-report";
import { useBuyerReportPrint } from "../../../witnessops-web/src/components/proofpack/buyer-report-print";
import { savedRunReport } from "../lib/report-model";
import { logout } from "../app/actions/logout";
import { canonicalSource } from "../lib/source-digest";
import { nextAction, observationFacts, observationSummary } from "../lib/observation-presentation";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  CHECK_IDS,
  CHECK_LABELS,
  SNAPSHOT_BOUNDARY,
  STATUS_LABEL,
  compareRuns,
  type Asset,
  type ExternalCheckResultV1,
  type Run,
  type Workspace,
  type WorkspaceState,
} from "../lib/model";

const nav = [
  { href: "/", label: "Overview", glyph: "▦" },
  { href: "/assets", label: "Assets", glyph: "◇" },
  { href: "/reports", label: "Reports", glyph: "▤" },
  { href: "/members", label: "Members", glyph: "◎" },
  { href: "/settings", label: "Settings", glyph: "⚙" },
];

async function request<T>(path: string, method = "GET", body?: unknown, workspaceId?: string): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(workspaceId ? { "X-WitnessOps-Workspace": workspaceId } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : payload?.error?.message;
    throw new Error(message || `Request could not complete (${response.status}).`);
  }
  return payload as T;
}

function date(value: string) {
  return new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function orderedRuns(workspace: Workspace, assetId?: string) {
  return workspace.runs
    .filter((run) => !assetId || run.assetId === assetId)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function previousRun(workspace: Workspace, run: Run) {
  const runs = orderedRuns(workspace, run.assetId);
  return runs[runs.findIndex((item) => item.id === run.id) + 1];
}

function attention(run?: Run) {
  if (!run) return "Not observed yet";
  const count = run.snapshot.checks.filter(check => check.status === "NEEDS_ATTENTION").length;
  const unknown = run.snapshot.checks.filter(check => !check.collected || ["UNDETERMINED", "CHECK_ERROR"].includes(check.status)).length;
  const flags = count ? `${count} ${count === 1 ? "observation needs" : "observations need"} attention` : "No attention flags in this snapshot";
  return unknown ? `${flags} · ${unknown} undetermined` : flags;
}

function Status({ check }: { check: ExternalCheckResultV1 }) {
  return <span className={`status status-${check.status.toLowerCase()}`}>{STATUS_LABEL[check.status]}</span>;
}

function Header({ title, children, eyebrow = "External Exposure", action }: { title: string; children?: ReactNode; eyebrow?: string; action?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children ? <div className="support">{children}</div> : null}</div>{action}</div>;
}

function Counts({ run }: { run: Run }) {
  const checks = run.snapshot.checks;
  const items = [
    ["Needs attention", checks.filter((check) => check.status === "NEEDS_ATTENTION").length, "attention"],
    ["Clear", checks.filter((check) => check.status === "OBSERVED_EXPECTED").length, "clear"],
    ["Informational", checks.filter((check) => check.status === "INFORMATIONAL").length, "info"],
    ["Undetermined", checks.filter((check) => ["UNDETERMINED", "CHECK_ERROR"].includes(check.status)).length, "unknown"],
  ];
  return <div><dl className="counts">{items.map(([label, count, color]) => <div key={label}><dd className={`count-${color}`}>{count}</dd><dt>{label}</dt></div>)}</dl><p className="quiet">Clear means this check matched expected conditions. It is not an overall security grade.</p></div>;
}

function Changes({ current, previous }: { current: Run; previous?: Run }) {
  const change = compareRuns(current, previous);
  if (change.baseline) return <section className="change-panel"><h2>First observation</h2><p>This is your baseline. Run again later to see what changed. Previous evidence stays intact.</p></section>;
  return <section className="change-panel"><h2>What changed</h2><p className="comparison-time">Compared with {date(previous!.snapshot.finished_at)}.</p><div className="change-columns"><div><h3>Environment</h3>{change.environment.length ? <ul>{change.environment.map(line => <li key={line}>{line}</li>)}</ul> : <p>No change in comparable target observations.</p>}</div><div><h3>Coverage</h3>{change.coverage.length ? <ul>{change.coverage.map(line => <li key={line}>{line}</li>)}</ul> : <p>The check set and method are unchanged.</p>}</div></div>{change.uncertainty.length ? <div className="uncertainty"><h3>Not comparable</h3><ul>{change.uncertainty.map(line => <li key={line}>{line}</li>)}</ul><p>Collection uncertainty is not a new security finding.</p></div> : null}<p className="comparison-note">Environment means the observed hostname state; Coverage means what or how we checked. A coverage update does not rewrite earlier evidence.</p></section>;
}

function RecommendedChecks({ expanded = false }: { expanded?: boolean }) {
  return <details className="method-panel" open={expanded || undefined}><summary>Recommended checks <span>10 bounded hostname observations</span></summary><p>DNS, certificates, HTTPS responses and published mail policies. This fixed set observes one public hostname; it does not inspect your whole organization.</p><ul className="check-list">{CHECK_IDS.map(id => <li key={id}>{CHECK_LABELS[id]}</li>)}</ul><p className="quiet">Individual check selection is not available. No credentials or exploitation. Adding the asset does not run these checks.</p></details>;
}

function RunControl({ asset, latest, busy, onRun }: { asset: Asset; latest?: Run; busy: boolean; onRun: (asset: Asset) => Promise<void> }) {
  const [authorized, setAuthorized] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!authorized || busy) return;
    setAuthorized(false);
    await onRun(asset);
  }
  return <form className="run-control" id="run-observation" onSubmit={submit}><p><strong>{latest ? "Observe again when you want a fresh comparison" : "Run your first observation"}</strong><span>Ten bounded public checks against <span className="mono">{asset.hostname}</span>. {latest ? "Previous evidence stays intact. No scheduled collection." : "This starts collection only after you authorize and choose Run observation."}</span></p><label className="authorization"><input type="checkbox" checked={authorized} onChange={event => setAuthorized(event.target.checked)} disabled={busy} /><span>I own this hostname or am authorized to check it.</span></label><button className="button" disabled={!authorized || busy}>{busy ? "Observing…" : latest ? "Run again" : "Run observation"}</button></form>;
}

function ObservationList({ run }: { run: Run }) {
  return <ul className="ledger observations">{run.snapshot.checks.map(check => <li key={check.check_id}><Link href={`/runs/${run.id}/observations/${check.check_id}`} className="observation-row"><div className="row-content"><div className="row-title"><strong>{check.title}</strong><Status check={check} /></div><p className="observed-summary"><span>Observed</span> {observationSummary(check)}</p><p>{check.interpretation}</p>{check.status !== "OBSERVED_EXPECTED" && check.limitations[0] ? <p className="observation-limit">Limit: {check.limitations[0]}</p> : null}<span className="evidence-link">Inspect evidence →</span></div></Link></li>)}</ul>;
}

function ResultSummary({ run }: { run: Run }) {
  const attentionChecks = run.snapshot.checks.filter(check => check.status === "NEEDS_ATTENTION");
  const unknown = run.snapshot.checks.filter(check => !check.collected || ["UNDETERMINED", "CHECK_ERROR"].includes(check.status));
  const informational = run.snapshot.checks.filter(check => check.status === "INFORMATIONAL");
  return <section className="summary-panel" aria-label="Observation summary"><h2>Recorded result</h2><Counts run={run} /><div className="next-step"><h3>What needs attention?</h3>{attentionChecks.length ? <><p>Review these recorded observations before deciding what to change.</p><ul>{attentionChecks.map(check => <li key={check.check_id}><Link href={`/runs/${run.id}/observations/${check.check_id}`}>{check.title} →</Link></li>)}</ul></> : <p>No attention flags in this snapshot. This does not establish that the hostname is secure.</p>}{unknown.length ? <div className="unresolved"><h3>{unknown.length} {unknown.length === 1 ? "check is" : "checks are"} Undetermined</h3><p>The recorded result does not establish an outcome for these checks. Inspect the collection limits before rerunning.</p><ul>{unknown.map(check => <li key={check.check_id}><Link href={`/runs/${run.id}/observations/${check.check_id}`}>{check.title} →</Link></li>)}</ul></div> : null}{!attentionChecks.length && !unknown.length ? <p>{informational.length ? `${informational.length} informational observations provide context, not attention flags. ` : ""}Keep this baseline and run again later to compare.</p> : null}</div><div className="actions"><Link className="button secondary" href={`/reports/${run.id}`}>View report</Link><a className="text-action" href="#all-observations">Inspect all {run.snapshot.checks.length} observations ↓</a></div></section>;
}

function History({ workspace, assetId, report = false }: { workspace: Workspace; assetId?: string; report?: boolean }) {
  const runs = orderedRuns(workspace, assetId);
  if (!runs.length) return <div className="empty compact"><h2>No {report ? "reports" : "observations"} yet.</h2><p>{assetId ? "Your first observation will appear here. Nothing has been collected yet." : "Open an asset and run its recommended checks to save an observation."}</p>{!assetId ? <Link className="button secondary" href="/assets">View assets</Link> : null}</div>;
  return <ul className="ledger history">{runs.map(run => <li key={run.id}><Link className="ledger-row" href={`/${report ? "reports" : "runs"}/${run.id}`}><div><strong className="mono">{run.snapshot.target}</strong><span>{date(run.snapshot.finished_at)}</span><span className="quiet">{run.snapshot.checks.length} recorded checks</span></div><span className="attention-label">{attention(run)}</span></Link></li>)}</ul>;
}

function AssetList({ workspace }: { workspace: Workspace }) {
  if (!workspace.assets.length) return <div className="empty"><h2>Start with one public hostname</h2><p>Add a domain such as example.com or a hostname such as app.example.com. See the recommended checks, then choose when to observe. Adding it does not start collection.</p>{workspace.role === "owner" ? <Link className="button" href="/assets/new">Add asset</Link> : <p>Ask a workspace Owner to add the first asset.</p>}<p className="quiet">Each run preserves the evidence so your next observation can show what changed.</p></div>;
  const rows = workspace.assets.map(asset => {
    const latest = orderedRuns(workspace, asset.id)[0];
    const changes = latest ? compareRuns(latest, previousRun(workspace, latest)) : undefined;
    const priority = latest?.snapshot.checks.some(check => check.status === "NEEDS_ATTENTION") ? 0 : latest?.snapshot.checks.some(check => !check.collected || ["UNDETERMINED", "CHECK_ERROR"].includes(check.status)) ? 1 : !latest ? 2 : changes?.environment.length ? 3 : 4;
    return { asset, latest, changes, priority };
  }).sort((a, b) => a.priority - b.priority);
  return <ul className="ledger">{rows.map(({ asset, latest, changes }) => <li key={asset.id}><Link className="ledger-row" href={`/assets/${asset.id}`}><div><strong className="mono">{asset.hostname}</strong><span>{latest ? `Last observed ${date(latest.snapshot.finished_at)}` : "Ready for its first observation"}</span>{changes && !changes.baseline ? <span>{changes.environment.length} Environment · {changes.coverage.length} Coverage changes{changes.uncertainty.length ? ` · ${changes.uncertainty.length} not comparable` : ""}</span> : null}</div><span className="attention-label">{attention(latest)} <span aria-hidden="true">→</span></span></Link></li>)}</ul>;
}

function Overview({ workspace }: { workspace: Workspace }) {
  const latest = workspace.assets.map(asset => orderedRuns(workspace, asset.id)[0]).filter((run): run is Run => Boolean(run));
  const needsAttention = latest.filter(run => run.snapshot.checks.some(check => check.status === "NEEDS_ATTENTION")).length;
  const unresolved = latest.filter(run => run.snapshot.checks.some(check => !check.collected || ["CHECK_ERROR", "UNDETERMINED"].includes(check.status))).length;
  const comparisons = latest.map(run => compareRuns(run, previousRun(workspace, run)));
  return <><Header title={workspace.name} action={workspace.assets.length && workspace.role === "owner" ? <Link className="button" href="/assets/new">Add asset</Link> : undefined}><p>See what your public hostname exposes. Inspect the evidence, then rerun to see what changed.</p></Header>{workspace.assets.length ? <><dl className="overview-stats"><div><dt>Assets</dt><dd>{workspace.assets.length}</dd></div><div><dt>Need attention</dt><dd>{needsAttention || "None"}</dd></div><div><dt>Environment changes</dt><dd>{comparisons.filter(change => change.environment.length).length} assets</dd></div><div><dt>Coverage changes</dt><dd>{comparisons.filter(change => change.coverage.length).length} assets</dd></div></dl>{unresolved || latest.length < workspace.assets.length ? <p className="overview-note">{unresolved ? `${unresolved} ${unresolved === 1 ? "asset has" : "assets have"} undetermined checks. ` : ""}{latest.length < workspace.assets.length ? `${workspace.assets.length - latest.length} ${workspace.assets.length - latest.length === 1 ? "asset has" : "assets have"} not been observed yet.` : ""}</p> : null}<section className="section"><div className="section-heading"><h2>Your assets</h2><Link href="/assets">View all assets →</Link></div><AssetList workspace={workspace} /></section></> : <AssetList workspace={workspace} />}<p className="quiet boundary">Each run records one hostname at one point in time. A clear observation does not mean the asset is safe or free of vulnerabilities.</p></>;
}

function AddAsset({ busy, onAdd }: { busy: boolean; onAdd: (hostname: string) => Promise<void> }) {
  const [hostname, setHostname] = useState("");
  return <div className="narrow"><Header title="Add asset"><p>Start with a public domain or hostname you are authorized to observe. Each asset covers one hostname, not all of its subdomains.</p></Header><form className="asset-form" onSubmit={event => { event.preventDefault(); if (hostname.trim() && !busy) void onAdd(hostname); }}><label htmlFor="asset-hostname">Public hostname</label><input id="asset-hostname" value={hostname} onChange={event => setHostname(event.target.value)} placeholder="example.com" autoCapitalize="none" autoCorrect="off" spellCheck={false} required maxLength={253} disabled={busy} /><p className="quiet">For example, example.com or app.example.com. No URL path, port or IP address. Adding an asset does not prove ownership.</p><RecommendedChecks expanded /><p className="add-boundary">Adding saves the hostname only. You will authorize collection separately on the asset page.</p><div className="actions"><button className="button" disabled={busy || !hostname.trim()}>{busy ? "Adding…" : "Add without scanning"}</button><Link className="button secondary" href="/assets">Cancel</Link></div></form></div>;
}

function AssetPage({ workspace, asset, busy, onRun }: { workspace: Workspace; asset: Asset; busy: boolean; onRun: (asset: Asset) => Promise<void> }) {
  const latest = orderedRuns(workspace, asset.id)[0];
  return <><Link className="back" href="/assets">← Assets</Link><Header title={asset.hostname} eyebrow="Hostname" action={workspace.role === "owner" ? <a className="button secondary" href="#run-observation">{latest ? "Run again ↓" : "Run observation ↓"}</a> : undefined}><p>{latest ? `Last observed ${date(latest.snapshot.finished_at)}` : "Not yet observed · adding this hostname did not run any checks."}</p></Header>{latest ? <><ResultSummary run={latest} /><Changes current={latest} previous={previousRun(workspace, latest)} /></> : <RecommendedChecks expanded />}{workspace.role === "owner" ? <RunControl asset={asset} latest={latest} busy={busy} onRun={onRun} /> : <p className="quiet boundary">Viewer access · Only an Owner can start an observation.</p>}{latest ? <><RecommendedChecks /><section className="section" id="all-observations"><h2>All observations</h2><ObservationList run={latest} /></section></> : null}<section className="section"><h2>Run history</h2><p className="quiet">Previous evidence stays intact. Rerun later to compare; no monitoring happens automatically.</p><History workspace={workspace} assetId={asset.id} /></section></>;
}

function downloadSource(run: Run) {
  const url = URL.createObjectURL(new Blob([canonicalSource(run.snapshot)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${run.id}-external-snapshot.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function RunPage({ workspace, run, busy, onRun }: { workspace: Workspace; run: Run; busy: boolean; onRun: (asset: Asset) => Promise<void> }) {
  const asset = workspace.assets.find((item) => item.id === run.assetId);
  return <><Link className="back" href={`/assets/${run.assetId}`}>← Back to asset</Link><Header title="Observation" eyebrow={run.snapshot.target}><p>Observed {date(run.snapshot.finished_at)}</p><p>What these public checks observed at the recorded time. This is not a complete security assessment.</p></Header><ResultSummary run={run} /><Changes current={run} previous={previousRun(workspace, run)} /><section className="section" id="all-observations"><h2>All observations</h2><ObservationList run={run} /></section>{asset && workspace.role === "owner" ? <RunControl asset={asset} latest={run} busy={busy} onRun={onRun} /> : null}<details className="method-panel"><summary>Method and source evidence</summary><div className="actions"><button className="button secondary" onClick={() => downloadSource(run)}>Download source JSON</button></div><dl className="facts"><div><dt>Source representation</dt><dd>ExternalSnapshotV1 · {run.snapshot.version}</dd></div><div><dt>Run ID</dt><dd>{run.id}</dd></div><div><dt>Source digest</dt><dd className="mono">{run.sourceDigest}</dd></div><div><dt>Started</dt><dd>{date(run.snapshot.started_at)}</dd></div><div><dt>Finished</dt><dd>{date(run.snapshot.finished_at)}</dd></div></dl><h3>Collection usage</h3><pre>{JSON.stringify(run.snapshot.usage, null, 2)}</pre><h3>Network attempt ledger</h3><p className="quiet">Operations and attempts, not independent proof of responses or source-system truth.</p><pre>{JSON.stringify(run.snapshot.network, null, 2)}</pre></details><p className="quiet boundary">{SNAPSHOT_BOUNDARY}</p></>;
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="detail-section"><h2>{title}</h2>{children}</section>;
}

function ObservationPage({ run, check }: { run: Run; check: ExternalCheckResultV1 }) {
  const facts = observationFacts(check);
  return <div className="detail-column"><Link className="back" href={`/runs/${run.id}`}>← Open this run</Link><div className="row-title"><p className="eyebrow">{check.target}</p><Status check={check} /></div><h1>{check.title}</h1><p className="support">Observed {date(check.finished_at)}</p><div className="detail-stack"><DetailSection title="What we observed">{facts.length ? <dl className="facts evidence-facts">{facts.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : <p>No summary fields are available. Open the raw source below for the exact recorded observation.</p>}<p className="quiet">Selected fields from this saved observation. Full recorded values remain in the source below.</p></DetailSection><DetailSection title="What this means"><p>{check.interpretation}</p>{check.status === "OBSERVED_EXPECTED" ? <p className="quiet">Clear applies to this check only. It does not establish that the hostname is secure.</p> : null}{check.status === "CHECK_ERROR" ? <p className="quiet">A collection error is Undetermined, not evidence of a vulnerability.</p> : null}</DetailSection><DetailSection title="What you can do next"><p>{nextAction(check)}</p></DetailSection><DetailSection title="What remains unknown"><ul>{check.limitations.map(limitation => <li key={limitation}>{limitation}</li>)}</ul></DetailSection></div><details className="method-panel"><summary>Method and provenance</summary><dl className="facts"><div><dt>Contract ID</dt><dd className="mono">{check.check_id}</dd></div><div><dt>Version</dt><dd className="mono">{check.check_version}</dd></div><div><dt>Method</dt><dd>{check.method}</dd></div><div><dt>Recorded status</dt><dd className="mono">{check.status}</dd></div><div><dt>Collection state</dt><dd>{check.collected ? "Collected" : "Not collected"}</dd></div><div><dt>Started</dt><dd>{date(check.started_at)}</dd></div><div><dt>Finished</dt><dd>{date(check.finished_at)}</dd></div><div><dt>Run source digest</dt><dd className="mono">{run.sourceDigest}</dd></div></dl><h3>Evidence references</h3><ul className="source-refs">{check.evidence.map(reference => <li key={reference}><code>{reference}</code></li>)}</ul>{!check.evidence.length ? <p>No evidence references were recorded.</p> : null}</details><details className="method-panel"><summary>Raw source observation</summary><pre>{JSON.stringify(check.observation, null, 2)}</pre></details><Link className="text-action" href={`/assets/${run.assetId}`}>Back to asset and run history →</Link></div>;
}

function ReportPage({ workspace, run }: { workspace: Workspace; run: Run }) {
  const previous = previousRun(workspace, run);
  const model = useMemo(() => savedRunReport(run, previous), [run, previous]);
  const { print, printRoot } = useBuyerReportPrint(model);
  return <>{printRoot}<div className="report-actions actions"><Link className="button secondary" href={`/runs/${run.id}`}>← Open observation</Link><button className="button" onClick={print}>Save report as PDF</button><button className="button secondary" onClick={() => downloadSource(run)}>Download source JSON</button></div><p className="quiet report-context">Saved workspace run · {date(run.snapshot.finished_at)}. This report uses the preserved source. Exporting does not run another observation.</p><BuyerReportDocument model={model} /><Link className="text-action" href={`/assets/${run.assetId}`}>Back to asset and run history →</Link></>;
}

function SignInLinks() {
  return <div className="actions">{["Continue with Google", "Continue with email"].map((label, index) => (
    // AuthKit starts a full document navigation, not a prefetched client route.
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    <a className={index ? "button secondary" : "button"} href="/login" key={label}>{label}</a>
  ))}</div>;
}

function Missing({ title = "Not found" }: { title?: string }) {
  return <div className="empty"><h1>{title}</h1><p>This item is not in the current workspace.</p><Link className="button secondary" href="/">Back to overview</Link></div>;
}

export function ProductApp() {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<WorkspaceState | null>(null);
  const workspace = state?.workspace ?? null;
  const [workspaceName, setWorkspaceName] = useState("");
  const [creationKey, setCreationKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/workspace", { credentials: "same-origin", cache: "no-store" }).then(async (response) => {
      if (response.status === 401) return null;
      if (!response.ok) throw new Error("The workspace could not be loaded.");
      return response.json() as Promise<WorkspaceState>;
    }).then((value) => { if (active) setState(value); }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "The workspace could not be loaded."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function perform(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : "This action could not complete. Try again."); } finally { setBusy(false); }
  }
  async function refresh() {
    setState(await request<WorkspaceState>("/api/workspace", "GET", undefined, workspace?.id));
  }
  async function onAdd(hostname: string) {
    await perform(async () => {
      const asset = await request<Asset>("/api/assets", "POST", { hostname, type: "hostname" }, workspace?.id);
      await refresh();
      router.push(`/assets/${asset.id}`);
    });
  }
  async function onRun(asset: Asset) {
    await perform(async () => {
      const run = await request<Run>("/api/runs", "POST", { assetId: asset.id, authorized: true }, workspace?.id);
      await refresh();
      router.push(`/runs/${run.id}`);
    });
  }
  const navigation = <nav aria-label="Workspace navigation">{nav.map((item, index) => <Link key={item.href} href={item.href} onClick={() => setNavOpen(false)} aria-current={(item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) ? "page" : undefined} className={index === 3 ? "nav-secondary" : undefined}><span aria-hidden="true">{item.glyph}</span>{item.label}</Link>)}</nav>;
  let content: ReactNode;
  const parts = pathname.split("/").filter(Boolean);
  if (!state) {
    content = <div className="welcome"><p className="eyebrow">WitnessOps · External Exposure</p><h1>Sign in to WitnessOps</h1><p>Add a hostname, run recommended checks, inspect the evidence, and see what changed when you return.</p>{loading ? <p role="status">Loading workspace…</p> : <><SignInLinks /><p className="quiet">Choose your sign-in method on the secure WorkOS sign-in screen.</p></>}</div>;
  } else if (!workspace) {
    content = state.workspaces.length ? <div className="welcome"><h1>Open workspace</h1><ul className="ledger">{state.workspaces.map(item => <li key={item.id}><button className="button secondary" onClick={() => void perform(async () => { setState(await request<WorkspaceState>("/api/workspace", "GET", undefined, item.id)); router.push("/"); })}>{item.name}</button></li>)}</ul></div> : <div className="welcome"><h1>Create workspace</h1><p>A name helps you organize assets. It does not verify company identity.</p><form className="asset-form" onSubmit={event => { event.preventDefault(); const key = creationKey || crypto.randomUUID(); setCreationKey(key); void perform(async () => { setState(await request<WorkspaceState>("/api/workspace", "POST", { name: workspaceName, requestId: key })); router.push("/"); }); }}><label htmlFor="workspace-name">Workspace name</label><input id="workspace-name" value={workspaceName} maxLength={100} required onChange={event => { setWorkspaceName(event.target.value); setCreationKey(""); }} /><button className="button" disabled={busy || !workspaceName.trim()}>Create workspace</button></form></div>;
  } else if (!parts.length) {
    content = <Overview workspace={workspace} />;
  } else if (parts[0] === "assets" && parts.length === 1) {
    content = <><Header title="Assets" action={workspace.role === "owner" ? <Link className="button" href="/assets/new">Add asset</Link> : undefined}><p>Add what you want WitnessOps to observe. Adding an asset does not prove ownership.</p></Header><AssetList workspace={workspace} /></>;
  } else if (pathname === "/assets/new") {
    content = workspace.role === "owner" ? <AddAsset busy={busy} onAdd={onAdd} /> : <Missing title="Owner access required" />;
  } else if (parts[0] === "assets" && parts.length === 2) {
    const asset = workspace.assets.find((item) => item.id === parts[1]);
    content = asset ? <AssetPage key={asset.id} workspace={workspace} asset={asset} busy={busy} onRun={onRun} /> : <Missing title="Asset not found" />;
  } else if (parts[0] === "runs" && parts.length === 2) {
    const run = workspace.runs.find((item) => item.id === parts[1]);
    content = run ? <RunPage key={run.id} workspace={workspace} run={run} busy={busy} onRun={onRun} /> : <Missing title="Run not found" />;
  } else if (parts[0] === "runs" && parts[2] === "observations" && parts.length === 4) {
    const run = workspace.runs.find((item) => item.id === parts[1]);
    const check = run?.snapshot.checks.find((item) => item.check_id === parts[3]);
    content = run && check ? <ObservationPage run={run} check={check} /> : <Missing title="Observation not found" />;
  } else if (pathname === "/reports") {
    content = <><Header title="Reports"><p>A report is a readable snapshot of one observation. It is not a security score.</p></Header><History workspace={workspace} report /></>;
  } else if (parts[0] === "reports" && parts.length === 2) {
    const run = workspace.runs.find((item) => item.id === parts[1]);
    content = run ? <ReportPage workspace={workspace} run={run} /> : <Missing title="Report not found" />;
  } else if (pathname === "/members") {
    content = <><Header title="Members"><p>Access is explicit. An email domain or workspace name does not establish membership.</p></Header>{workspace.members.map(member => <div className="member-row" key={member.id}><div><strong>{member.displayName || "Workspace member"}</strong></div><span className="status">{member.role === "owner" ? "Owner" : "Viewer"}</span></div>)}<p className="boundary">Invitations are not available yet. No invitation will be sent.</p></>;
  } else if (pathname === "/settings") {
    content = <><Header title="Settings"><p>The workspace retains your assets and observations across sign-ins.</p></Header><dl className="facts settings-facts"><div><dt>Workspace</dt><dd>{workspace.name}</dd></div><div><dt>Your role</dt><dd>{workspace.role === "owner" ? "Owner" : "Viewer"}</dd></div><div><dt>Authentication</dt><dd>WorkOS AuthKit. Workspace access is managed by WitnessOps.</dd></div><div><dt>Persistence</dt><dd>PostgreSQL. Completed source snapshots remain unchanged when you run again.</dd></div><div><dt>Collection</dt><dd>Manual, explicitly authorized hostname observations. No schedules.</dd></div></dl><RecommendedChecks /><div className="clear-session"><h2>Sign out</h2><p>Signing out ends your app session. Your workspace, assets and runs remain saved.</p><form action={logout}><button className="button secondary">Sign out</button></form></div></>;
  } else {
    content = <Missing />;
  }
  return <div className="product-app"><a className="skip-link" href="#main-content">Skip to content</a><aside className="desktop-sidebar"><Link className="wordmark" href="/" aria-label="WitnessOps overview"><WitnessOpsMark size="sm" decorative /> WitnessOps</Link>{navigation}<p className="sidebar-footer">External Exposure<br /><span>Workspace</span></p></aside><div className="app-body"><header className="app-header"><button className="menu-toggle" aria-expanded={navOpen} aria-controls="mobile-navigation" onClick={() => setNavOpen(!navOpen)} aria-label={navOpen ? "Close navigation" : "Open navigation"}>☰</button><span className="workspace-name">{workspace?.name || "WitnessOps"}</span>{state && state.workspaces.length > 1 ? <select aria-label="Active workspace" value={workspace?.id || ""} onChange={event => void perform(async () => { setState(await request<WorkspaceState>("/api/workspace", "GET", undefined, event.target.value)); router.push("/"); })}><option value="" disabled>Select workspace</option>{state.workspaces.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select> : null}<span className="account">{state?.user.displayName || "WitnessOps"}</span></header>{navOpen ? <div className="mobile-navigation" id="mobile-navigation">{navigation}</div> : null}<main id="main-content" className="main-content">{error ? <div className="error" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss error">×</button></div> : null}{busy && workspace ? <p className="pending" role="status">Completing your request…</p> : null}{content}</main></div></div>;
}
