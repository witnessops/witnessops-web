"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  createDemoReceipt,
  receiptFilename,
  serializeDemoReceipt,
  sha256Text,
} from "@/lib/witnessed-action/receipt";
import {
  WITNESSED_CRM_SPECIMEN,
  WITNESSED_CRM_SPECIMEN_PATH,
  WITNESSED_CRM_SPECIMEN_SHA256,
} from "@/lib/witnessed-action/specimen";

import styles from "./witnessed-action.module.css";

type Stage = "authority" | "approval" | "execution" | "receipt";

const STAGES: ReadonlyArray<{ id: Stage; label: string }> = [
  { id: "authority", label: "Authority" },
  { id: "approval", label: "Approval" },
  { id: "execution", label: "Execution" },
  { id: "receipt", label: "Receipt" },
];

function StateList({ phase }: { phase: "before" | "after" }) {
  const records = phase === "before" ? WITNESSED_CRM_SPECIMEN.beforeState : WITNESSED_CRM_SPECIMEN.afterState;
  return (
    <ul className={styles.stateList} aria-label={`${phase} application state`}>
      {records.map((record) => (
        <li key={record.id}>
          <strong>{record.name}</strong>
          <span data-status={record.status}>{record.status}</span>
        </li>
      ))}
    </ul>
  );
}

