"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { REVIEW_BRIEF_FIELDS, type ReviewBriefValues } from "@/lib/admin-review-brief";
import styles from "./admin.module.css";

export function AdminReviewBriefForm({ requestId, initial, version }: {
  requestId: string; initial: ReviewBriefValues; version: string;
}) {
  const router = useRouter();
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const [expectedVersion, setExpectedVersion] = useState(version);

  async function save(form: HTMLFormElement) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setFeedback(null);
    const data = new FormData(form);
    const body = Object.fromEntries(REVIEW_BRIEF_FIELDS.map(({ name }) => [name, String(data.get(name) ?? "")]));
    try {
      const response = await fetch(`/api/admin/core/review-requests/${requestId}/brief`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, expectedVersion, missingInformation: String(data.get("missingInformation") ?? "").split("\n").map((line) => line.trim()).filter(Boolean) }),
      });
      const result = await response.json() as { ok?: boolean; error?: string; version?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Could not save the brief. Your changes are still in the form.");
      if (result.version) setExpectedVersion(result.version);
      setFeedback({ error: false, text: "Qualification saved. No approval or message was sent." });
      router.refresh();
    } catch (error) {
      setFeedback({ error: true, text: error instanceof Error ? error.message : "Could not save the brief. Your changes are still in the form." });
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return <form className={styles.coreForm} aria-busy={busy} onSubmit={(event) => { event.preventDefault(); void save(event.currentTarget); }}>
    <p className={styles.coreFormNote}>Record the buyer’s event, expected result and next step. This brief does not approve a contract or confirm payment.</p>
    <div className={styles.briefFormGrid}>
      {REVIEW_BRIEF_FIELDS.map((field) => <label className={styles.briefField} key={field.name}>
        <span>{field.label}{field.required ? " (required)" : ""}</span>
        <textarea name={field.name} defaultValue={initial[field.name]} required={field.required} maxLength={4096} rows={2} disabled={busy} className={styles.queueComposerTextarea} />
      </label>)}
      <label className={styles.briefField}><span>Missing information (one item per line, up to 16)</span><textarea name="missingInformation" defaultValue={initial.missingInformation.join("\n")} rows={3} disabled={busy} className={styles.queueComposerTextarea} /></label>
    </div>
    <div className={styles.queueActionPrimaryRow}><button className={styles.rowAction} disabled={busy}>{busy ? "Saving…" : "Save qualification"}</button></div>
    {feedback ? <p role={feedback.error ? "alert" : "status"} className={feedback.error ? styles.queueWarning : styles.coreActionMessage}>{feedback.text}</p> : null}
  </form>;
}
