"use client";

import { useState } from "react";
import type {
  VerifyFixtureDefinition,
  VerifyResponse,
} from "@/lib/verify-contract";
import { VerificationResult } from "@/components/verify/verification-result";

interface VerifyConsoleProps {
  fixtures: VerifyFixtureDefinition[];
}

function buildLogs(response: VerifyResponse): string[] {
  if (!response.ok) {
    return [
      `> request rejected: ${response.failureClass}`,
      `> ${response.message}`,
    ];
  }

  const lines = [
    `> verdict: ${response.verdict}`,
    `> stage: claimed=${response.proofStageClaimed} verified=${response.proofStageVerified}`,
    `> scope: ${response.scope}`,
    `> artifact revalidation: ${response.artifactRevalidation}`,
  ];

  for (const check of response.checks) {
    lines.push(`> ${check.status}: ${check.name}${check.detail ? ` (${check.detail})` : ""}`);
  }

  if (response.breaches.length === 0) {
    lines.push("> no breaches reported");
  } else {
    for (const breach of response.breaches) {
      lines.push(`> breach: ${breach.code} (${breach.detail})`);
    }
  }

  return lines;
}

export function VerifyConsole({ fixtures }: VerifyConsoleProps) {
  const initialFixture = fixtures[0] ?? null;
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(
    initialFixture?.id ?? null,
  );
  const [receiptInput, setReceiptInput] = useState(initialFixture?.receiptInput ?? "");
  const [response, setResponse] = useState<VerifyResponse | null>(null);
  const [logs, setLogs] = useState<string[]>([
    "> paste a receipt JSON document or load a fixture",
  ]);
  const [submitting, setSubmitting] = useState(false);

  async function handleVerify() {
    setSubmitting(true);
    setResponse(null);
    setLogs([
      "> sending receipt to /api/verify",
      "> scope: receipt-first v1",
    ]);

    try {
      const verifyResponse = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt: receiptInput }),
      });

      const payload = (await verifyResponse.json()) as VerifyResponse;
      setResponse(payload);
      setLogs((current) => [...current, ...buildLogs(payload)]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "request failed";
      const failedResponse: VerifyResponse = {
        ok: false,
        failureClass: "FAILURE_INPUT_MALFORMED",
        message,
      };
      setResponse(failedResponse);
      setLogs((current) => [...current, ...buildLogs(failedResponse)]);
    } finally {
      setSubmitting(false);
    }
  }

  function handleLoadFixture(fixture: VerifyFixtureDefinition) {
    setSelectedFixtureId(fixture.id);
    setReceiptInput(fixture.receiptInput);
    setResponse(null);
    setLogs([
      `> loaded fixture: ${fixture.label}`,
      `> expected: ${fixture.expected.kind === "verification" ? fixture.expected.verdict : fixture.expected.failureClass}`,
    ]);
  }

  async function handleUploadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    setSelectedFixtureId(null);
    setReceiptInput(text);
    setResponse(null);
    setLogs([
      `> loaded file: ${file.name}`,
      "> ready to verify custom receipt input",
    ]);
    event.target.value = "";
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.08fr,0.92fr]">
      <section className="space-y-5 border border-surface-border bg-surface-bg p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              Verify Input
            </div>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              Paste receipt JSON, upload a `.json` file, or load a deterministic fixture.
            </p>
          </div>

          <label className="inline-flex cursor-pointer items-center border border-surface-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-primary transition-colors hover:border-brand-accent hover:text-brand-accent">
            Upload JSON
            <input
              type="file"
              accept=".json,application/json,text/json"
              className="sr-only"
              onChange={handleUploadFile}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {fixtures.map((fixture) => {
            const active = fixture.id === selectedFixtureId;
            return (
              <button
                key={fixture.id}
                type="button"
                onClick={() => handleLoadFixture(fixture)}
                className={`border px-3 py-2 text-left transition-colors ${
                  active
                    ? "border-brand-accent bg-brand-accent/10 text-brand-accent"
                    : "border-surface-border bg-surface-bg text-text-muted hover:border-brand-accent/40 hover:text-text-primary"
                }`}
              >
                <span className="block text-[11px] font-semibold uppercase tracking-[0.12em]">
                  {fixture.label}
                </span>
              </button>
            );
          })}
        </div>

        <textarea
          value={receiptInput}
          onChange={(event) => {
            setSelectedFixtureId(null);
            setReceiptInput(event.target.value);
          }}
          spellCheck={false}
          className="min-h-[28rem] w-full border border-surface-border bg-[#0a0e17] p-4 font-mono text-xs leading-6 text-text-secondary outline-none transition-colors focus:border-brand-accent"
          aria-label="Receipt JSON to verify"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs leading-relaxed text-text-muted">
            <code>/verify</code> v1 accepts receipt JSON only. Bundles, mixed payloads, and unsupported receipt classes fail closed.
          </p>

          <button
            type="button"
            onClick={handleVerify}
            disabled={submitting}
            className="inline-flex items-center border border-brand-accent bg-brand-accent px-4 py-3 text-sm font-semibold text-brand-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Verifying..." : "Verify Receipt"}
          </button>
        </div>
      </section>

      <div className="space-y-6">
        <section className="overflow-hidden border border-surface-border bg-surface-card">
          <div className="flex items-center gap-2 border-b border-surface-border px-4 py-2.5">
            <span className="size-3 rounded-full bg-signal-red/80" />
            <span className="size-3 rounded-full bg-signal-amber/80" />
            <span className="size-3 rounded-full bg-signal-green/80" />
            <span className="ml-2 text-xs text-text-muted">
              verify receipt
            </span>
          </div>
          <div className="max-h-[20rem] overflow-y-auto p-4">
            <pre className="font-mono text-xs leading-6 text-text-secondary">
              {logs.map((line, index) => (
                <span key={`${index}:${line}`} className="block whitespace-pre-wrap">
                  {line}
                </span>
              ))}
              {submitting ? (
                <span className="animate-pulse text-brand-accent">_</span>
              ) : null}
            </pre>
          </div>
        </section>

        {response ? <VerificationResult response={response} /> : null}
      </div>
    </div>
  );
}

export default VerifyConsole;
