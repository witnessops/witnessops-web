"use client";

import Link from "next/link";
import { logout } from "../app/actions/logout";
import { canonicalSource } from "../lib/source-digest";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
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
  if (!run) return "Not observed";
  const count = run.snapshot.checks.filter((check) => check.status === "NEEDS_ATTENTION").length;
  return count ? `${count} ${count === 1 ? "observation needs" : "observations need"} attention` : "No attention flags in this snapshot";
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
  if (change.baseline) return <div className="change-panel"><h2>First observation</h2><p>This run is the baseline for later comparisons. No change is established yet.</p></div>;
  return <section className="change-panel"><h2>What changed</h2><div className="change-columns"><div><h3>Environment</h3>{change.environment.length ? <ul>{change.environment.map((line) => <li key={line}>{line}</li>)}</ul> : <p>No change in comparable target observations.</p>}</div><div><h3>Coverage</h3>{change.coverage.length ? <ul>{change.coverage.map((line) => <li key={line}>{line}</li>)}</ul> : <p>The check set and method are unchanged.</p>}</div></div>{change.uncertainty.length ? <div className="uncertainty"><h3>Not comparable</h3><ul>{change.uncertainty.map((line) => <li key={line}>{line}</li>)}</ul><p>Collection uncertainty is not a new security finding.</p></div> : null}</section>;
}

function RecommendedChecks({ run }: { run?: Run }) {
  return <details className="method-panel"><summary>Edit checks <span>Recommended hostname checks</span></summary><p>This foundation uses the fixed ten-check hostname bundle. Individual check selection is not available yet; opening this panel does not run a check.</p><ul className="check-list">{CHECK_IDS.map((id) => <li key={id}><span aria-hidden="true">✓</span><div>{CHECK_LABELS[id]}<code>{id}</code>{run?.snapshot.checks.find((check) => check.check_id === id)?.method ? <p>{run.snapshot.checks.find((check) => check.check_id === id)?.method}</p> : null}</div></li>)}</ul><p className="quiet">Public hostname observations only. No credentials, exploitation, arbitrary ports, or OFFSEC executor. Runs happen only when you choose Observe or Run again.</p></details>;
}

function RunControl({ asset, latest, busy, onRun }: { asset: Asset; latest?: Run; busy: boolean; onRun: (asset: Asset) => Promise<void> }) {
  const [authorized, setAuthorized] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!authorized || busy) return;
    setAuthorized(false);
    await onRun(asset);
  }
  return <form className="run-control" onSubmit={submit}><p><strong>{latest ? "Observe again" : "Ready to observe"}</strong><span>Ten bounded public checks against <span className="mono">{asset.hostname}</span>. No scheduled collection.</span></p><label className="authorization"><input type="checkbox" checked={authorized} onChange={(event) => setAuthorized(event.target.checked)} disabled={busy} /><span>I own this hostname or am authorized to check it.</span></label><button className="button" disabled={!authorized || busy}>{busy ? "Observing…" : latest ? "Run again" : "Observe"}</button></form>;
}

function ObservationList({ run }: { run: Run }) {
  return <ul className="ledger observations">{run.snapshot.checks.map((check) => <li key={check.check_id}><Link href={`/runs/${run.id}/observations/${check.check_id}`} className="observation-row"><div className="row-content"><div className="row-title"><strong>{check.title}</strong><Status check={check} /></div><p>{check.interpretation}</p><span className="quiet mono">{check.check_id}</span></div><span className="row-chevron" aria-hidden="true">→</span></Link></li>)}</ul>;
}

