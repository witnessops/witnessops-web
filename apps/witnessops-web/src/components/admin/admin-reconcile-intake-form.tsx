"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { DeliveryEvidenceSubcase } from "@/lib/server/reconciliation-subcases";

import styles from "./admin.module.css";

interface AdminReconcileIntakeFormProps {
  intakeId: string;
  defaultNote: string;
  evidenceSubcase?: DeliveryEvidenceSubcase | null;
  evidenceCaseLabel?: string | null;
}

export function AdminReconcileIntakeForm(
  props: AdminReconcileIntakeFormProps,
) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState(props.defaultNote);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function submitReconciliation() {
    setError("");

    const response = await fetch("/api/admin/intake/reconcile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intakeId: props.intakeId,
        evidenceSubcase: props.evidenceSubcase,
        note,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Unable to record reconciliation.");
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
        {isOpen ? "Cancel" : "Reconcile"}
      </button>

      {isOpen ? (
        <div className={styles.queueComposer}>
          <textarea
            className={styles.queueComposerTextarea}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={6}
            placeholder="Record the reconciliation decision"
            spellCheck={false}
          />
          <div className={styles.queueComposerNote}>
            This records a new reconciliation fact linked to the existing delivery evidence. It does not backfill INTAKE_RESPONDED or erase the original ambiguity.
          </div>
          {props.evidenceCaseLabel ? (
            <div className={styles.caseLabel}>
              Evidence case: {props.evidenceCaseLabel}
            </div>
          ) : null}
          {error ? <div className={styles.queueActionError}>{error}</div> : null}
          <div className={styles.queueComposerFooter}>
            <button
              type="button"
              className={styles.rowAction}
              onClick={() => void submitReconciliation()}
              disabled={isPending || !note.trim() || !props.evidenceSubcase}
            >
              {isPending ? "Recording..." : "Record Reconciliation"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
