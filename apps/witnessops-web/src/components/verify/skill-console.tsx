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
import styles from "./skill-console.module.css";

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
  if (verdict === "pass") return styles.verdictPass;
  if (verdict === "review") return styles.verdictReview;
  return styles.verdictFail;
}

function severityClass(severity: string): string {
  if (severity === "critical") return styles.severityCritical;
  if (severity === "high") return styles.severityHigh;
  return styles.severityDefault;
}

export type ExactSkillBinding = {
  slug: string;
  version: string;
  sha256: string;
};

type SkillConsoleProps = {
  initialContent?: string;
  initialSourceName?: string;
  initialBinding?: ExactSkillBinding | null;
};

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function SkillConsole({
  initialContent = "",
  initialSourceName = "SKILL.md",
  initialBinding = null,
}: SkillConsoleProps) {
  const fileInputId = useId();
  const [content, setContent] = useState(initialContent);
  const [sourceName, setSourceName] = useState(initialSourceName);
  const [exactBinding, setExactBinding] = useState<ExactSkillBinding | null>(initialBinding);
  const [inputSha256, setInputSha256] = useState<string | null>(
    initialBinding?.sha256 ?? null,
  );
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

  async function verify(nextContent = content, nextPolicy = policyId, nextName = sourceName) {
    setBusy(true);
    setCopyState("idle");
    try {
      setInputSha256(await sha256(nextContent));
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
    setExactBinding(null);
    setInputSha256(null);
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
  const contentBytes = new TextEncoder().encode(content).byteLength;
  const verdictLabel = result
    ? result.verdict === "review"
      ? "Review required"
      : result.verdict === "pass"
        ? "Pass"
        : "Fail"
    : null;

  return (
    <div className={styles.console} data-ui-proof-id="skill-console">
      <div className={styles.consoleHeader}>
        <div>
          <p>Evaluation workspace</p>
          <h2>Check one declared skill</h2>
        </div>
        <span>Local · deterministic · no account</span>
      </div>

      <section
        className={styles.inputPanel}
        aria-labelledby="skill-input-heading"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        data-ui-proof-id="skill-input"
      >
        <div className={styles.inputHeader}>
          <div className={styles.inputTitle}>
            <span>01</span>
            <div>
              <h2 id="skill-input-heading">
                Provide the SKILL.md
              </h2>
              <p id="skill-input-guidance">
                Paste below, choose a local file, or drop it into this workspace.
                The content stays in this browser.
              </p>
            </div>
          </div>
          <label
            htmlFor={fileInputId}
            className={styles.fileButton}
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

        <label className={styles.editorShell}>
          <span className="sr-only">Paste SKILL.md</span>
          <span className={styles.editorBar} aria-hidden="true">
            <span>{sourceName}</span>
            <span>{contentBytes} / {SKILL_MAX_BYTES} bytes</span>
          </span>
          <textarea
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              setSourceName("SKILL.md");
              setExactBinding(null);
              setInputSha256(null);
              setOutcome(null);
            }}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            placeholder="Paste SKILL.md here…"
            className={styles.editor}
            aria-label="Paste SKILL.md"
            aria-describedby="skill-input-guidance"
          />
        </label>

        <div className={styles.controlRow}>
          <label className={styles.policyControl}>
            <span>
              <b>02</b>
              Select policy
            </span>
            <select
              value={policyId}
              onChange={(event) => {
                const next = event.target.value as SkillPolicyId;
                setPolicyId(next);
                if (content.trim()) void verify(content, next, sourceName);
              }}
              className={styles.policySelect}
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
            onClick={() => void verify()}
            disabled={busy}
            className={styles.verifyButton}
            data-ui-proof-id="skill-verify-button"
          >
            {busy ? "Checking…" : "Verify"}
          </button>
        </div>

        <div className={styles.inputBoundary}>
          <span>Declared instructions only</span>
          <span>No upload</span>
          <span>No model call</span>
        </div>

        {exactBinding ? (
          <div className={styles.exactBinding} data-ui-proof-id="skill-exact-version-binding">
            <div>
              <span>Exact library version</span>
              <strong>{exactBinding.slug}@{exactBinding.version}</strong>
            </div>
            <code>{exactBinding.sha256}</code>
          </div>
        ) : initialBinding ? (
          <p className={styles.bindingInvalidated} role="status">
            Exact-version binding removed because the input changed.
          </p>
        ) : null}
      </section>

      {outcome && !outcome.ok ? (
        <div className={styles.errorState} role="alert">
          <span>Input not evaluated</span>
          <p>{outcome.message} This is not a pass.</p>
        </div>
      ) : null}

      {outcome?.ok ? (
        <section
          id="skill-result"
          className={styles.resultSection}
          aria-live="polite"
          data-ui-proof-id="skill-result"
        >
          <div className={`${styles.verdictCard} ${verdictClass(outcome.result.verdict)}`}>
            <div className={styles.verdictStatus}>
              <p>Policy result</p>
              <strong>{verdictLabel}</strong>
              <span>Bounded result · not a safety verdict</span>
            </div>
            <div className={styles.verdictSummary}>
              <p>
                {outcome.result.verdict === "pass"
                  ? SKILL_PASS_SUMMARY
                  : outcome.result.verdict === "review"
                    ? "Review required under the selected policy."
                    : "Governed patterns were detected under the selected policy."}
              </p>
              {outcome.result.verdict === "pass" ? (
                <p className={styles.resultLimitation}>
                  No governed pattern was detected under the selected policy. This does not prove
                  that the skill or resulting workflow is safe.
                </p>
              ) : null}
              <code>
                {AEGIS_VERIFIER_ID} · policy {outcome.result.policyId}
              </code>
              {inputSha256 ? <code>input sha256:{inputSha256}</code> : null}
            </div>
          </div>

          <div className={styles.findingsSection}>
            <div className={styles.findingsHeader}>
              <div>
                <p>03</p>
                <h3>Inspect findings</h3>
              </div>
              <span>{visibleFindings.length} shown</span>
            </div>
            {visibleFindings.length === 0 ? (
              <p className={styles.noFindings}>No governed pattern was detected.</p>
            ) : (
              <ul className={styles.findingsList}>
                {visibleFindings.map((finding) => (
                  <li key={finding.id}>
                    <details>
                      <summary>
                        <span className={`${styles.severity} ${severityClass(finding.severity)}`}>
                          {finding.severity}
                        </span>
                        <span className={styles.findingTitle}>{finding.title}</span>
                        <span className={styles.disclosureLabel}>Inspect</span>
                      </summary>
                      <div className={styles.findingBody}>
                        <p className={styles.findingMeta}>
                          <code>{finding.ruleId}</code>
                          {" · "}
                          {finding.category}
                          {finding.evidence
                            ? ` · ${finding.evidence.path}:${finding.evidence.line}`
                            : null}
                          {finding.documentary ? " · documentary/example" : " · operational"}
                        </p>
                        <p className={styles.findingReason}>Reason: {finding.detail}</p>
                        {finding.evidence?.snippet ? (
                          <pre className={styles.evidenceSnippet}>
                            {finding.evidence.snippet}
                          </pre>
                        ) : null}
                        {finding.evidence?.original &&
                        finding.evidence.original !== finding.evidence.snippet ? (
                          <p>
                            Original:{" "}
                            <code>{finding.evidence.original}</code>
                          </p>
                        ) : null}
                        {finding.evidence?.normalized ? (
                          <p>
                            Canonical:{" "}
                            <code>{finding.evidence.normalized}</code>
                          </p>
                        ) : null}
                        {finding.evidence?.transform ? (
                          <p>Fold: {finding.evidence.transform}</p>
                        ) : null}
                        {finding.evidence?.components ? (
                          <ul className={styles.componentsList}>
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
              <p className={styles.extraFindings}>
                {extraFindings} additional findings are in the Markdown report.
              </p>
            ) : null}
          </div>

          <div className={styles.reportActions}>
            <div>
              <p>04</p>
              <span>Keep the report</span>
            </div>
            <button
              type="button"
              onClick={() => copyReport(outcome.report)}
              className={styles.reportButton}
              data-ui-proof-id="skill-copy-report"
            >
              {copyState === "copied" ? "Copied" : "Copy Markdown"}
            </button>
            <button
              type="button"
              onClick={() => downloadReport(outcome.report)}
              className={styles.reportButton}
              data-ui-proof-id="skill-download-report"
            >
              Download .md
            </button>
            <span className={styles.copyStatus} aria-live="polite">
              {copyState === "failed" ? "Clipboard unavailable. Download the report instead." : ""}
            </span>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default SkillConsole;
