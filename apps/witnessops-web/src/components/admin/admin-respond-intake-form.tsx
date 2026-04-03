"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import styles from "./admin.module.css";

interface AdminRespondIntakeFormProps {
  intakeId: string;
  defaultSubject: string;
  defaultBody: string;
}

export function AdminRespondIntakeForm(
  props: AdminRespondIntakeFormProps,
) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [subject, setSubject] = useState(props.defaultSubject);
  const [body, setBody] = useState(props.defaultBody);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function submitResponse() {
    setError("");

    const response = await fetch("/api/admin/intake/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intakeId: props.intakeId,
        subject,
        body,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Unable to send operator reply.");
      return;
    }

    setIsOpen(false);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className={styles.queueActionPanel}>
      <button
        type="button"
        className={styles.rowAction}
        onClick={() => {
          setError("");
          setIsOpen((current) => !current);
        }}
      >
        {isOpen ? "Cancel" : "Reply"}
      </button>

      {isOpen ? (
        <div className={styles.queueComposer}>
          <input
            className={styles.queueComposerInput}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Response subject"
            autoComplete="off"
            spellCheck={false}
          />
          <textarea
            className={styles.queueComposerTextarea}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={7}
            placeholder="Write the first external operator reply"
            spellCheck={false}
          />
          <div className={styles.queueComposerNote}>
            Sending this reply emits the first-response ledger event. The queue updates from that event, not from this form. If a first response already exists, re-submit returns the recorded evidence instead of sending a second email.
          </div>
          {error ? <div className={styles.queueActionError}>{error}</div> : null}
          <div className={styles.queueComposerFooter}>
            <button
              type="button"
              className={styles.rowAction}
              onClick={() => void submitResponse()}
              disabled={isPending || !subject.trim() || !body.trim()}
            >
              {isPending ? "Sending..." : "Send Reply"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
