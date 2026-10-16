"use client";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { canonicalSource } from "../../../../witnessops-app/src/lib/source-digest";
import type { CheckStatus, ExternalCheckResultV1, ExternalSnapshotV1 } from "../../lib/external-exposure/contracts";
import {
  WHAT_THIS_IS_NOT_LABELS,
  buildUnsignedRunRecord,
  checksPerformedSentence,
  collectedEvidenceSentence,
  displayTimestamp,
  resultSentence,
  resultGroups,
  RUN_RECORD_WORDING,
  type UnsignedRunRecord,
} from "../../lib/external-exposure/unsigned-run-record";
import styles from "./domain-check-results.module.css";
import printStyles from "./domain-check-results-print.module.css";

type ThemeName = "dark" | "light";

const STATUS_TEXT: Record<CheckStatus, string> = {
  NEEDS_ATTENTION: "Needs attention",
  OBSERVED_EXPECTED: "Observed as expected",
  INFORMATIONAL: "Informational",
  UNDETERMINED: "Undetermined",
  CHECK_ERROR: "Collection error",
};

function saveFile(filename: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function fileStem(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "run";
}

export function downloadSourceJson(snapshot: ExternalSnapshotV1, filename: string) {
  saveFile(filename, canonicalSource(snapshot));
}

export function downloadRunRecord(record: UnsignedRunRecord, filename: string) {
  saveFile(filename, `${JSON.stringify(record, null, 2)}\n`);
}

function StatusMark({ status }: { status: CheckStatus | "NOT_RUN" }) {
  const label = status === "NOT_RUN" ? "Not run" : STATUS_TEXT[status];
  const tone = status === "NOT_RUN" ? "notRun" : status === "NEEDS_ATTENTION" ? "attention" : status === "OBSERVED_EXPECTED" ? "ok" : status === "INFORMATIONAL" ? "info" : status === "CHECK_ERROR" ? "error" : "undetermined";
  return <span className={`${styles.status} ${styles[tone]}`}><StatusIcon tone={tone} /><span>{label}</span></span>;
}

function StatusIcon({ tone }: { tone: string }) {
  return <svg className={styles.icon} viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray={tone === "undetermined" ? "2.2 2.2" : undefined} />
    {tone === "attention" && <path d="M8 4.4v4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
    {tone === "attention" && <circle cx="8" cy="11.2" r="0.8" fill="currentColor" />}
    {tone === "info" && <path d="M8 7.1v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
    {tone === "info" && <circle cx="8" cy="4.8" r="0.75" fill="currentColor" />}
    {tone === "error" && <path d="M5.4 5.4l5.2 5.2M10.6 5.4l-5.2 5.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
    {tone === "notRun" && <path d="M5 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
  </svg>;
}

function CheckLine({ check, href }: { check: ExternalCheckResultV1; href?: string }) {
  return <li data-status={check.status}>
    <div className={styles.checkHead}><strong>{check.title}</strong><StatusMark status={check.status} /></div>
    <p>{check.interpretation}</p>
    {check.recommendation ? <p className={styles.note}>{check.recommendation}</p> : null}
    {href ? <a href={href}>Open the recorded check</a> : null}
  </li>;
}

function Group({ title, count, status, children }: { title: string; count: number; status: CheckStatus | "NOT_RUN"; children: ReactNode }) {
  return <details className={styles.group}>
    <summary><StatusMark status={status} /><span>{title}</span><span className={styles.count}>{count}</span></summary>
    <div className={styles.groupBody}>{children}</div>
  </details>;
}

export function RunRecordDocument({
  snapshot, runId, theme, surface, headingLevel = 2, observationHref, headingRef,   onPrint, onSource, onRecord, showActions = true, expandRaw = false,
}: {
  snapshot: ExternalSnapshotV1;
  runId: string;
  theme: ThemeName;
  surface: "public" | "saved";
  headingLevel?: 1 | 2;
  observationHref?: (checkId: string) => string;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  onPrint?: () => void;
  onSource?: () => void;
  onRecord?: () => void;
  showActions?: boolean;
  expandRaw?: boolean;
}) {
  const record = buildUnsignedRunRecord(snapshot, runId);
  const groups = resultGroups(snapshot.checks);
  const when = displayTimestamp(snapshot.finished_at);
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const href = (checkId: string) => observationHref?.(checkId);
  return <article className={styles.results} data-theme={theme} data-surface={surface} aria-label="Snapshot results" data-run-record-body>
    <header className={styles.summary}>
      <p className={styles.tag}>Unsigned</p>
      <p>{surface === "saved" ? "Saved run" : "Free check"}</p>
      <Heading ref={headingRef} tabIndex={-1} className={styles.domain}>{snapshot.target}</Heading>
      <p className={styles.mono}>{when.warsaw} · {when.utc}</p>
      <p className={styles.counts}>{record.checks_performed.length} checks run · {groups.ok.length} observed as expected · {groups.attention.length} need attention · {record.checks_not_run.length} not run</p>
      <p>{collectedEvidenceSentence(record.collected_evidence.count)}</p>
    </header>
    <section className={styles.attention} aria-labelledby="needs-attention-heading">
      <h2 id="needs-attention-heading">Needs attention</h2>
      {groups.attention.length ? <ul className={styles.list}>{groups.attention.map(check => <CheckLine key={check.check_id} check={check} href={href(check.check_id)} />)}</ul> : <p>{RUN_RECORD_WORDING.noIssues}</p>}
    </section>
    <div className={styles.groups}>
      <Group title="Observed as expected" count={groups.ok.length} status="OBSERVED_EXPECTED">
        {groups.ok.length ? <ul className={styles.list}>{groups.ok.map(check => <CheckLine key={check.check_id} check={check} href={href(check.check_id)} />)}</ul> : <p>None of the performed checks are in this group.</p>}
      </Group>
      <Group title="Informational" count={groups.informational.length} status="INFORMATIONAL">
        {groups.informational.length ? <ul className={styles.list}>{groups.informational.map(check => <CheckLine key={check.check_id} check={check} href={href(check.check_id)} />)}</ul> : <p>No informational results.</p>}
      </Group>
      <Group title="Undetermined" count={groups.undetermined.length} status="UNDETERMINED">
        {groups.undetermined.length ? <ul className={styles.list}>{groups.undetermined.map(check => <CheckLine key={check.check_id} check={check} href={href(check.check_id)} />)}</ul> : <p>No undetermined results.</p>}
      </Group>
      <Group title="Collection error" count={groups.errors.length} status="CHECK_ERROR">
        {groups.errors.length ? <ul className={styles.list}>{groups.errors.map(check => <CheckLine key={check.check_id} check={check} href={href(check.check_id)} />)}</ul> : <p>Collection error: none.</p>}
      </Group>
      <Group title="Not run" count={record.checks_not_run.length} status="NOT_RUN">
        {record.checks_not_run.length ? <ul className={styles.list}>{record.checks_not_run.map(id => <li key={id}><span className={styles.mono}>{id}</span></li>)}</ul> : <p>Not checked: none. A check that was not run is listed here. Undetermined is a different outcome.</p>}
      </Group>
    </div>
    <section className={styles.record} aria-label="Unsigned run record">
      <h2>Run record <span className={styles.tag}>Unsigned</span></h2>
      <p>{RUN_RECORD_WORDING.integrityLabel}</p>
      <p className={styles.mono}>{record.integrity.digest}</p>
      <p>{RUN_RECORD_WORDING.integrityMeaning}</p>
      <p>{RUN_RECORD_WORDING.keepCopy}</p>
      <p>{RUN_RECORD_WORDING.recheck}</p>
      <p>{checksPerformedSentence(record.checks_performed, record.checks_not_run, record.collection_errors)}</p>
      <p>{resultSentence(record)}</p>
      {record.overall === "pass" ? <p>{RUN_RECORD_WORDING.noIssues}</p> : null}
      <dl className={styles.facts}>
        <div><dt>Run id</dt><dd><span className={styles.mono}>{record.run_id}</span>{surface === "public" ? <span className={styles.note}>{RUN_RECORD_WORDING.derivedRunId}</span> : null}</dd></div>
        <div><dt>Workflow</dt><dd className={styles.mono}>{record.workflow_class}</dd></div>
        <div><dt>UTC</dt><dd className={styles.mono}>{record.timestamp.utc}</dd></div>
        <div><dt>Europe/Warsaw</dt><dd className={styles.mono}>{record.timestamp.europe_warsaw}</dd></div>
        <div><dt>Vantage</dt><dd>{record.vantage.description}</dd></div>
        <div><dt>Overall</dt><dd className={styles.mono}>{record.overall}</dd></div>
        <div><dt>Canonicalization</dt><dd className={styles.mono}>{record.integrity.canonicalization}</dd></div>
        <div><dt>Covers</dt><dd className={styles.mono}>{record.integrity.covers}</dd></div>
      </dl>
      <h3>What this is not</h3>
      <ul>{record.what_this_is_not.map(id => <li key={id}>{WHAT_THIS_IS_NOT_LABELS[id as keyof typeof WHAT_THIS_IS_NOT_LABELS]}</li>)}</ul>
    </section>
    {showActions ? <div className={styles.actions} data-run-record-actions>
      <button type="button" className={styles.primary} onClick={onPrint}>Save report as PDF</button>
      <button type="button" className={styles.secondary} onClick={onSource}>Download source JSON</button>
      <button type="button" className={styles.secondary} onClick={onRecord}>Download run record</button>
    </div> : null}
    <details className={styles.raw} open={expandRaw}>
      <summary>Raw results</summary>
      <p className={styles.note}>Reading view of the recorded results. Download source JSON is the canonical JSON file the hash refers to.</p>
      <pre className={styles.mono}>{JSON.stringify(snapshot, null, 2)}</pre>
    </details>
  </article>;
}

function useRunRecordPrint(snapshot: ExternalSnapshotV1, runId: string, surface: "public" | "saved", headingLevel: 1 | 2, observationHref?: (checkId: string) => string) {
  const [body, setBody] = useState<HTMLElement | null>(null);
  useEffect(() => { setBody(document.body); }, []);
  return {
    print: () => window.print(),
    printRoot: body ? createPortal(
      <div className={printStyles.root} data-run-record-print>
        <RunRecordDocument snapshot={snapshot} runId={runId} theme="light" surface={surface} headingLevel={headingLevel} observationHref={observationHref} showActions={false} expandRaw />
      </div>,
      body,
    ) : null,
  };
}

export function DomainCheckResults({
  snapshot, runId, surface, storedDigest, headingLevel = 2, observationHref, onPdfRequested, onSourceDownloaded, onRecordDownloaded,
}: {
  snapshot: ExternalSnapshotV1;
  runId: string;
  surface: "public" | "saved";
  storedDigest?: string;
  headingLevel?: 1 | 2;
  observationHref?: (checkId: string) => string;
  onPdfRequested?: () => void;
  onSourceDownloaded?: () => void;
  onRecordDownloaded?: () => void;
}) {
  const [theme, setTheme] = useState<ThemeName>("dark");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const record = buildUnsignedRunRecord(snapshot, runId);
  const { print, printRoot } = useRunRecordPrint(snapshot, runId, surface, headingLevel, observationHref);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => setTheme(media.matches ? "light" : "dark");
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  useEffect(() => { headingRef.current?.focus(); }, [runId]);
  if (storedDigest && storedDigest !== record.integrity.digest) return <p role="alert">Stored source correspondence mismatch.</p>;
  const stem = fileStem(surface === "public" ? snapshot.target : runId);
  return <>
    {printRoot}
    <RunRecordDocument
      snapshot={snapshot}
      runId={runId}
      theme={theme}
      surface={surface}
      headingLevel={headingLevel}
      observationHref={observationHref}
      headingRef={headingRef}
      onPrint={() => { onPdfRequested?.(); print(); }}
      onSource={() => { downloadSourceJson(snapshot, `${stem}-source.json`); onSourceDownloaded?.(); }}
      onRecord={() => { downloadRunRecord(record, `${stem}-run-record.json`); onRecordDownloaded?.(); }}
    />
  </>;
}
