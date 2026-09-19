"use client";
import { hasWorkspaceCapability } from "../lib/workspace-role-policy";

import Link from "next/link";
import { reportFollowThrough } from "./report-follow-through";
import { Billing } from "./billing";
import { ReportShare } from "./report-share";
import { Members } from "./members";
import { CheckChoices } from "./check-choice";
import { CHECK_DISCOVERY } from "../lib/check-discovery";
import { LinuxAsset, LinuxCheckPage, LinuxHistory } from "./linux-check";
import { AccessGate, ComparisonViewed, DeeperReview, ProductActivity, RunFeedback, useProductActivity } from "./early-access";
import { EARLY_ACCESS_DATA_NOTE, type WorkspaceAccessState } from "../lib/early-access";
import { publicContactMailto } from "../../../witnessops-web/src/lib/public-contact";
import { WitnessOpsMark } from "@witnessops/ui/witnessops-mark";
import { BuyerReportDocument } from "../../../witnessops-web/src/components/proofpack/buyer-report";
import { useBuyerReportPrint } from "../../../witnessops-web/src/components/proofpack/buyer-report-print";
import { savedRunReport } from "../lib/report-model";
import { AppHelp } from "./app-help";
import { helpPage } from "../lib/help-context";
import { logout } from "../app/actions/logout";
import { canonicalSource } from "../lib/source-digest";
import { nextAction, observationFacts, observationSummary } from "../lib/observation-presentation";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useRef, type FormEvent, type ReactNode } from "react";
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
  { href: "/", label: "Overview" },
  { href: "/assets", label: "Assets" },
  { href: "/reports", label: "Reports" },
  { href: "/members", label: "Members" },
  { href: "/settings", label: "Settings" },
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
    throw Object.assign(new Error(message || `Request could not complete (${response.status}).`), { status: response.status }, payload?.code === "EARLY_ACCESS_REQUIRED" ? { accessState: payload.accessState } : {});
  }
  return payload as T;
}