function History({ workspace, assetId, report = false }: { workspace: Workspace; assetId?: string; report?: boolean }) {
  const runs = orderedRuns(workspace, assetId);
  if (!runs.length) return <div className="empty"><h2>No {report ? "reports" : "observations"} yet.</h2><p>Observe a hostname to retain its first saved snapshot.</p>{workspace.role === "owner" ? <Link className="button secondary" href="/assets/new">Add asset</Link> : null}</div>;
  return <ul className="ledger">{runs.map((run) => <li key={run.id}><Link className="ledger-row" href={`/${report ? "reports" : "runs"}/${run.id}`}><div><strong className="mono">{run.snapshot.target}</strong><span>{date(run.snapshot.finished_at)}</span><span className="quiet">{run.snapshot.checks.length} checks · {run.profile.version}</span></div><span className="attention-label">{attention(run)}</span></Link></li>)}</ul>;
}

function AssetList({ workspace }: { workspace: Workspace }) {
  if (!workspace.assets.length) return <div className="empty"><h2>Your first asset starts here.</h2><p>Add a public hostname. Recommended checks are already selected; nothing runs until you authorize the observation.</p>{workspace.role === "owner" ? <Link className="button" href="/assets/new">Add asset</Link> : null}</div>;
  return <ul className="ledger">{workspace.assets.map((asset) => {
    const latest = orderedRuns(workspace, asset.id)[0];
    return <li key={asset.id}><Link className="ledger-row" href={`/assets/${asset.id}`}><div><strong className="mono">{asset.hostname}</strong><span>{latest ? `Last observed ${date(latest.snapshot.finished_at)}` : "Ready for its first observation"}</span></div><span className="attention-label">{attention(latest)} <span aria-hidden="true">→</span></span></Link></li>;
  })}</ul>;
}

function Overview({ workspace }: { workspace: Workspace }) {
  const latest = workspace.assets.map((asset) => orderedRuns(workspace, asset.id)[0]).filter((run): run is Run => Boolean(run));
  const needsAttention = latest.filter((run) => run.snapshot.checks.some((check) => check.status === "NEEDS_ATTENTION")).length;
  const comparisons = latest.map((run) => compareRuns(run, previousRun(workspace, run)));
  return <><Header title={workspace.name} action={workspace.role === "owner" ? <Link className="button" href="/assets/new">Add asset</Link> : undefined}><p>Keep track of what the outside world can observe.</p></Header><dl className="overview-stats"><div><dt>Assets</dt><dd>{workspace.assets.length}</dd></div><div><dt>Need attention</dt><dd>{needsAttention || "None"}</dd></div><div><dt>Environment changes</dt><dd>{comparisons.filter((change) => change.environment.length).length} assets</dd></div><div><dt>Coverage changes</dt><dd>{comparisons.filter((change) => change.coverage.length).length} assets</dd></div></dl><section className="section"><div className="section-heading"><h2>Your assets</h2><Link href="/assets">View all assets →</Link></div><AssetList workspace={workspace} /></section><p className="quiet">Each run records one hostname at one point in time. A clear observation does not mean the asset is safe or free of vulnerabilities.</p></>;
}

function AddAsset({ busy, onAdd }: { busy: boolean; onAdd: (hostname: string) => Promise<void> }) {
  const [hostname, setHostname] = useState("");
  return <div className="narrow"><Header title="Add asset"><p>Add what you want WitnessOps to observe. Recommended checks are already selected.</p></Header><form className="asset-form" onSubmit={(event) => { event.preventDefault(); if (hostname.trim() && !busy) void onAdd(hostname); }}><label htmlFor="asset-hostname">Public hostname</label><input id="asset-hostname" value={hostname} onChange={(event) => setHostname(event.target.value)} placeholder="example.com" autoCapitalize="none" autoCorrect="off" spellCheck={false} required maxLength={253} disabled={busy} /><p className="quiet">One hostname, without a URL path or port. Adding an asset does not prove ownership and does not start collection.</p><div className="recommended"><span className="eyebrow">Recommended checks</span><h2>Hostname External Exposure</h2><p>The ten existing bounded public observations: DNS, TLS, web and mail publication.</p></div><RecommendedChecks /><div className="actions"><button className="button" disabled={busy || !hostname.trim()}>{busy ? "Adding…" : "Add asset"}</button><Link className="button secondary" href="/assets">Cancel</Link></div></form><p className="quiet boundary">Public Services and selected-port scanning are not available in this foundation.</p></div>;
}

