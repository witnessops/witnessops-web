"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { WitnessOpsMark } from "@witnessops/ui/witnessops-mark";
import { AASR_FIXTURE_PATH, AASR_FIXTURE_WORKSPACE_ID } from "../lib/aasr-fixture/contract";
import type { EngineView } from "../lib/aasr-fixture/engine";
import styles from "./aasr-fixture.module.css";

type View = EngineView & { actorRole: "owner" | "reviewer" };
const labels: Record<string, string> = {
  accept_scope: "Accept fixed scope", submit_evidence: "Submit pinned evidence",
  admit_evidence: "Admit synthetic evidence", record_review: "Record partial-evidence review",
  accept_report: "Accept report", prepare_delivery: "Prepare recipient preview",
  simulate_delivery: "Simulate delivery", close: "Close engagement", hold: "Hold engagement",
};
const stageNames: Record<string, string> = {
  draft: "Scope awaiting acceptance", awaiting_evidence: "Awaiting synthetic evidence",
  evidence_submitted: "Evidence awaiting admission", review_ready: "Ready for independent review",
  review_recorded: "Report awaiting customer acceptance", report_accepted: "Report accepted",
  delivery_prepared: "Recipient preview prepared", delivery_simulated: "Delivery simulated",
  closed: "Engagement closed", held: "Engagement held",
};