function date(value: string) {
  return `${new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC`;
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

function Header({ title, children, eyebrow = "WitnessOps", action, headingLevel = 1, titleIsIdentifier = false, eyebrowIsIdentifier = false }: { title: string; children?: ReactNode; eyebrow?: string; action?: ReactNode; headingLevel?: 1 | 2; titleIsIdentifier?: boolean; eyebrowIsIdentifier?: boolean }) {
  const eyebrowClass = eyebrowIsIdentifier ? "eyebrow identifier" : "eyebrow";
  const titleClass = titleIsIdentifier ? "identifier" : undefined;
  return <div className="page-heading"><div><p className={eyebrowClass}>{eyebrow}</p>{headingLevel === 2 ? <h2 className={titleClass}>{title}</h2> : <h1 className={titleClass}>{title}</h1>}{children ? <div className="support">{children}</div> : null}</div>{action}</div>;
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

function Changes({ current, previous, workspace }: { current: Run; previous?: Run; workspace: Workspace }) {
  const change = compareRuns(current, previous);
  if (change.baseline) return <><section className="change-panel baseline-panel"><p className="eyebrow">Comparison</p><h2>First observation</h2><p>This is your baseline. Run again later to see what changed. Previous evidence stays intact.</p></section><RunFeedback workspace={workspace} run={current} /></>;
  const groups = [
    { title: "Environment", items: change.environment, empty: "No change in comparable target observations." },
    { title: "Coverage", items: change.coverage, empty: "The check set and method are unchanged." },
    { title: "Not comparable", items: change.uncertainty, empty: "No collection-comparability limits were recorded between these runs." },
  ];
  return <ComparisonViewed run={current}>
    <section className="change-panel">
      <div className="section-heading"><h2>What changed</h2><Link href={`/runs/${previous!.id}`}>Open previous observation →</Link></div>
      <p className="comparison-time">Compared with {date(previous!.snapshot.finished_at)}.</p>
      <div className="change-columns">{groups.map(group => <div key={group.title}>
        <h3>{group.title} <span className="change-count">{group.items.length}</span></h3>
        {group.items.length ? <ul>{group.items.map(line => <li key={line}>{line}</li>)}</ul> : <p>{group.empty}</p>}
      </div>)}</div>
      {change.uncertainty.length ? <p className="comparison-note">Collection uncertainty is not a new security finding.</p> : null}
      <p className="comparison-note">Environment means the observed hostname state; Coverage means what or how we checked. A coverage update does not rewrite earlier evidence.</p>
    </section>
    <RunFeedback workspace={workspace} run={current} comparison />
  </ComparisonViewed>;
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
  return <form className="run-control" id="run-observation" onSubmit={submit}><p><strong>{latest ? "Observe again when you want a fresh comparison" : "Run your first observation"}</strong><span>Ten bounded public checks against <span className="mono">{asset.hostname}</span>. {latest ? "Run again after a change or before a customer security review. Previous evidence stays intact. No scheduled collection." : "This starts collection only after you authorize and choose Run observation."}</span></p><label className="authorization"><input type="checkbox" checked={authorized} onChange={event => setAuthorized(event.target.checked)} disabled={busy} /><span>I own this hostname or am authorized to check it.</span></label><button className="button" disabled={!authorized || busy}>{busy ? "Observing…" : latest ? "Run again" : "Run observation"}</button></form>;
}

function ObservationList({ run }: { run: Run }) {
  return <ul className="ledger observations">{run.snapshot.checks.map(check => <li key={check.check_id}><Link href={`/runs/${run.id}/observations/${check.check_id}`} className="observation-row"><div className="row-content"><div className="row-title"><strong>{check.title}</strong><Status check={check} /></div><p className="observed-summary"><span>Observed</span> {observationSummary(check)}</p><p>{check.interpretation}</p>{check.status !== "OBSERVED_EXPECTED" && check.limitations[0] ? <p className="observation-limit">Limit: {check.limitations[0]}</p> : null}<span className="evidence-link">Inspect evidence →</span></div></Link></li>)}</ul>;
}

function ResultSummary({ run }: { run: Run }) {
  const attentionChecks = run.snapshot.checks.filter(check => check.status === "NEEDS_ATTENTION");
  const unknown = run.snapshot.checks.filter(check => !check.collected || ["UNDETERMINED", "CHECK_ERROR"].includes(check.status));
  const informational = run.snapshot.checks.filter(check => check.status === "INFORMATIONAL");
  return <section className="summary-panel" aria-label="Observation summary"><h2>Recorded result</h2><Counts run={run} />{unknown.length ? <p className="quiet">{run.snapshot.checks.length - unknown.length} observations have a determined outcome. {unknown.length} remain Undetermined; retained evidence and limits are below.</p> : null}<div className="next-step"><h3>What needs attention?</h3>{attentionChecks.length ? <><p>Review these recorded observations before deciding what to change.</p><ul>{attentionChecks.map(check => <li key={check.check_id}><Link href={`/runs/${run.id}/observations/${check.check_id}`}>{check.title} →</Link></li>)}</ul></> : <p>No attention flags in this snapshot. This does not establish that the hostname is secure.</p>}{unknown.length ? <div className="unresolved"><h3>{unknown.length} {unknown.length === 1 ? "check is" : "checks are"} Undetermined</h3><p>The recorded result does not establish an outcome for these checks. Inspect the collection limits before rerunning.</p><ul>{unknown.map(check => <li key={check.check_id}><Link href={`/runs/${run.id}/observations/${check.check_id}`}>{check.title} →</Link></li>)}</ul></div> : null}{!attentionChecks.length && !unknown.length ? <p>{informational.length ? `${informational.length} informational observations provide context, not attention flags. ` : ""}Keep this baseline and run again later to compare.</p> : null}</div><div className="actions"><Link className="button secondary" href={`/reports/${run.id}`}>View report</Link><a className="text-action" href="#all-observations">Inspect all {run.snapshot.checks.length} observations ↓</a></div></section>;
}

function History({ workspace, assetId, report = false }: { workspace: Workspace; assetId?: string; report?: boolean }) {
  const runs = orderedRuns(workspace, assetId);
  if (!runs.length) return <div className="empty compact"><h2>No {report ? "reports" : "observations"} yet.</h2><p>{assetId ? "Create your first public baseline using the recommended check above. Nothing has been collected yet." : "Open an asset and run its recommended checks to save an observation."}</p>{!assetId ? <Link className="button secondary" href="/assets">View assets</Link> : null}</div>;
  return <ul className="ledger history">{runs.map(run => <li key={run.id}><Link className="ledger-row" href={`/${report ? "reports" : "runs"}/${run.id}`}><div><strong className="mono">{run.snapshot.target}</strong><span>{date(run.snapshot.finished_at)}</span><span className="quiet">{run.snapshot.checks.length} recorded checks</span></div><span className="attention-label">{attention(run)}</span></Link></li>)}</ul>;
}

function AssetList({ workspace }: { workspace: Workspace }) {
  if (!workspace.assets.length) return <CheckChoices owner={hasWorkspaceCapability(workspace.role, "assets:create")} />;
  const rows = workspace.assets.map(asset => {
    const latest = orderedRuns(workspace, asset.id)[0];
    const changes = latest ? compareRuns(latest, previousRun(workspace, latest)) : undefined;
    const priority = latest?.snapshot.checks.some(check => check.status === "NEEDS_ATTENTION") ? 0 : latest?.snapshot.checks.some(check => !check.collected || ["UNDETERMINED", "CHECK_ERROR"].includes(check.status)) ? 1 : !latest ? 2 : changes?.environment.length ? 3 : 4;
    return { asset, latest, changes, priority };
  }).sort((a, b) => a.priority - b.priority);
  return <div className="asset-table">
    <div className="asset-table-head" aria-hidden="true"><span>Asset</span><span>Latest observation</span><span>Result</span><span>Comparison</span><span /></div>
    <ul className="ledger asset-ledger">{rows.map(({ asset, latest, changes }) => <li key={asset.id}>
      <Link className="ledger-row asset-table-row" href={`/assets/${asset.id}`}>
        <div className="asset-identity"><strong className="identifier">{asset.hostname}</strong><span>{asset.type === "linux_server" ? "One Server Security Check" : "External Exposure Check"}</span></div>
        <div className="asset-observed"><span className="sr-only">Latest observation: </span>{asset.type === "linux_server" ? "Import existing source" : latest ? <time dateTime={latest.snapshot.finished_at}>{date(latest.snapshot.finished_at)}</time> : "Ready for its first observation"}</div>
        <div className="asset-result">{asset.type === "linux_server" ? `${(workspace.linuxRuns ?? []).filter(run => run.assetId === asset.id).length} saved checks` : attention(latest)}</div>
        <div className="asset-comparison">{asset.type === "linux_server" ? "Open saved server checks" : changes && !changes.baseline ? <>{changes.environment.length} Environment · {changes.coverage.length} Coverage changes{changes.uncertainty.length ? ` · ${changes.uncertainty.length} not comparable` : ""}</> : latest ? "First observation · baseline" : "No baseline yet"}</div>
        <span className="row-chevron" aria-hidden="true">→</span>
      </Link>
    </li>)}</ul>
  </div>;
}

function Overview({ workspace }: { workspace: Workspace }) {
  const exposureAssets = workspace.assets.filter(asset => asset.type !== "linux_server");
  const latest = exposureAssets.map(asset => orderedRuns(workspace, asset.id)[0]).filter((run): run is Run => Boolean(run));
  const needsAttention = latest.filter(run => run.snapshot.checks.some(check => check.status === "NEEDS_ATTENTION")).length;
  const unresolved = latest.filter(run => run.snapshot.checks.some(check => !check.collected || ["CHECK_ERROR", "UNDETERMINED"].includes(check.status))).length;
  const comparisons = latest.map(run => compareRuns(run, previousRun(workspace, run)));
  return <>
    <Header title={workspace.name} eyebrow="Your evidence workspace" action={workspace.assets.length && hasWorkspaceCapability(workspace.role, "assets:create") ? <Link className="button" href="/assets/new">Add asset</Link> : undefined}>
      <p>Choose a public hostname check or a local Linux server check. Keep evidence and reports, then compare later checks.</p>
    </Header>
    {workspace.assets.length ? <>
      <dl className="overview-stats">
        <div><dt>External Exposure assets</dt><dd>{exposureAssets.length}<span className="stat-caption">{latest.length} with saved observations</span></dd></div>
        <div><dt>External Exposure needing attention</dt><dd>{needsAttention || "None"}<span className="stat-caption">From each asset’s latest observation</span></dd></div>
        <div><dt>External Exposure environment changes</dt><dd>{comparisons.filter(change => change.environment.length).length} assets<span className="stat-caption">Recorded hostname state</span></dd></div>
        <div><dt>External Exposure coverage changes</dt><dd>{comparisons.filter(change => change.coverage.length).length} assets<span className="stat-caption">Check set or method</span></dd></div>
      </dl>
      {unresolved || latest.length < exposureAssets.length ? <p className="overview-note">{unresolved ? `${unresolved} ${unresolved === 1 ? "asset has" : "assets have"} undetermined checks. ` : ""}{latest.length < exposureAssets.length ? `${exposureAssets.length - latest.length} ${exposureAssets.length - latest.length === 1 ? "asset has" : "assets have"} not been observed yet.` : ""}</p> : null}
      <section className="section"><div className="section-heading"><h2>Your assets</h2><Link href="/assets">View all assets →</Link></div><AssetList workspace={workspace} /></section>
    </> : <AssetList workspace={workspace} />}
    <p className="quiet boundary">Each run records one hostname at one point in time. A clear observation does not mean the asset is safe or free of vulnerabilities.</p>
    {workspace.assets.length ? <section className="start-points" aria-labelledby="next-check-heading">
      <h2 id="next-check-heading">When to check again</h2>
      <div>{[
        ["Before launch", "Keep a baseline of the public hostname before a release."],
        ["After a change", "Compare the next observation with the evidence you already saved."],
        ["Before a review", "Open the recorded evidence and export a report for the conversation."],
      ].map(([title, copy]) => <Link href={title === "Before a review" ? "/reports" : "/assets"} key={title}><h3>{title} <span aria-hidden="true">↗</span></h3><p>{copy}</p></Link>)}</div>
    </section> : null}
  </>;
}

function AddAsset({ busy, onAdd }: { busy: boolean; onAdd: (hostname: string, type: Asset["type"]) => Promise<void> }) {
  const search = useSearchParams();
  const [type, setType] = useState<keyof typeof CHECK_DISCOVERY>(search.get("check") === "linux_server" ? "linux_server" : "hostname");
  const [hostname, setHostname] = useState("");
  const hostnameInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (["hostname", "linux_server"].includes(search.get("check") ?? "")) hostnameInput.current?.focus(); }, [search]);
  return <div className="discovery-create"><CheckChoices selected={type} onSelect={next => { setType(next); hostnameInput.current?.focus(); }} disabled={busy} /><div className="narrow section"><Header headingLevel={2} title={type === "linux_server" ? "Add a Linux server" : "Add asset"} eyebrow={type === "linux_server" ? "One Server Security Check" : "External Exposure"}><p>{type === "linux_server" ? "Record the server hostname in WitnessOps. The server check is imported from a signed Local Audit Proofpack; adding an asset does not run a network scan." : "Start with a public domain or hostname you are authorized to observe. Each asset covers one hostname, not all of its subdomains."}</p></Header><form className="asset-form" onSubmit={event => { event.preventDefault(); if (hostname.trim() && !busy) void onAdd(hostname, type); }}><label htmlFor="asset-hostname">{type === "linux_server" ? "Recorded Linux hostname" : "Public hostname"}</label><input ref={hostnameInput} id="asset-hostname" value={hostname} onChange={event => setHostname(event.target.value)} placeholder={type === "linux_server" ? "ip-172-26-9-158" : "example.com"} autoCapitalize="none" autoCorrect="off" spellCheck={false} required maxLength={253} disabled={busy} /><p className="quiet">{type === "linux_server" ? "Use the exact hostname recorded in your Local Audit package, for example ip-172-26-9-158 or witnessops-n8n-01. Adding an asset does not prove ownership." : "For example, example.com or app.example.com. No URL path, port or IP address. Adding an asset does not prove ownership."}</p>{type === "linux_server" ? <p>Import the Local Audit 1.2.2 ZIP and matching signature on the asset page. WitnessOps does not connect to this server.</p> : <RecommendedChecks expanded />}<p className="add-boundary">{type === "linux_server" ? "Adding saves the hostname only. Next, import your server check." : "Adding saves the hostname only. You will authorize collection separately on the asset page."}</p><div className="actions"><button className="button" disabled={busy || !hostname.trim()}>{busy ? "Adding…" : "Add without scanning"}</button><Link className="button secondary" href="/assets">Cancel</Link></div></form></div></div>;
}

