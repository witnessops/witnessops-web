"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

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
  const [status, setStatus] = useState<"idle" | "search" | "form" | "sending" | "sent" | "error">("idle");
  const [email, setEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof KB_ENTRIES>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

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
      const res = await fetch("/api/support/message", {
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
        throw new Error(err.error ?? "Failed to submit");
      }

      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to submit.");
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
          borderColor: status === "sent" ? "rgba(0,212,126,0.3)" : status === "error" ? "rgba(239,68,68,0.3)" : "var(--color-surface-border)",
          color: status === "sent" ? "var(--color-signal-green)" : status === "error" ? "var(--color-signal-red)" : "var(--color-brand-muted)",
        }}>
          {status === "sent" ? "SENT" : status === "error" ? "ERROR" : "EMAIL SUPPORT"}
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
              <label htmlFor="si-search" style={label}>Search knowledge base first</label>
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
          </div>
        )}

        {/* ── STEP 2: Ticket form ── */}
        {(status === "form" || status === "sending" || status === "error") && (
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
                  <option value="security">Security concern</option>
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

            {status === "error" && (
              <div className="py-2 text-center" style={{ ...mono, fontSize: 11, color: "var(--color-signal-amber)", letterSpacing: "0.04em" }}>
                {errorMsg}
              </div>
            )}
          </form>
        )}

        {/* ── SENT ── */}
        {status === "sent" && (
          <div className="py-10 text-center">
            <div style={{ fontSize: 20, color: "var(--color-signal-green)", marginBottom: 12 }}>✓</div>
            <p style={{ ...mono, fontSize: 12, color: "var(--color-signal-green)", letterSpacing: "0.06em", marginBottom: 8 }}>
              Support request sent.
            </p>
            <p style={{ ...mono, fontSize: 10, color: "var(--color-brand-muted)", letterSpacing: "0.04em" }}>
              We will continue by email from the support mailbox.
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
    </div>
  );
}
