"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { PUBLIC_NO_SECRETS_NOTE } from "@/lib/public-contact";
import {
  supportResponseSchema,
  verifyTokenResponseSchema,
  type SupportResponse,
} from "@/lib/token-contract";
import { formatVerificationCode } from "@/lib/verification-code-format";

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
};

const label: React.CSSProperties = {
  ...mono,
  fontSize: 9,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--color-brand-muted)",
  display: "block",
  marginBottom: 6,
};

const inputClass =
  "w-full bg-transparent border-0 border-b border-surface-border text-text-primary placeholder:text-brand-muted focus:border-brand-accent focus:outline-none py-2";

const selectClass =
  "w-full bg-transparent border-0 border-b border-surface-border text-text-primary focus:border-brand-accent focus:outline-none py-2 pr-10 cursor-pointer";

const inputFont: React.CSSProperties = {
  ...mono,
  fontSize: 13,
  letterSpacing: "0.03em",
};

function verificationErrorMessage(value: unknown): string {
  const message =
    value && typeof value === "object" && "error" in value &&
    typeof value.error === "string"
      ? value.error.toLowerCase()
      : "";
  if (message.includes("expired")) {
    return "This verification code has expired. Start over to request a new code.";
  }
  if (message.includes("mismatch")) {
    return "That verification code did not match. Check the email and try again.";
  }
  return "Verification failed. Check the code and try again.";
}