function AssetPage({ workspace, asset, busy, onRun }: { workspace: Workspace; asset: Asset; busy: boolean; onRun: (asset: Asset) => Promise<void> }) {
  const latest = orderedRuns(workspace, asset.id)[0];
  return <><Link className="back" href="/assets">← Assets</Link><Header title={asset.hostname} titleIsIdentifier eyebrow="Hostname" action={hasWorkspaceCapability(workspace.role, "assets:create") ? <a className="button secondary" href="#run-observation">{latest ? "Run again ↓" : "Run observation ↓"}</a> : undefined}><p>Recommended check: {CHECK_DISCOVERY.hostname.name}</p><p>{latest ? `Last observed ${date(latest.snapshot.finished_at)}` : "Create your first public baseline. We will make ten bounded public observations after you authorize the run. You get results, unknowns, evidence and a report; run again later to compare."}</p></Header>{latest ? <><ResultSummary run={latest} /><Changes workspace={workspace} current={latest} previous={previousRun(workspace, latest)} /></> : <RecommendedChecks expanded />}{hasWorkspaceCapability(workspace.role, "assets:create") ? <RunControl asset={asset} latest={latest} busy={busy} onRun={onRun} /> : <p className="quiet boundary">Viewer access · Only an Owner can start an observation.</p>}{latest ? <><RecommendedChecks /><section className="section" id="all-observations"><h2>All observations</h2><ObservationList run={latest} /></section></> : null}<section className="section"><h2>Run history</h2><p className="quiet">Previous evidence stays intact. Rerun later to compare; no monitoring happens automatically.</p><History workspace={workspace} assetId={asset.id} /></section></>;
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
  const { event } = useProductActivity();
  const asset = workspace.assets.find((item) => item.id === run.assetId);
  return <><Link className="back" href={`/assets/${run.assetId}`}>← Back to asset</Link><Header title="Observation" eyebrow={run.snapshot.target} eyebrowIsIdentifier><p>Observed {date(run.snapshot.finished_at)}</p><p>What these public checks observed at the recorded time. This is not a complete security assessment.</p></Header><ResultSummary run={run} /><Changes workspace={workspace} current={run} previous={previousRun(workspace, run)} /><section className="section" id="all-observations"><h2>All observations</h2><ObservationList run={run} /></section>{asset && hasWorkspaceCapability(workspace.role, "assets:create") ? <RunControl asset={asset} latest={run} busy={busy} onRun={onRun} /> : null}<details className="method-panel"><summary>Method and source evidence</summary><div className="actions"><button className="button secondary" onClick={() => { downloadSource(run); event("source_json_downloaded", run); }}>Download source JSON</button></div><dl className="facts"><div><dt>Source representation</dt><dd>ExternalSnapshotV1 · {run.snapshot.version}</dd></div><div><dt>Run ID</dt><dd>{run.id}</dd></div><div><dt>Source digest</dt><dd className="mono">{run.sourceDigest}</dd></div><div><dt>Started</dt><dd>{date(run.snapshot.started_at)}</dd></div><div><dt>Finished</dt><dd>{date(run.snapshot.finished_at)}</dd></div></dl><h3>Collection usage</h3><pre>{JSON.stringify(run.snapshot.usage, null, 2)}</pre><h3>Network attempt ledger</h3><p className="quiet">Operations and attempts, not independent proof of responses or source-system truth.</p><pre>{JSON.stringify(run.snapshot.network, null, 2)}</pre></details><p className="quiet boundary">{SNAPSHOT_BOUNDARY}</p><DeeperReview run={run} /></>;
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="detail-section"><h2>{title}</h2>{children}</section>;
}