function AssetPage({ workspace, asset, busy, onRun }: { workspace: Workspace; asset: Asset; busy: boolean; onRun: (asset: Asset) => Promise<void> }) {
  const latest = orderedRuns(workspace, asset.id)[0];
  return <><Link className="back" href="/assets">← Assets</Link><Header title={asset.hostname} eyebrow="Hostname"><p>{latest ? `Last observed ${date(latest.snapshot.finished_at)}` : "Not yet observed"}</p></Header>{workspace.role === "owner" ? <RunControl asset={asset} latest={latest} busy={busy} onRun={onRun} /> : <p className="quiet">Viewer access · Only an Owner can start an observation.</p>}<RecommendedChecks run={latest} />{latest ? <><Changes current={latest} previous={previousRun(workspace, latest)} /><section className="section"><div className="section-heading"><h2>Current observations</h2><Link href={`/runs/${latest.id}`}>Open latest results →</Link></div><Counts run={latest} /><ObservationList run={latest} /></section></> : null}<section className="section"><h2>Run history</h2><p className="quiet">Previous source snapshots remain intact when you run again.</p><History workspace={workspace} assetId={asset.id} /></section></>;
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
  return <><Link className="back" href={`/assets/${run.assetId}`}>← Back to asset</Link><Header title="Observation" eyebrow={run.snapshot.target}><p>{date(run.snapshot.finished_at)} · {run.profile.version}</p><p>What these public checks observed at the recorded time. This is not a complete security assessment.</p></Header><div className="summary-panel"><Counts run={run} /><div className="actions"><Link className="button secondary" href={`/reports/${run.id}`}>View report</Link><button className="button secondary" onClick={() => downloadSource(run)}>Download source JSON</button></div><p className="quiet">Collected {run.snapshot.checks.filter((check) => check.collected).length}/{run.snapshot.checks.length} observations.</p></div><Changes current={run} previous={previousRun(workspace, run)} /><section className="section"><h2>Observations</h2><ObservationList run={run} /></section>{asset && workspace.role === "owner" ? <RunControl asset={asset} latest={run} busy={busy} onRun={onRun} /> : null}<details className="method-panel"><summary>Run provenance</summary><dl className="facts"><div><dt>Source representation</dt><dd>ExternalSnapshotV1 · {run.snapshot.version}</dd></div><div><dt>Run ID</dt><dd>{run.id}</dd></div><div><dt>Source digest</dt><dd className="mono">{run.sourceDigest}</dd></div><div><dt>Started</dt><dd>{date(run.snapshot.started_at)}</dd></div><div><dt>Finished</dt><dd>{date(run.snapshot.finished_at)}</dd></div></dl><h3>Collection usage</h3><pre>{JSON.stringify(run.snapshot.usage, null, 2)}</pre><h3>Network attempt ledger</h3><p className="quiet">Operations and attempts, not independent proof of responses or source-system truth.</p><pre>{JSON.stringify(run.snapshot.network, null, 2)}</pre></details><p className="quiet boundary">{SNAPSHOT_BOUNDARY}</p></>;
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="detail-section"><h2>{title}</h2>{children}</section>;
}