function SelectChevron() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"
      style={{ color: "var(--color-brand-muted)" }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M3 4.5L6 7.5L9 4.5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/** Simple doc search index — matches against docs titles */
const KB_ENTRIES = [
  { title: "Governed Execution", href: "/docs/security-systems/governed-execution" },
  { title: "Policy Gates", href: "/docs/security-systems/policy-gates" },
  { title: "Threat Model", href: "/docs/security-systems/threat-model" },
  { title: "Security Practices", href: "/docs/security-systems/security-practices" },
  { title: "Receipts", href: "/docs/evidence/receipts" },
  { title: "Receipt Spec", href: "/docs/evidence/receipt-spec" },
  { title: "Execution Chains", href: "/docs/evidence/execution-chains" },
  { title: "Authorization Model", href: "/docs/governance/authorization-model" },
  { title: "Is This In Scope?", href: "/docs/decisions/scope-check" },
  { title: "Do I Need to Escalate?", href: "/docs/decisions/escalation" },
  { title: "What Evidence Is Required?", href: "/docs/decisions/evidence-required" },
  { title: "Runbooks", href: "/docs/operations/runbooks" },
  { title: "Phishing Investigation", href: "/docs/scenarios/phishing-investigation" },
  { title: "Sensitive Artifact Handling", href: "/docs/evidence/sensitive-artifact-handling" },
  { title: "FAQ", href: "/docs/faq" },
  { title: "Getting Started", href: "/docs/getting-started" },
  { title: "Glossary", href: "/docs/glossary" },
];

export function SupportIntake({ supportEmail }: { supportEmail: string }) {
  const [status, setStatus] = useState<
    | "idle"
    | "form"
    | "sending"
    | "verification_sent"
    | "verifying"
    | "verified"
    | "submission_error"
    | "verification_error"
  >("idle");
  const [email, setEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof KB_ENTRIES>([]);
  const [supportResponse, setSupportResponse] = useState<SupportResponse | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const verificationHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") !== "1") return;

    const intakeId = params.get("intakeId");
    const stored = window.sessionStorage.getItem("witnessops-support-verified");
    if (!intakeId || !stored) return;

    try {
      const confirmation = JSON.parse(stored) as { intakeId?: string };
      if (confirmation.intakeId === intakeId) {
        setStatus("verified");
      }
    } catch {
      window.sessionStorage.removeItem("witnessops-support-verified");
    }
  }, []);

  useEffect(() => {
    if (status === "verification_sent" || status === "verification_error") {
      verificationHeadingRef.current?.focus();
    }
  }, [status]);

  // Search KB as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = KB_ENTRIES.filter(
      (e) => e.title.toLowerCase().includes(q)
    ).slice(0, 5);
    setSearchResults(matches);
  }, [searchQuery]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          subject: `[${data.get("category")}] ${(data.get("description") as string)?.slice(0, 80)}`,
          category: data.get("category"),
          severity: data.get("severity"),
          message: data.get("description"),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(
          res.status >= 500
            ? "The verification email could not be sent. Your request may be stored for reconciliation, but it is not yet in the operator queue. Retry or email support directly."
            : (err.error ?? "Failed to submit"),
        );
      }

      const payload = supportResponseSchema.safeParse(
        await res.json().catch(() => null),
      );
      if (!payload.success) {
        throw new Error(
          "Your request may have been stored, but the verification response was incomplete. Email support with the time of submission so it can be reconciled.",
        );
      }

      setSupportResponse(payload.data);
      setEmail(payload.data.email);
      setVerificationCode("");
      setStatus("verification_sent");
    } catch (err) {
      setStatus("submission_error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to submit.");
    }
  }

  async function handleVerification(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supportResponse) return;

    setStatus("verifying");
    setErrorMsg("");

    try {
      const response = await fetch("/api/verify-token", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issuanceId: supportResponse.issuanceId,
          email: supportResponse.email,
          token: verificationCode,
        }),
      });
      const rawPayload = await response.json().catch(() => null);
      const payload = verifyTokenResponseSchema.safeParse(rawPayload);

      if (
        !response.ok ||
        !payload.success ||
        payload.data.channel !== "support" ||
        payload.data.status !== "verified" ||
        payload.data.admissionState !== "admitted"
      ) {
        throw new Error(verificationErrorMessage(rawPayload));
      }

      window.sessionStorage.setItem(
        "witnessops-support-verified",
        JSON.stringify({ intakeId: payload.data.intakeId }),
      );
      window.location.assign(payload.data.postVerifyPath);
    } catch (err) {
      setStatus("verification_error");
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Verification failed. Check the code and try again.",
      );
    }
  }

  return (
    <div className="border border-surface-border">
      {/* Header */}
      <div
        className="flex items-center justify-between border-b border-surface-border px-5 py-3"
        style={{ background: "var(--color-surface-bg-alt)" }}
      >
        <span style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
          Support
        </span>
        <span style={{
          ...mono, fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", padding: "2px 8px",
          border: "1px solid",
          borderColor: status === "verified" ? "rgba(0,212,126,0.3)" : status.endsWith("_error") ? "rgba(239,68,68,0.3)" : "var(--color-surface-border)",
          color: status === "verified" ? "var(--color-signal-green)" : status.endsWith("_error") ? "var(--color-signal-red)" : "var(--color-brand-muted)",
        }}>
          {status === "verified" ? "VERIFIED" : status.endsWith("_error") ? "ERROR" : status === "verification_sent" || status === "verifying" ? "VERIFY EMAIL" : "EMAIL SUPPORT"}
        </span>
      </div>

      <div className="p-5">

        {/* ── STEP 1: Email ── */}
        {status === "idle" && (
          <div>
            <label htmlFor="si-email" style={label}>Work email</label>
            <input
              id="si-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              style={inputFont}
              placeholder="you@company.com"
              autoComplete="email"
            />

            {/* Knowledge search */}
            <div className="mt-5">
              <label htmlFor="si-search" style={label}>Search docs first</label>
              <input
                ref={searchRef}
                id="si-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={inputClass}
                style={inputFont}
                placeholder="receipt verification, scope, policy gate..."
                autoComplete="off"
              />

              {searchResults.length > 0 && (
                <div className="mt-2 border border-surface-border">
                  {searchResults.map((r) => (
                    <Link
                      key={r.href}
                      href={r.href}
                      className="flex items-center justify-between px-4 py-2 border-b border-surface-border/50 transition-colors hover:bg-surface-card last:border-b-0"
                      style={{ ...mono, fontSize: 11, color: "var(--color-text-secondary)" }}
                    >
                      <span>{r.title}</span>
                      <span style={{ fontSize: 9, color: "var(--color-brand-muted)" }}>→ DOCS</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => { if (email.trim()) setStatus("form"); }}
              disabled={!email.trim()}
              className="mt-5 w-full py-3 border border-surface-border text-text-muted disabled:opacity-30 transition-all hover:border-brand-accent/40 hover:text-text-primary"
              style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}
            >
              Still need help? Email support
            </button>
            <p className="mt-3 text-xs leading-6 text-text-muted">
              For a new bounded review, use{" "}
              <Link
                href="/review/request"
                className="font-semibold text-brand-accent underline-offset-4 hover:underline"
              >
                Start a review
              </Link>
              . Vulnerabilities go to{" "}
              <a
                href="mailto:security@witnessops.com?subject=Private%20vulnerability%20report"
                className="font-semibold text-brand-accent underline-offset-4 hover:underline"
              >
                security@witnessops.com
              </a>
              .
            </p>
          </div>
        )}

        {/* ── STEP 2: Ticket form ── */}
        {(status === "form" || status === "sending" || status === "submission_error") && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email locked */}
            <div className="flex items-center justify-between border-b border-surface-border pb-2">
              <span style={{ ...mono, fontSize: 11, color: "var(--color-text-secondary)" }}>{email}</span>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                style={{ ...mono, fontSize: 9, color: "var(--color-brand-muted)", letterSpacing: "0.08em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer" }}
              >
                Change
              </button>
            </div>

            {/* Description first (Palo Alto pattern) */}
            <div>
              <label htmlFor="si-desc" style={label}>Describe what&apos;s happening</label>
              <textarea
                id="si-desc"
                name="description"
                required
                rows={4}
                className="w-full bg-transparent border border-surface-border text-text-primary placeholder:text-brand-muted focus:border-brand-accent focus:outline-none p-3"
                style={{ ...inputFont, resize: "vertical", lineHeight: 1.6 }}
                placeholder="What you expected, what happened instead, and any receipt IDs or error messages..."
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="si-cat" style={label}>What do you need help with?</label>
              <div className="relative">
                <select
                  id="si-cat"
                  name="category"
                  required
                  defaultValue=""
                  className={selectClass}
                  style={{
                    ...inputFont,
                    backgroundColor: "rgba(255,255,255,0.01)",
                    appearance: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    colorScheme: "dark",
                  }}
                >
                  <option value="" disabled>Select a category</option>
                  <option value="receipt">Receipt verification</option>
                  <option value="scope">Scope or policy gate</option>
                  <option value="evidence">Evidence or artifact</option>
                  <option value="access">Access or authentication</option>
                  <option value="security">Security concern (not a vulnerability report)</option>
                  <option value="other">Other</option>
                </select>
                <SelectChevron />
              </div>
            </div>

            {/* Severity — business impact language */}
            <div>
              <label htmlFor="si-sev" style={label}>How is this affecting you?</label>
              <div className="relative">
                <select
                  id="si-sev"
                  name="severity"
                  required
                  defaultValue=""
                  className={selectClass}
                  style={{
                    ...inputFont,
                    backgroundColor: "rgba(255,255,255,0.01)",
                    appearance: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    colorScheme: "dark",
                  }}
                >
                  <option value="" disabled>Select impact</option>
                  <option value="general">I&apos;m investigating (General)</option>
                  <option value="elevated">A system is degraded (Elevated)</option>
                  <option value="urgent">Production is impaired (Urgent)</option>
                  <option value="critical">Production is down (Critical)</option>
                </select>
                <SelectChevron />
              </div>
            </div>

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full py-3 text-text-inverse bg-brand-accent disabled:opacity-50 transition-all hover:brightness-110 hover:shadow-[0_0_24px_rgba(255,107,53,0.3)] active:scale-[0.98]"
              style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" }}
            >
              {status === "sending" ? "Submitting..." : "Send Request"}
            </button>

            {status === "submission_error" && (
              <div role="alert" className="border-l-2 border-brand-accent px-3 py-2 text-left" style={{ ...mono, fontSize: 11, color: "var(--color-text-primary)", letterSpacing: "0.04em" }}>
                {errorMsg}
              </div>
            )}
          </form>
        )}

        {/* ── VERIFICATION ── */}
        {supportResponse && (status === "verification_sent" || status === "verifying" || status === "verification_error") && (
          <form
            onSubmit={handleVerification}
            className="space-y-5"
            aria-busy={status === "verifying"}
          >
            <div role="status" aria-live="polite" aria-atomic="true">
              <h2
                ref={verificationHeadingRef}
                tabIndex={-1}
                className="text-lg font-semibold text-text-primary outline-none"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}
              >
                Verify your email
              </h2>
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                Your request is durably stored as <span style={mono}>{supportResponse.intakeId}</span>. We sent a verification code to {supportResponse.email}. It will enter the operator queue only after the code is verified.
              </p>
              <p className="mt-2 text-xs leading-5 text-text-muted">
                The code expires at {new Date(supportResponse.expiresAt).toLocaleString()}.
              </p>
            </div>

            <div>
              <label htmlFor="si-verification-code" style={label}>Verification code</label>
              <input
                id="si-verification-code"
                name="verification-code"
                value={verificationCode}
                onChange={(event) => {
                  setVerificationCode(formatVerificationCode(event.currentTarget.value));
                  if (status === "verification_error") {
                    setStatus("verification_sent");
                    setErrorMsg("");
                  }
                }}
                className={inputClass}
                style={inputFont}
                autoComplete="one-time-code"
                autoCapitalize="characters"
                spellCheck={false}
                inputMode="text"
                required
                maxLength={80}
                placeholder="ABCD-EFGH-JKLM"
              />
              <p className="mt-2 text-xs leading-5 text-text-muted">
                Enter the code exactly as shown in the email. Do not share it.
              </p>
            </div>

            {status === "verification_error" && (
              <div role="alert" className="border-l-2 border-brand-accent px-3 py-2" style={{ ...mono, fontSize: 11, color: "var(--color-text-primary)", letterSpacing: "0.04em" }}>
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "verifying" || !verificationCode.trim()}
              className="w-full py-3 text-text-inverse bg-brand-accent disabled:opacity-50 transition-all hover:brightness-110 hover:shadow-[0_0_24px_rgba(255,107,53,0.3)] active:scale-[0.98]"
              style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" }}
            >
              {status === "verifying" ? "Verifying..." : "Verify code"}
            </button>
            {status === "verification_error" && (
              <button
                type="button"
                onClick={() => {
                  setSupportResponse(null);
                  setVerificationCode("");
                  setErrorMsg("");
                  setStatus("form");
                }}
                className="w-full py-2 text-text-muted transition-colors hover:text-text-primary"
                style={{ ...mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}
              >
                Start over with a new code
              </button>
            )}
          </form>
        )}

        {/* ── VERIFIED ── */}
        {status === "verified" && (
          <div className="py-10 text-center">
            <div style={{ fontSize: 20, color: "var(--color-signal-green)", marginBottom: 12 }}>✓</div>
            <p style={{ ...mono, fontSize: 12, color: "var(--color-signal-green)", letterSpacing: "0.06em", marginBottom: 8 }}>
              Support request verified.
            </p>
            <p style={{ ...mono, fontSize: 10, color: "var(--color-brand-muted)", letterSpacing: "0.04em" }}>
              It is now admitted to the WitnessOps operator queue. We will continue by email.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="border-t border-surface-border px-5 py-3 flex items-center justify-between"
        style={{ ...mono, fontSize: 9, color: "var(--color-surface-border)", letterSpacing: "0.06em" }}
      >
        <span>Email follow-up</span>
        <span>{supportEmail}</span>
      </div>
      <p className="px-5 pb-3 text-[10px] leading-4 text-text-muted">
        {PUBLIC_NO_SECRETS_NOTE}
      </p>
    </div>
  );
}
