"use client";

import { useEffect, useId, useState } from "react";
import {
  DEFAULT_SKILL_POLICY_ID,
  SKILL_POLICY_PACKS,
  type SkillPolicyId,
} from "@/lib/skill-verify/policies";
import {
  AEGIS_VERIFIER_ID,
  SKILL_MAX_BYTES,
  SKILL_PASS_SUMMARY,
  runSkillScan,
  type SkillScanOutcome,
  type SkillScanResult,
} from "@/lib/skill-verify/run-scan";

const ACCEPTED_EXTENSIONS = [".md", ".markdown", ".txt"];

function isAcceptedSkillFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) return true;
  return (
    file.type === "text/markdown" ||
    file.type === "text/plain" ||
    file.type === "text/x-markdown"
  );
}

function verdictClass(verdict: SkillScanResult["verdict"]): string {
  if (verdict === "pass") return "text-signal-green border-signal-green/40";
  if (verdict === "review") return "text-signal-amber border-signal-amber/40";
  return "text-signal-red border-signal-red/40";
}

function severityClass(severity: string): string {
  if (severity === "critical") return "text-signal-red";
  if (severity === "high") return "text-signal-amber";
  return "text-text-secondary";
}

export function SkillConsole() {
  const fileInputId = useId();
  const [content, setContent] = useState("");
  const [sourceName, setSourceName] = useState("SKILL.md");
  const [policyId, setPolicyId] = useState<SkillPolicyId>(DEFAULT_SKILL_POLICY_ID);
  const [outcome, setOutcome] = useState<SkillScanOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (!outcome) return;
    document
      .getElementById("skill-result")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [outcome]);

  function verify(nextContent = content, nextPolicy = policyId, nextName = sourceName) {
    setBusy(true);
    setCopyState("idle");
    try {
      setOutcome(
        runSkillScan({
          content: nextContent,
          policyId: nextPolicy,
          sourceName: nextName,
        }),
      );
    } finally {
      setBusy(false);
    }
  }

  async function loadLocalFile(file: File) {
    if (!isAcceptedSkillFile(file) || file.size > SKILL_MAX_BYTES) {
      setOutcome({
        ok: false,
        code: file.size > SKILL_MAX_BYTES ? "OVERSIZED" : "UNSUPPORTED_FILE",
        message:
          file.size > SKILL_MAX_BYTES
            ? `This file is larger than ${SKILL_MAX_BYTES} bytes. Trim the skill and try again.`
            : "Only local Markdown or plain-text SKILL.md files are accepted.",
      });
      return;
    }
    const text = await file.text();
    setContent(text);
    setSourceName(file.name || "SKILL.md");
    setOutcome(null);
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await loadLocalFile(file);
  }

  function handleDragOver(event: React.DragEvent<HTMLElement>) {
    if (!Array.from(event.dataTransfer.types).includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  async function handleDrop(event: React.DragEvent<HTMLElement>) {
    if (!Array.from(event.dataTransfer.types).includes("Files")) return;
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) await loadLocalFile(file);
  }

  async function copyReport(report: string) {
    try {
      await navigator.clipboard.writeText(report);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  function downloadReport(report: string) {
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "aegis-skill-report.md";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const result = outcome?.ok ? outcome.result : null;
  const visibleFindings = result?.findings.slice(0, 50) ?? [];
  const extraFindings = result ? Math.max(0, result.findings.length - visibleFindings.length) : 0;

  return (
    <div className="space-y-6">
      <section
        className="border border-surface-border bg-surface-bg p-5 sm:p-6"
        aria-labelledby="skill-input-heading"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="skill-input-heading"
              className="text-base font-semibold text-text-primary sm:text-lg"
            >
              SKILL.md input
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Paste below, choose a local file, or drop one in this panel. Stays
              in this browser. No account, history, or upload.
            </p>
          </div>
          <label
            htmlFor={fileInputId}
            className="inline-flex min-h-11 cursor-pointer items-center border border-surface-border bg-surface-card px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-primary transition-colors hover:border-brand-accent hover:text-brand-accent"
          >
            Choose local file
            <input
              id={fileInputId}
              type="file"
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              className="sr-only"
              onChange={handleUpload}
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="sr-only">Paste SKILL.md</span>
          <textarea
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              setSourceName("SKILL.md");
              setOutcome(null);
            }}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            placeholder="Paste SKILL.md here…"
            className="min-h-[14rem] w-full resize-y border border-surface-border bg-[#0a0e17] p-4 font-mono text-xs leading-6 text-text-secondary outline-none transition-colors placeholder:text-text-muted/45 focus:border-brand-accent"
            aria-label="Paste SKILL.md"
          />
        </label>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="block text-sm">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
              Policy
            </span>
            <select
              value={policyId}
              onChange={(event) => {
                const next = event.target.value as SkillPolicyId;
                setPolicyId(next);
                if (content.trim()) verify(content, next, sourceName);
              }}
              className="min-h-11 w-full border border-surface-border bg-surface-card px-3 text-sm text-text-primary sm:min-w-[16rem]"
              aria-label="Aegis policy pack"
            >
              {SKILL_POLICY_PACKS.map((pack) => (
                <option key={pack.id} value={pack.id}>
                  {pack.name} — {pack.tagline}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => verify()}
            disabled={busy}
            className="inline-flex min-h-11 w-full items-center justify-center border border-brand-accent bg-brand-accent px-5 py-3 text-sm font-semibold text-brand-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {busy ? "Checking…" : "Verify"}
          </button>
        </div>
      </section>

      {outcome && !outcome.ok ? (
        <p className="border border-signal-red/40 bg-surface-card px-5 py-4 text-sm text-signal-red" role="alert">
          {outcome.message} This is not a pass.
        </p>
      ) : null}

      {outcome?.ok ? (
        <section id="skill-result" className="scroll-mt-24 space-y-5" aria-live="polite">
          <div className={`border bg-surface-card px-5 py-5 ${verdictClass(outcome.result.verdict)}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">
              {outcome.result.verdict}
            </p>
            <p className="mt-2 text-xl font-semibold text-text-primary">
              {outcome.result.verdict === "pass"
                ? SKILL_PASS_SUMMARY
                : outcome.result.verdict === "review"
                  ? "Review required under the selected policy."
                  : "Governed patterns were detected under the selected policy."}
            </p>
            <p className="mt-3 text-xs text-text-muted">
              {AEGIS_VERIFIER_ID} · policy {outcome.result.policyId}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-text-muted">
              Findings
            </h3>
            {visibleFindings.length === 0 ? (
              <p className="mt-3 text-sm text-text-secondary">No findings.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {visibleFindings.map((finding) => (
                  <li key={finding.id} className="border border-surface-border bg-surface-bg">
                    <details>
                      <summary className="cursor-pointer px-4 py-3 text-sm text-text-primary">
                        <span className={`mr-2 font-semibold uppercase ${severityClass(finding.severity)}`}>
                          {finding.severity}
                        </span>
                        {finding.title}
                      </summary>
                      <div className="space-y-3 border-t border-surface-border px-4 py-4 text-sm leading-relaxed text-text-muted">
                        <p>
                          <code className="text-text-secondary">{finding.ruleId}</code>
                          {" · "}
                          {finding.category}
                          {finding.evidence
                            ? ` · ${finding.evidence.path}:${finding.evidence.line}`
                            : null}
                          {finding.documentary ? " · documentary/example" : " · operational"}
                        </p>
                        <p className="text-text-secondary">Reason: {finding.detail}</p>
                        {finding.evidence?.snippet ? (
                          <pre className="overflow-x-auto bg-[#0a0e17] p-3 font-mono text-xs text-text-secondary">
                            {finding.evidence.snippet}
                          </pre>
                        ) : null}
                        {finding.evidence?.original &&
                        finding.evidence.original !== finding.evidence.snippet ? (
                          <p>
                            Original:{" "}
                            <code className="text-text-secondary">{finding.evidence.original}</code>
                          </p>
                        ) : null}
                        {finding.evidence?.normalized ? (
                          <p>
                            Canonical:{" "}
                            <code className="text-text-secondary">{finding.evidence.normalized}</code>
                          </p>
                        ) : null}
                        {finding.evidence?.transform ? (
                          <p>Fold: {finding.evidence.transform}</p>
                        ) : null}
                        {finding.evidence?.components ? (
                          <ul className="space-y-1">
                            <li>Source: {finding.evidence.components.source}</li>
                            <li>Transfer: {finding.evidence.components.action}</li>
                            <li>Destination: {finding.evidence.components.destination}</li>
                          </ul>
                        ) : null}
                        <p>Remediation: {finding.remediation}</p>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
            {extraFindings > 0 ? (
              <p className="mt-3 text-xs text-text-muted">
                {extraFindings} additional findings are in the Markdown report.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copyReport(outcome.report)}
              className="inline-flex min-h-11 items-center border border-surface-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-primary hover:border-brand-accent"
            >
              {copyState === "copied" ? "Copied" : "Copy Markdown"}
            </button>
            <button
              type="button"
              onClick={() => downloadReport(outcome.report)}
              className="inline-flex min-h-11 items-center border border-surface-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-primary hover:border-brand-accent"
            >
              Download .md
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default SkillConsole;
