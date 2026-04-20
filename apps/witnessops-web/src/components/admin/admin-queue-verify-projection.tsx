"use client";

import { useState } from "react";

import styles from "./admin.module.css";

interface VerifyResult {
  intakeId: string;
  liveProjectionVersion: number;
  rebuiltEventSequence: number;
  match: boolean;
  invariantPass: boolean;
  mismatchFields: string[];
  reasonCodes: string[];
  checkedAt: string;
}

interface Props {
  intakeId: string;
}

export function AdminQueueVerifyProjection({ intakeId }: Props) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);

  async function verify() {
    setIsPending(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/admin/queue/verify-projection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intakeId }),
      });
      const payload = (await response.json().catch(() => null)) as
        | (VerifyResult & { error?: string })
        | { error?: string; reasonCodes?: string[] }
        | null;

      if (!response.ok) {
        const message = payload?.error ?? "Verification failed.";
        setError(message);
        return;
      }

      setResult(payload as VerifyResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className={styles.queueVerifyPanel}>
      <button
        type="button"
        className={styles.rowAction}
        onClick={() => void verify()}
        disabled={isPending}
      >
        {isPending ? "Verifying..." : "Verify projection"}
      </button>
      {error ? <div className={styles.queueActionError}>{error}</div> : null}
      {result ? (
        <div className={styles.queueVerifyResult}>
          <div>
            Match:{" "}
            <strong>{result.match && result.invariantPass ? "yes" : "no"}</strong>
          </div>
          <div>Projection version: {result.liveProjectionVersion}</div>
          <div>Event sequence: {result.rebuiltEventSequence}</div>
          {result.reasonCodes.length > 0 ? (
            <div>Reasons: {result.reasonCodes.join(" · ")}</div>
          ) : null}
          {result.mismatchFields.length > 0 ? (
            <div>Mismatch fields: {result.mismatchFields.join(" · ")}</div>
          ) : null}
          <div>Checked: {result.checkedAt.replace("T", " ").replace("Z", " UTC")}</div>
        </div>
      ) : null}
    </div>
  );
}
