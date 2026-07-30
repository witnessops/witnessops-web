"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!response) {
      return;
    }
    document
      .getElementById("verify-result")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [response]);

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
    <div className="space-y-6">
      <section
        className="border border-surface-border bg-surface-bg p-5 sm:p-6"
        aria-labelledby="verify-input-heading"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="verify-input-heading"
              className="text-base font-semibold text-text-primary sm:text-lg"
            >
              Receipt input
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Upload a <code className="text-text-secondary">.json</code> file or
              paste receipt JSON.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center border border-surface-border bg-surface-card px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-primary transition-colors hover:border-brand-accent hover:text-brand-accent">
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
                className="inline-flex min-h-11 items-center border border-surface-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted transition-colors hover:border-brand-accent/50 hover:text-text-primary"
              >
                Try an example
              </button>
            ) : null}
          </div>
        </div>

        <label className="mt-4 block">
          <span className="sr-only">Paste receipt JSON</span>
          <textarea
            value={receiptInput}
            onChange={(event) => {
              setReceiptInput(event.target.value);
              setErrorHint(null);
            }}
            spellCheck={false}
            placeholder='Paste receipt JSON here…'
            className="min-h-[11rem] w-full resize-y border border-surface-border bg-[#0a0e17] p-4 font-mono text-xs leading-6 text-text-secondary outline-none transition-colors placeholder:text-text-muted/45 focus:border-brand-accent sm:min-h-[13rem]"
            aria-label="Paste receipt JSON"
          />
        </label>

        {errorHint ? (
          <p className="mt-3 text-sm text-signal-red" role="alert">
            {errorHint}
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="order-2 max-w-md text-xs leading-relaxed text-text-muted sm:order-1">
            Receipt JSON only. Proof-bundle ZIPs are not accepted on this page.
          </p>
          <button
            type="button"
            onClick={handleVerify}
            disabled={submitting}
            className="order-1 inline-flex min-h-11 w-full items-center justify-center border border-brand-accent bg-brand-accent px-5 py-3 text-sm font-semibold text-brand-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:order-2 sm:w-auto"
          >
            {submitting ? "Verifying…" : "Verify receipt"}
          </button>
        </div>
      </section>

      {response ? (
        <div id="verify-result" className="scroll-mt-24">
          <VerificationResult response={response} receiptMeta={meta} />
        </div>
      ) : null}
    </div>
  );
}

export default VerifyConsole;