export function WitnessedActionReplay() {
  const [stage, setStage] = useState<Stage>("authority");
  const [replayConsentAt, setReplayConsentAt] = useState<string | null>(null);
  const [activeEventCount, setActiveEventCount] = useState(0);
  const [receiptDigest, setReceiptDigest] = useState<string | null>(null);
  const [byteVerification, setByteVerification] = useState<"idle" | "match" | "mismatch">("idle");

  const receipt = useMemo(
    () =>
      replayConsentAt
        ? createDemoReceipt(
            WITNESSED_CRM_SPECIMEN,
            WITNESSED_CRM_SPECIMEN_SHA256,
            replayConsentAt,
          )
        : null,
    [replayConsentAt],
  );
  const receiptText = receipt ? serializeDemoReceipt(receipt) : "";
  const filename = replayConsentAt && receiptDigest
    ? receiptFilename(replayConsentAt, receiptDigest)
    : "witnessops-demo-receipt.json";

  useEffect(() => {
    if (stage !== "execution") return;
    if (activeEventCount < WITNESSED_CRM_SPECIMEN.events.length) {
      const timer = window.setTimeout(() => setActiveEventCount((value) => value + 1), 720);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setStage("receipt"), 650);
    return () => window.clearTimeout(timer);
  }, [activeEventCount, stage]);

  useEffect(() => {
    if (stage !== "receipt" || !receiptText) return;
    let active = true;
    void sha256Text(receiptText).then((digest) => {
      if (active) setReceiptDigest(digest);
    });
    return () => {
      active = false;
    };
  }, [receiptText, stage]);

  function approveReplay() {
    setReplayConsentAt(new Date().toISOString());
    setActiveEventCount(1);
    setReceiptDigest(null);
    setByteVerification("idle");
    setStage("execution");
  }

  function restartAtApproval() {
    setReplayConsentAt(null);
    setActiveEventCount(0);
    setReceiptDigest(null);
    setByteVerification("idle");
    setStage("approval");
  }

  function downloadReceipt() {
    if (!receiptText || !receiptDigest) return;
    const blob = new Blob([receiptText], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function verifyPreparedBytes() {
    if (!receiptText || !receiptDigest) return;
    const actual = await sha256Text(receiptText);
    setByteVerification(actual === receiptDigest ? "match" : "mismatch");
  }

  const activeStage = STAGES.findIndex((item) => item.id === stage);
  const selectedEvent = WITNESSED_CRM_SPECIMEN.events[Math.max(0, activeEventCount - 1)];
  const saved = activeEventCount >= 4;

  return (
    <div className={styles.replay} data-ui-proof-id="witnessed-action-replay">
      <ol className={styles.stageRail} aria-label="Recorded action stages">
        {STAGES.map((item, index) => (
          <li key={item.id} data-active={item.id === stage} data-complete={index < activeStage}>
            <span>0{index + 1}</span>
            <strong>{item.label}</strong>
          </li>
        ))}
      </ol>

      {stage === "authority" ? (
        <section className={styles.stagePanel} aria-labelledby="witness-authority-heading">
          <p className={styles.kicker}>Recorded source run · bounded-computer 0.3.0</p>
          <h2 id="witness-authority-heading">Inspect the action contract</h2>
          <p className={styles.intro}>
            One catalogued mutation on a synthetic CRM. Original run authority is already recorded.
            A later visitor click can only start this replay.
          </p>
          <div className={styles.taskCard}>
            <span>Catalogued task</span>
            <strong>{WITNESSED_CRM_SPECIMEN.workflow.instruction}</strong>
          </div>
          <dl className={styles.factGrid}>
            <div><dt>Permitted application</dt><dd>Synthetic local CRM</dd></div>
            <div><dt>Permitted record</dt><dd>Acme (acme)</dd></div>
            <div><dt>Step ceiling</dt><dd>12 catalogued steps</dd></div>
            <div><dt>Engine metadata</dt><dd>bounded-computer · 0.3.0</dd></div>
            <div className={styles.wideFact}><dt>Specimen SHA-256</dt><dd><code>{WITNESSED_CRM_SPECIMEN_SHA256}</code></dd></div>
          </dl>
          <div className={styles.columns}>
            <article>
              <h3>Original run authority</h3>
              <p>
                Recorded for source run <code>{WITNESSED_CRM_SPECIMEN.originalRun.id}</code> and
                the exact Acme transition. This authority is not visitor replay consent.
              </p>
            </article>
            <article>
              <h3>Allowed operations</h3>
              <ul>{WITNESSED_CRM_SPECIMEN.boundary.cataloguedActions.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
            <article>
              <h3>Hard boundaries</h3>
              <ul>
                <li>No arbitrary sites or prompts</li>
                <li>No credentials or customer data</li>
                <li>No mutation of Globex or Initech</li>
                <li>No live execution from this page</li>
              </ul>
            </article>
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={() => setStage("approval")}>Continue to approval</button>
            <a href={WITNESSED_CRM_SPECIMEN_PATH}>Inspect specimen JSON</a>
          </div>
        </section>
      ) : null}

      {stage === "approval" ? (
        <section className={styles.stagePanel} aria-labelledby="witness-approval-heading">
          <p className={styles.kicker}>Proposal is not authority</p>
          <h2 id="witness-approval-heading">Approve the specimen replay</h2>
          <p className={styles.intro}>
            Original run authority already exists for this specimen. Your click is replay consent only.
          </p>
          <div className={styles.boundaryNotice}>
            <strong>Recorded specimen — approving starts the replay. No live system or record will be changed.</strong>
            <p>No live CRM record, credential, customer data, or model will be contacted.</p>
          </div>
          <div className={styles.columnsTwo}>
            <article>
              <h3>Original run authority</h3>
              <p>Recorded at {WITNESSED_CRM_SPECIMEN.recordedAt} for the catalogued Acme transition.</p>
            </article>
            <article>
              <h3>Visitor replay consent</h3>
              <p>Starts playback of recorded events. Does not authorize another execution or mutation.</p>
            </article>
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={approveReplay} data-ui-proof-id="approve-scope-and-replay">
              Approve scope and replay
            </button>
            <button type="button" className={styles.secondaryButton} onClick={() => setStage("authority")}>Return to contract</button>
          </div>
        </section>
      ) : null}

      {stage === "execution" ? (
        <section className={styles.stagePanel} aria-labelledby="witness-execution-heading">
          <p className={styles.kicker}>{selectedEvent?.command ?? "RECORDED"} · recorded event</p>
          <h2 id="witness-execution-heading">Watch the recorded execution</h2>
          <p className={styles.intro}>
            {saved ? "Visible success on the authorized record. Independent read-back follows." : "Replaying the fixed catalogued action sequence."}
          </p>
          <div className={styles.executionGrid}>
            <section className={styles.crm} aria-label="Synthetic CRM replay">
              <div className={styles.crmBar}>Synthetic CRM · recorded specimen</div>
              <div className={styles.crmBody}>
                <p className={styles.crmLabel}>Local proof of concept</p>
                <h3>Synthetic CRM</h3>
                <p>Fixed demonstration data. State exists only in this replay.</p>
                <StateList phase={saved ? "after" : "before"} />
                <div className={styles.accountDetail}>
                  <span>Account detail</span>
                  <strong>Acme</strong>
                  <p>Current status: <b>{saved ? "REVIEWED" : "NEW"}</b></p>
                  {saved ? <p className={styles.saved}>Saved Acme as REVIEWED.</p> : null}
                </div>
              </div>
            </section>
            <ol className={styles.eventLog} aria-label="Recorded event log">
              {WITNESSED_CRM_SPECIMEN.events.map((event, index) => (
                <li key={event.sequence} data-visible={index < activeEventCount} data-current={index === activeEventCount - 1}>
                  <span>0{event.sequence} · {event.command}</span>
                  <p>{event.observation}</p>
                </li>
              ))}
            </ol>
          </div>
          <button type="button" className={styles.secondaryButton} onClick={() => setStage("receipt")}>Skip to receipt</button>
        </section>
      ) : null}

      {stage === "receipt" && receipt ? (
        <section className={styles.stagePanel} id="receipt" aria-labelledby="witness-receipt-heading">
          <p className={styles.kicker}>PASS · Unsigned demonstration receipt</p>
          <h2 id="witness-receipt-heading">Inspect what happened</h2>
          <p className={styles.intro}>
            Acme changed from NEW to REVIEWED in the recorded source run. Replay consent was granted
            at {replayConsentAt}. No new execution occurred.
          </p>
          <p className={styles.limitation}>
            A recorded PASS on this synthetic workflow does not prove that a live agent, skill, or customer system is safe.
          </p>

          <div className={styles.evidenceGrid}>
            <article>
              <span>Declared</span><h3>Contract and authority</h3>
              <p>{WITNESSED_CRM_SPECIMEN.workflow.instruction}</p>
              <p>Visitor consent starts replay only; it authorizes no execution or mutation.</p>
            </article>
            <article>
              <span>Observed</span><h3>Recorded state and events</h3>
              <div className={styles.stateColumns}><StateList phase="before" /><StateList phase="after" /></div>
            </article>
            <article>
              <span>Verified</span><h3>Independent read-back</h3>
              <p>Fresh before/after application-state snapshots were compared with the task contract and save telemetry.</p>
              <ul>
                <li>Acme: NEW → REVIEWED</li>
                <li>Globex: unchanged</li>
                <li>Initech: unchanged</li>
                <li>No wrong-target or unauthorized mutation</li>
              </ul>
            </article>
            <article>
              <span>Unresolved</span><h3>What this cannot prove</h3>
              <ul>{WITNESSED_CRM_SPECIMEN.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
          </div>

          <section className={styles.receiptCard} aria-labelledby="download-receipt-heading">
            <div>
              <span>Unsigned demonstration receipt</span>
              <h3 id="download-receipt-heading">Download and verify</h3>
            </div>
            <dl>
              <div><dt>Filename</dt><dd><code>{filename}</code></dd></div>
              <div><dt>Format and schema</dt><dd>JSON UTF-8 · witnessops.demo-receipt.v1</dd></div>
              <div><dt>SHA-256 of generated bytes</dt><dd><code>{receiptDigest ?? "Calculating…"}</code></dd></div>
              <div><dt>Signed</dt><dd>false</dd></div>
              <div><dt>No new execution</dt><dd>true</dd></div>
            </dl>
            <p>
              The digest lets you confirm that the downloaded receipt has not changed relative to this published specimen. It does not authenticate the publisher or prove the underlying event independently.
            </p>
            <p>
              The browser verification hashes the exact bytes prepared for download. It does not read the saved disk file.
            </p>
            <pre>sha256sum {filename}</pre>
            <div className={styles.actions}>
              <button type="button" onClick={downloadReceipt} disabled={!receiptDigest}>Download demo receipt</button>
              <button type="button" className={styles.secondaryButton} onClick={() => void verifyPreparedBytes()} disabled={!receiptDigest}>
                Verify generated receipt bytes
              </button>
              <button type="button" className={styles.secondaryButton} onClick={restartAtApproval}>Replay from approval</button>
            </div>
            <p className={styles.byteResult} role="status" data-ui-proof-id="receipt-byte-verification">
              {byteVerification === "match" ? "The exact bytes prepared for download match the displayed digest." : null}
              {byteVerification === "mismatch" ? "The prepared bytes do not match the displayed digest." : null}
            </p>
          </section>

          <aside className={styles.paidCta}>
            <span>Agent Risk &amp; Control Review</span>
            <div><h3>Bring the real workflow.</h3><p>Review one consequential workflow’s authority, execution, evidence, controls, and unresolved gaps.</p></div>
            <Link href="/review/request?productId=WORKFLOW-S">Bring one real workflow →</Link>
          </aside>
        </section>
      ) : null}
    </div>
  );
}