async function request(command?: string, expectedRevision?: number): Promise<View> {
  const response = await fetch(AASR_FIXTURE_PATH, {
    method: command ? "POST" : "GET", credentials: "same-origin", cache: "no-store",
    headers: { "X-WitnessOps-Workspace": AASR_FIXTURE_WORKSPACE_ID, ...(command ? { "Content-Type": "application/json" } : {}) },
    ...(command ? { body: JSON.stringify({ command, expectedRevision }) } : {}),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof body?.error === "string" ? body.error : body?.error?.message;
    throw new Error(message || (response.status === 401 ? "Sign in with your assigned account to open this fixture." : "This synthetic engagement is unavailable for this account."));
  }
  return body as View;
}

export function AasrFixtureApp({ staging = false, sessionActions }: { staging?: boolean; sessionActions?: ReactNode } = {}) {
  const [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let mounted = true;
    request().then(next => { if (mounted) setView(next); }).catch(reason => { if (mounted) setError(reason instanceof Error ? reason.message : "Unable to open engagement."); }).finally(() => { if (mounted) setBusy(false); });
    return () => { mounted = false; };
  }, []);
  async function refresh() {
    setBusy(true); setError("");
    try { setView(await request()); } catch (reason) { setView(null); setError(reason instanceof Error ? reason.message : "Unable to refresh engagement."); }
    finally { setBusy(false); }
  }
  async function command(name: string) {
    if (!view || busy) return;
    setBusy(true); setError("");
    try { setView(await request(name, view.revision)); }
    catch (reason) {
      setError(reason instanceof Error ? reason.message : "The command was refused.");
      // Recheck access and revision after a refusal; stale controls must not survive revocation.
      try { setView(await request()); } catch { setView(null); }
    } finally { setBusy(false); }
  }
  return <div className="product-app">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="app-header"><div className={`header-inner ${styles.header}`}>
      <Link className="wordmark" href="/" aria-label="WitnessOps overview"><WitnessOpsMark size="sm" decorative /> WitnessOps</Link>
      <span className={styles.badge}>Synthetic fixture · {staging ? "staging" : "local only"}</span>
      <Link className="text-action" href="/">{staging ? "Staging home" : "Back to workspace"}</Link>
      {sessionActions}
    </div></header>
    <main id="main-content" className={`main-content ${styles.main}`}>
      <div className="page-heading"><div><p className="eyebrow">Agent Action Security Review</p><h1>Synthetic engagement</h1><p className="support">One fictional action, from accepted scope to simulated delivery.</p></div></div>
      <aside className={styles.boundary} aria-label="Fixture boundary">
        <strong>{staging ? "Staging simulation" : "Development fixture"} — no customer review or external action.</strong>
        <p>State is held in this server process only. Refresh reloads its current revision; restarting the process loses the engagement. Nothing is collected, sent or published.</p>
        {staging ? <p>Use separate browser profiles for the assigned Owner and reviewer. Signing out ends your native app session; it does not clear the browser’s separate staging access credentials.</p> : null}
      </aside>
      {error ? <div className="error" role="alert">{error}</div> : null}
      {busy ? <p role="status" className="pending">Loading current engagement…</p> : null}
      {!view && !busy ? <button className="button secondary" onClick={() => void refresh()}>Retry access</button> : null}
      {view ? <>
        <section aria-label="Engagement status" className={styles.panel}>
          <div className={styles.heading}><h2>{stageNames[view.stage] || view.stage}</h2><button className="button secondary" disabled={busy} onClick={() => void refresh()}>Refresh status</button></div>
          <dl className="facts"><div><dt>Engagement</dt><dd>{view.id}</dd></div><div><dt>Workspace</dt><dd>{view.workspaceLabel}</dd></div><div><dt>Action</dt><dd>{view.actionId}</dd></div><div><dt>Agent</dt><dd>{view.agentId}</dd></div><div><dt>Revision</dt><dd data-testid="aasr-revision">{view.revision}</dd></div><div><dt>Your assigned authority</dt><dd>{view.actorRole === "reviewer" ? "Independent assigned reviewer" : "Customer Owner"}</dd></div></dl>
          {view.allowedCommands.length ? <div className={styles.actions}>{view.allowedCommands.map(name => <button key={name} className={`button${name === "hold" ? " secondary" : ""}`} disabled={busy} onClick={() => void command(name)}>{labels[name] || name}</button>)}</div> : <p className="quiet">No transition is available for your account at this stage. Another assigned participant may need to act.</p>}
          {view.stage === "delivery_simulated" || view.stage === "closed" ? <p className={styles.notice}>DELIVERY SIMULATED · 0 external actions</p> : null}
        </section>
        <section aria-label="Fixed synthetic scope" className={styles.panel}>
          <h2>Fixed scope</h2><p>Read synthetic policy, inspect a synthetic event log and prepare a simulated report for this one action.</p>
          <p className="quiet">Excluded: running a customer agent, contacting a real CRM, sending reports, deployment and production access. Accepting this scope grants none of those actions.</p>
        </section>
        <section aria-label="Evidence provenance" className={styles.panel}>
          <h2>Evidence and limits</h2>
          <p>Only the pinned synthetic source is admitted. No file, URL, secret or customer evidence can be uploaded.</p>
          <dl className="facts"><div><dt>Source authenticity</dt><dd>UNKNOWN</dd></div><div><dt>Evidence truth</dt><dd>UNKNOWN</dd></div><div><dt>Runtime approval enforcement</dt><dd>UNKNOWN — not independently observed</dd></div></dl>
          {view.provenance ? <details><summary>Retained source digests</summary><dl className={`facts ${styles.digests}`}><div><dt>Original bytes</dt><dd>{view.provenance.rawDigest}</dd></div><div><dt>Canonical content</dt><dd>{view.provenance.canonicalDigest}</dd></div><div><dt>Claimed digest</dt><dd>{view.provenance.claimedDigest}</dd></div></dl><p className="quiet">Hash correspondence does not establish source authenticity or the truth of a claim.</p></details> : null}
        </section>
        {view.review ? <section aria-label="Review report" className={styles.panel}><h2>Review: {view.review.reviewerDecision}</h2><p>This is a synthetic review, not verified customer evidence.</p>{view.review.findings.map(finding => <article key={finding.id} className={styles.finding}><h3>{finding.title}</h3><p>{finding.recommendation}</p><p className="quiet">Source references: {finding.sourceRefs.join(", ")}</p></article>)}<h3>Material unknowns</h3><ul>{view.review.unknowns.map(item => <li key={item}>{item}</li>)}</ul><h3>Scope limitations</h3><ul>{view.review.scopeLimitations.map(item => <li key={item}>{item}</li>)}</ul></section> : null}
        {view.recipientReady && view.recipient ? <section aria-label="Recipient preview" className={styles.panel}><h2>Recipient preview — simulated only</h2><p>This accepted projection contains the selected finding and limitations. It is not a share link or delivery.</p><h3>{view.recipient.title}</h3><p>{view.recipient.assessment}</p>{view.recipient.findings.map(finding => <article key={finding.id} className={styles.finding}><h3>{finding.title}</h3><p>{finding.recommendation}</p></article>)}<ul>{view.recipient.unknowns.map(item => <li key={item}>{item}</li>)}</ul><h3>Scope limitations</h3><ul>{view.recipient.limitations.map(item => <li key={item}>{item}</li>)}</ul><details><summary>Accepted report reference</summary><p className={styles.digest}>{view.recipient.reportDigest}</p></details><p className="quiet">{view.recipient.proofBoundary}</p><p className={styles.notice}>No report has been sent.</p></section> : null}
        <section aria-label="Engagement activity" className={styles.panel}><h2>Recorded activity</h2><p className="quiet">{view.integrity.pass ? "The current state matches this process’s retained event history." : "State integrity could not be established. Stop and review this engagement."} This is a local consistency check, not source authentication.</p>{view.audit.length ? <ol>{view.audit.map(event => <li key={event.hash}>{labels[event.event]} — {stageNames[event.stage]}</li>)}</ol> : <p>No transition has been accepted.</p>}{view.deniedCount ? <p>{view.deniedCount} command {view.deniedCount === 1 ? "was" : "were"} refused. Refusal does not advance the engagement.</p> : null}</section>
      </> : null}
    </main>
    <footer className="workspace-footer"><span>WitnessOps · Synthetic fixture</span><span>No external delivery</span></footer>
  </div>;
}
