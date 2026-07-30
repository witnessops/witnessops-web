"use client";

import { useState } from "react";
import type { VerifyResponse } from "@/lib/verify-contract";
import {
  extractReceiptMeta,
  type ReceiptMeta,
} from "@/lib/verify-receipt-meta";
import { VerificationResult } from "@/components/verify/verification-result";

interface VerifyConsoleProps {
  /** Known-good sample receipt JSON for the single “Try an example” action. */
  exampleReceipt?: string | null;
}

export function VerifyConsole({ exampleReceipt = null }: VerifyConsoleProps) {
  const [receiptInput, setReceiptInput] = useState("");
  const [response, setResponse] = useState<VerifyResponse | null>(null);
  const [meta, setMeta] = useState<ReceiptMeta>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorHint, setErrorHint] = useState<string | null>(null);

  async function handleVerify() {
    const trimmed = receiptInput.trim();
    if (!trimmed) {
      setErrorHint("Paste receipt JSON or upload a file first.");
      return;
    }

    setSubmitting(true);
    setResponse(null);
    setErrorHint(null);
    setMeta(extractReceiptMeta(trimmed));

    try {
      const verifyResponse = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt: trimmed }),
      });

      const payload = (await verifyResponse.json()) as VerifyResponse;
      setResponse(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      setResponse({
        ok: false,
        failureClass: "FAILURE_INPUT_MALFORMED",
        message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleTryExample() {
    if (!exampleReceipt) {
      return;
    }
    setReceiptInput(exampleReceipt);
    setResponse(null);
    setErrorHint(null);
    setMeta({});
  }

  async function handleUploadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    setReceiptInput(text);
    setResponse(null);
    setErrorHint(null);
    setMeta({});
    event.target.value = "";
  }

  return (
    <div className="space-y-8">
      <section className="border border-surface-border bg-surface-bg p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Receipt input
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Upload a <code className="text-text-secondary">.json</code> receipt
              or paste the JSON below.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center border border-surface-border bg-surface-card px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-primary transition-colors hover:border-brand-accent hover:text-brand-accent">
              Upload receipt
              <input
                type="file"
                accept=".json,application/json,text/json"
                className="sr-only"
                onChange={handleUploadFile}
              />
            </label>
            {exampleReceipt ? (
              <button
                type="button"
                onClick={handleTryExample}
                className="inline-flex items-center border border-surface-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted transition-colors hover:border-brand-accent/50 hover:text-text-primary"
              >
                Try an example
              </button>
            ) : null}
          </div>
        </div>

        <label className="mt-5 block">
          <span className="sr-only">Paste receipt JSON</span>
          <textarea
            value={receiptInput}
            onChange={(event) => {
              setReceiptInput(event.target.value);
              setErrorHint(null);
            }}
            spellCheck={false}
            placeholder='{"receipt_id":"…", …}'
            className="min-h-[12rem] w-full border border-surface-border bg-[#0a0e17] p-4 font-mono text-xs leading-6 text-text-secondary outline-none transition-colors placeholder:text-text-muted/50 focus:border-brand-accent sm:min-h-[14rem]"
            aria-label="Paste receipt JSON"
          />
        </label>

        {errorHint ? (
          <p className="mt-3 text-sm text-signal-red" role="alert">
            {errorHint}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-xs leading-relaxed text-text-muted">
            Only receipt JSON is accepted here. Proof-bundle ZIPs and other
            package formats are not verified on this page.
          </p>
          <button
            type="button"
            onClick={handleVerify}
            disabled={submitting}
            className="inline-flex items-center border border-brand-accent bg-brand-accent px-5 py-3 text-sm font-semibold text-brand-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Verifying…" : "Verify receipt"}
          </button>
        </div>
      </section>

      {response ? (
        <VerificationResult response={response} receiptMeta={meta} />
      ) : null}
    </div>
  );
}

export default VerifyConsole;