function ObservationPage({ run, check }: { run: Run; check: ExternalCheckResultV1 }) {
  return <div className="detail-column"><Link className="back" href={`/runs/${run.id}`}>← Open this run</Link><div className="row-title"><p className="eyebrow">{check.target}</p><Status check={check} /></div><h1>{check.title}</h1><p className="support">Recorded {date(check.finished_at)}</p><div className="detail-stack"><DetailSection title="What we checked"><p>{check.method}</p></DetailSection><DetailSection title="What we observed"><pre>{JSON.stringify(check.observation, null, 2)}</pre></DetailSection><DetailSection title="Evidence references"><ul className="source-refs">{check.evidence.map((reference) => <li key={reference}><code>{reference}</code></li>)}</ul>{!check.evidence.length ? <p>No evidence references were recorded.</p> : null}</DetailSection><DetailSection title="Interpretation"><p>{check.interpretation}</p></DetailSection><DetailSection title="What remains unknown"><ul>{check.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></DetailSection>{check.recommendation ? <DetailSection title="Recorded follow-up"><p>{check.recommendation}</p></DetailSection> : null}<DetailSection title="How this was produced"><dl className="facts"><div><dt>Contract ID</dt><dd className="mono">{check.check_id}</dd></div><div><dt>Version</dt><dd className="mono">{check.check_version}</dd></div><div><dt>Method</dt><dd>{check.method}</dd></div><div><dt>Recorded status</dt><dd className="mono">{check.status}</dd></div><div><dt>Collection state</dt><dd>{check.collected ? "Collected" : "Not collected"}</dd></div><div><dt>Started</dt><dd>{date(check.started_at)}</dd></div><div><dt>Finished</dt><dd>{date(check.finished_at)}</dd></div><div><dt>Run source digest</dt><dd className="mono">{run.sourceDigest}</dd></div></dl>{check.status === "CHECK_ERROR" ? <p className="quiet">A collection error is not evidence of a vulnerability.</p> : null}</DetailSection></div></div>;
}

function ReportPage({ workspace, run }: { workspace: Workspace; run: Run }) {
  return <><div className="actions report-actions"><Link className="button secondary" href={`/runs/${run.id}`}>← Open observation</Link><button className="button secondary" onClick={() => downloadSource(run)}>Download source JSON</button></div><article className="report-paper"><p className="eyebrow">WitnessOps · External Exposure</p><h1>{run.snapshot.target}</h1><p>Recorded {date(run.snapshot.finished_at)}</p><p className="quiet">A readable snapshot of one observation. It is not a security score.</p><Counts run={run} /><Changes current={run} previous={previousRun(workspace, run)} /><section className="section"><h2>All observations</h2><ul className="report-observations">{run.snapshot.checks.map((check) => <li key={check.check_id}><div className="row-title"><h3>{check.title}</h3><Status check={check} /></div><p>{check.interpretation}</p><Link href={`/runs/${run.id}/observations/${check.check_id}`}>Inspect evidence →</Link></li>)}</ul></section><section className="section"><h2>Limits</h2><p>{SNAPSHOT_BOUNDARY}</p></section><section className="section source-identity"><h2>Source</h2><p className="mono">ExternalSnapshotV1 · {run.snapshot.version}</p><p className="mono">{run.sourceDigest}</p><p className="quiet">This report projects the original source snapshot without changing its observations.</p></section></article></>;
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
  return <div className="product-app"><a className="skip-link" href="#main-content">Skip to content</a><aside className="desktop-sidebar"><Link className="wordmark" href="/" aria-label="WitnessOps overview"><span aria-hidden="true">◉</span> WitnessOps</Link>{navigation}<p className="sidebar-footer">External Exposure<br /><span>Workspace</span></p></aside><div className="app-body"><header className="app-header"><button className="menu-toggle" aria-expanded={navOpen} aria-controls="mobile-navigation" onClick={() => setNavOpen(!navOpen)} aria-label={navOpen ? "Close navigation" : "Open navigation"}>☰</button><span className="workspace-name">{workspace?.name || "WitnessOps"}</span>{state && state.workspaces.length > 1 ? <select aria-label="Active workspace" value={workspace?.id || ""} onChange={event => void perform(async () => { setState(await request<WorkspaceState>("/api/workspace", "GET", undefined, event.target.value)); router.push("/"); })}><option value="" disabled>Select workspace</option>{state.workspaces.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select> : null}<span className="account">{state?.user.displayName || "WitnessOps"}</span></header>{navOpen ? <div className="mobile-navigation" id="mobile-navigation">{navigation}</div> : null}<main id="main-content" className="main-content">{error ? <div className="error" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss error">×</button></div> : null}{busy && workspace ? <p className="pending" role="status">Completing your request…</p> : null}{content}</main></div></div>;
}