function ObservationPage({ run, check }: { run: Run; check: ExternalCheckResultV1 }) {
  const facts = observationFacts(check);
  return <div className="detail-column"><Link className="back" href={`/runs/${run.id}`}>← Open this run</Link><div className="row-title"><p className="eyebrow identifier">{check.target}</p><Status check={check} /></div><h1>{check.title}</h1><p className="support">Observed {date(check.finished_at)}</p><div className="detail-stack"><DetailSection title="What we observed">{facts.length ? <dl className="facts evidence-facts">{facts.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : <p>No summary fields are available. Open the raw source below for the exact recorded observation.</p>}<p className="quiet">Selected fields from this saved observation. Full recorded values remain in the source below.</p></DetailSection><DetailSection title="What this means"><p>{check.interpretation}</p>{check.status === "OBSERVED_EXPECTED" ? <p className="quiet">Clear applies to this check only. It does not establish that the hostname is secure.</p> : null}{check.status === "CHECK_ERROR" ? <p className="quiet">A collection error is Undetermined, not evidence of a vulnerability.</p> : null}</DetailSection><DetailSection title="What you can do next"><p>{nextAction(check)}</p></DetailSection><DetailSection title="What remains unknown"><ul>{check.limitations.map(limitation => <li key={limitation}>{limitation}</li>)}</ul></DetailSection></div><details className="method-panel"><summary>Method and provenance</summary><dl className="facts"><div><dt>Contract ID</dt><dd className="mono">{check.check_id}</dd></div><div><dt>Version</dt><dd className="mono">{check.check_version}</dd></div><div><dt>Method</dt><dd>{check.method}</dd></div><div><dt>Recorded status</dt><dd className="mono">{check.status}</dd></div><div><dt>Collection state</dt><dd>{check.collected ? "Collected" : "Not collected"}</dd></div><div><dt>Started</dt><dd>{date(check.started_at)}</dd></div><div><dt>Finished</dt><dd>{date(check.finished_at)}</dd></div><div><dt>Run source digest</dt><dd className="mono">{run.sourceDigest}</dd></div></dl><h3>Evidence references</h3><ul className="source-refs">{check.evidence.map(reference => <li key={reference}><code>{reference}</code></li>)}</ul>{!check.evidence.length ? <p>No evidence references were recorded.</p> : null}</details><details className="method-panel"><summary>Raw source observation</summary><pre>{JSON.stringify(check.observation, null, 2)}</pre></details><Link className="text-action" href={`/assets/${run.assetId}`}>Back to asset and run history →</Link></div>;
}

function ReportPage({ workspace, run }: { workspace: Workspace; run: Run }) {
  const { event } = useProductActivity();
  const previous = previousRun(workspace, run);
  const model = useMemo(() => savedRunReport(run, previous), [run, previous]);
  const context = { linux: false, evidenceHref: (finding: typeof model.findings[number]) => `/runs/${run.id}/observations/${encodeURIComponent(finding.checkId ?? finding.id)}`, recheckHref: hasWorkspaceCapability(workspace.role, "hostname:run") ? `/assets/${run.assetId}#run-observation` : undefined };
  const { print, printRoot } = useBuyerReportPrint(model, reportFollowThrough(model, context, false));
  return <>{printRoot}<div className="report-actions actions"><Link className="button secondary" href={`/runs/${run.id}`}>← Open observation</Link><button className="button" onClick={() => { print(); event("pdf_export_requested", run); }}>Save report as PDF</button><button className="button secondary" onClick={() => { downloadSource(run); event("source_json_downloaded", run); }}>Download source JSON</button></div><p className="quiet report-context">Saved workspace run · {date(run.snapshot.finished_at)}. This report uses the preserved source. Exporting does not run another observation.</p><ReportShare key={`${workspace.id}:${run.id}`} workspaceId={workspace.id} runId={run.id} role={workspace.role}/><BuyerReportDocument model={model} followThrough={reportFollowThrough(model, context)} /><Link className="text-action" href={`/assets/${run.assetId}`}>Back to asset and run history →</Link></>;
}

function SignInLinks() {
  // AuthKit starts full document navigations, not prefetched client routes.
  return <div className="actions">
    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
    <a className="button" href="/signup">Create account</a>
    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
    <a className="button secondary" href="/login">Sign in</a>
  </div>;
}

function Missing({ title = "Not found" }: { title?: string }) {
  return <div className="empty"><h1>{title}</h1><p>This item is not in the current workspace.</p><Link className="button secondary" href="/">Back to overview</Link></div>;
}

export function ProductApp() {
  const pathname = usePathname();
  const router = useRouter();
  const [access, setAccess] = useState<WorkspaceAccessState | undefined>(undefined);
  const [state, setState] = useState<WorkspaceState | null>(null);
  const workspace = state?.workspace ?? null;
  const [workspaceName, setWorkspaceName] = useState("");
  const [creationKey, setCreationKey] = useState("");
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const operationInFlight = useRef(false);
  const [error, setError] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!navOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setNavOpen(false);
      menuButton.current?.focus();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [navOpen]);
  useEffect(() => {
    let active = true;
    fetch("/api/workspace", { credentials: "same-origin", cache: "no-store" }).then(async (response) => {
      if (response.status === 401) return null;
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        if (payload?.code === "EARLY_ACCESS_REQUIRED") { if (active) setAccess(payload.accessState); return null; }
        throw new Error("The workspace could not be loaded.");
      }
      const value = await response.json() as WorkspaceState;
      // This is only a preference, never authority. Do not send another user's
      // selection or a removed membership back to the server.
      let selected: string | null = null;
      try { selected = localStorage.getItem(`witnessops.workspace.${value.user.id}`); } catch { /* Storage is optional. */ }
      if (!selected || !value.workspaces.some(item => item.id === selected)) return value;
      try { return await request<WorkspaceState>('/api/workspace', 'GET', undefined, selected); }
      catch (cause) {
        if (!(cause instanceof Error) || !('status' in cause) || cause.status !== 404) throw cause;
        // Membership may have been revoked since the list response. Fetch fresh
        // authorized state rather than retaining the stale list or selected data.
        try { localStorage.removeItem(`witnessops.workspace.${value.user.id}`); } catch { /* Storage is optional. */ }
        return request<WorkspaceState>('/api/workspace');
      }
    }).then((value) => { if (active) setState(value); }).catch((cause: unknown) => { if (active) { if (cause instanceof Error && "accessState" in cause) setAccess(cause.accessState as WorkspaceAccessState); else setError(cause instanceof Error ? cause.message : "The workspace could not be loaded."); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!state?.workspace) return;
    try { localStorage.setItem(`witnessops.workspace.${state.user.id}`, state.workspace.id); } catch { /* Storage is optional. */ }
  }, [state]);

  async function perform(action: () => Promise<void>) {
    if (operationInFlight.current) return;
    operationInFlight.current = true;
    setBusy(true);
    setError("");
    try { await action(); } catch (cause) { if (cause instanceof Error && "accessState" in cause) { setAccess(cause.accessState as WorkspaceAccessState); setState(null); } else setError(cause instanceof Error ? cause.message : "This action could not complete. Try again."); } finally { operationInFlight.current = false; setBusy(false); }
  }
  async function refresh() {
    try {
      setState(await request<WorkspaceState>("/api/workspace", "GET", undefined, workspace?.id));
    } catch (cause) {
      if (cause instanceof Error && 'status' in cause && [401, 403, 404].includes(Number(cause.status))) {
        setState(null);
        if ('accessState' in cause) setAccess(cause.accessState as WorkspaceAccessState);
        else setState(await request<WorkspaceState>("/api/workspace"));
      } else throw cause;
    }
  }
  async function createWorkspace() {
    await perform(async () => {
      const key = creationKey || crypto.randomUUID();
      setCreationKey(key);
      setState(await request<WorkspaceState>('/api/workspace', 'POST', { name: workspaceName, requestId: key }));
      setCreatingWorkspace(false);
      setWorkspaceName('');
      setCreationKey('');
      router.push('/');
    });
  }
  async function onAdd(hostname: string, type: Asset["type"]) {
    await perform(async () => {
      const asset = await request<Asset>("/api/assets", "POST", { hostname, type }, workspace?.id);
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
  const navigation = <nav aria-label="Workspace navigation">{nav.map(item => <Link
    key={item.href}
    href={item.href}
    onClick={() => setNavOpen(false)}
    aria-current={(item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) ? "page" : undefined}
  >{item.label}</Link>)}</nav>;
  let content: ReactNode;
  const parts = pathname.split("/").filter(Boolean);
  if (access !== undefined) {
    content = <AccessGate state={access} busy={busy} activate={() => void perform(async () => { await request("/api/early-access", "POST", { action: "activate" }); setState(await request<WorkspaceState>("/api/workspace")); setAccess(undefined); router.push("/"); })} />;
  } else if (!state) {
    content = <div className="welcome"><p className="eyebrow">WitnessOps · Checks</p><h1>Open WitnessOps</h1><p>Create an account or sign in to open your workspaces. No check starts until you authorize it.</p>{loading ? <p role="status">Loading workspace…</p> : <><SignInLinks /><p className="quiet">Account authentication is handled on the secure WorkOS screen.</p><div className="actions"><a className="text-action" href="https://witnessops.com/check">Run a free check without an account →</a></div></>}</div>;
  } else if (creatingWorkspace || state.workspaces.length === 0) {
    content = <div className="welcome"><h1>Create workspace</h1>
      <p>Create a separate space for your assets and saved evidence. No card or subscription is required.</p>
      <form className="asset-form" onSubmit={event => { event.preventDefault(); void createWorkspace(); }}>
        <label htmlFor="workspace-name">Workspace name</label>
        <input id="workspace-name" value={workspaceName} maxLength={100} required disabled={busy} onChange={event => { setWorkspaceName(event.target.value); setCreationKey(''); }} />
        <div className="actions"><button className="button" disabled={busy || !workspaceName.trim()}>Create workspace</button>
          {state.workspaces.length > 0 ? <button type="button" className="button secondary" disabled={busy} onClick={() => setCreatingWorkspace(false)}>Cancel</button> : null}
        </div>
      </form></div>;
  } else if (!workspace) {
    content = <div className="welcome"><h1>Open workspace</h1><ul className="ledger">{state.workspaces.map(item => <li key={item.id}><button className="button secondary" onClick={() => void perform(async () => { setState(await request<WorkspaceState>("/api/workspace", "GET", undefined, item.id)); router.push("/"); })}>{item.name}</button></li>)}</ul></div>;
  } else if (!parts.length) {
    content = <Overview workspace={workspace} />;
  } else if (parts[0] === "assets" && parts.length === 1) {
    content = <><Header title="Assets" action={hasWorkspaceCapability(workspace.role, "assets:create") ? <Link className="button" href="/assets/new">Add asset</Link> : undefined}><p>Add what you want WitnessOps to observe. Adding an asset does not prove ownership.</p></Header><AssetList workspace={workspace} /></>;
  } else if (pathname === "/assets/new") {
    content = hasWorkspaceCapability(workspace.role, "assets:create") ? <AddAsset busy={busy} onAdd={onAdd} /> : <Missing title="Owner access required" />;
  } else if (parts[0] === "assets" && parts.length === 2) {
    const asset = workspace.assets.find((item) => item.id === parts[1]);
    content = asset?.type === "linux_server" ? <LinuxAsset key={asset.id} workspace={workspace} asset={asset} imported={async run => { await refresh(); router.push(`/runs/${run.id}`); }} /> : asset ? <AssetPage key={asset.id} workspace={workspace} asset={asset} busy={busy} onRun={onRun} /> : <Missing title="Asset not found" />;
  } else if (parts[0] === "runs" && parts.length === 2) {
    const run = workspace.runs.find((item) => item.id === parts[1]);
    content = (workspace.linuxRuns ?? []).some(run => run.id === parts[1]) ? <LinuxCheckPage key={parts[1]} runId={parts[1]} workspaceId={workspace.id} role={workspace.role} /> : run ? <RunPage key={run.id} workspace={workspace} run={run} busy={busy} onRun={onRun} /> : <Missing title="Run not found" />;
  } else if (parts[0] === "runs" && parts[2] === "observations" && parts.length === 4) {
    const run = workspace.runs.find((item) => item.id === parts[1]);
    const check = run?.snapshot.checks.find((item) => item.check_id === parts[3]);
    content = run && check ? <ObservationPage run={run} check={check} /> : <Missing title="Observation not found" />;
  } else if (pathname === "/reports") {
    content = <><Header title="Reports"><p>A report is a readable snapshot of one observation. It is not a security score.</p></Header><History workspace={workspace} report /><LinuxHistory workspace={workspace} /></>;
  } else if (parts[0] === "reports" && parts.length === 2) {
    const run = workspace.runs.find((item) => item.id === parts[1]);
    content = (workspace.linuxRuns ?? []).some(run => run.id === parts[1]) ? <LinuxCheckPage key={parts[1]} runId={parts[1]} workspaceId={workspace.id} role={workspace.role} /> : run ? <ReportPage workspace={workspace} run={run} /> : <Missing title="Report not found" />;
  } else if (pathname === "/members") {
    content = <Members key={workspace.id} workspaceId={workspace.id} onChanged={refresh} />;
  } else if (pathname === "/settings") {
    content = <><Header title="Settings"><p>The workspace retains your assets and observations across sign-ins.</p></Header><dl className="facts settings-facts"><div><dt>Workspace</dt><dd>{workspace.name}</dd></div><div><dt>Your role</dt><dd>{workspace.role === "owner" ? "Owner" : workspace.role === "contributor" ? "Contributor" : "Viewer"}</dd></div><div><dt>Authentication</dt><dd>WorkOS AuthKit. Workspace access is managed by WitnessOps.</dd></div><div><dt>Persistence</dt><dd>PostgreSQL. Completed source snapshots remain unchanged when you run again.</dd></div><div><dt>Collection</dt><dd>Manual, explicitly authorized hostname observations. No schedules.</dd></div></dl><Billing key={workspace.id} workspaceId={workspace.id}/><section className="section"><h2>Early Access</h2><p>External Exposure is currently in Early Access. Observation methods and product presentation may improve. Previous completed evidence is not silently rewritten.</p><p className="quiet">{EARLY_ACCESS_DATA_NOTE}</p><p className="quiet">PDF export events record the print action being requested, not confirmation that a file was saved.</p><a className="text-action" href={publicContactMailto("WitnessOps — Early Access data request")}>Contact us about your data →</a></section><RecommendedChecks /><div className="clear-session"><h2>Sign out</h2><p>Signing out ends your app session. Your workspace, assets and runs remain saved.</p><form action={logout}><button className="button secondary">Sign out</button></form></div></>;
  } else {
    content = <Missing />;
  }
  return <div className="product-app">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="app-header">
      <div className="header-inner">
        <Link className="wordmark" href="/" aria-label="WitnessOps overview"><WitnessOpsMark size="sm" decorative /> WitnessOps</Link>
        <div className="desktop-navigation">{navigation}</div>
        <span className="early-access-pill">Early Access</span>
        <AppHelp key={`${workspace?.id ?? "account"}:${helpPage(pathname)}`} page={helpPage(pathname)} />
        {state ? <form action={logout} className="header-signout"><button className="text-button" aria-label="Sign out of WitnessOps">Sign out</button></form> : null}
        <button ref={menuButton} className="menu-toggle" aria-expanded={navOpen} aria-controls="mobile-navigation" onClick={() => setNavOpen(!navOpen)} aria-label={navOpen ? "Close navigation" : "Open navigation"}>{navOpen ? "×" : "☰"}</button>
      </div>
      {navOpen ? <div className="mobile-navigation" id="mobile-navigation">{navigation}</div> : null}
    </header>
    <div className={`workspace-bar${state && state.workspaces.length > 1 ? ' has-workspace-picker' : ''}`}>
      {state ? <button className="button secondary" disabled={busy} onClick={() => { setWorkspaceName(""); setCreationKey(""); setCreatingWorkspace(true); }}>New workspace</button> : null}
      <div className="workspace-context"><span className="context-label">Workspace</span><span className="workspace-name">{workspace?.name || "WitnessOps"}</span></div>
      {state && state.workspaces.length > 1 ? <select aria-label="Active workspace" disabled={busy} value={workspace?.id || ""} onChange={event => void perform(async () => { setState(await request<WorkspaceState>("/api/workspace", "GET", undefined, event.target.value)); router.push("/"); })}><option value="" disabled>Select workspace</option>{state.workspaces.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select> : null}
      <span className="account">{state?.user.displayName || "WitnessOps"}{workspace ? <span className="account-role"> · {workspace.role === "owner" ? "Owner" : workspace.role === "contributor" ? "Contributor" : "Viewer"}</span> : null}</span>
    </div>
    <main id="main-content" className="main-content">
      {error ? <div className="error" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss error">×</button></div> : null}
      {busy && workspace ? <p className="pending" role="status">Completing your request…</p> : null}
      <ProductActivity key={workspace?.id ?? "none"} workspace={workspace}>{content}</ProductActivity>
    </main>
    <footer className="workspace-footer"><span>WitnessOps · Early Access</span><span>Saved evidence. Manual checks.</span></footer>
  </div>;
}
