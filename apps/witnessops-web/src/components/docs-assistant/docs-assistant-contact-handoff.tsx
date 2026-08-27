"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { formatVerificationCode } from "@/lib/verification-code-format";
import type { EngageResponse, VerifyTokenResponse } from "@/lib/token-contract";

type VerificationStep = Pick<
  EngageResponse,
  "issuanceId" | "email" | "expiresAt"
>;

const CONTACT_PANEL_ID = "ask-witnessops-contact-handoff";

export function buildAskAiContactScope(note: string): string {
  return [
    "Contact path: Ask AI panel handoff",
    `Visitor note: ${note.trim() || "not provided"}`,
    "First-message boundary: no files, secrets, logs, screenshots, credentials, private keys, MFA codes, customer records, or production evidence requested.",
    "Next step: mailbox verification, followed by asynchronous fit and scope review. No review starts from this contact handoff.",
  ].join("\n");
}

export function DocsAssistantContactHandoff({
  onExpandedChange,
}: {
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "verifying" | "confirmed" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [verificationStep, setVerificationStep] =
    useState<VerificationStep | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [boundaryAccepted, setBoundaryAccepted] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const verificationCodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!expanded || verificationStep) return;

    const frame = window.requestAnimationFrame(() => emailRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [expanded, verificationStep]);

  useEffect(() => {
    if (!verificationStep) return;

    const frame = window.requestAnimationFrame(() =>
      verificationCodeRef.current?.focus(),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [verificationStep]);

  function reset() {
    setExpanded(false);
    onExpandedChange?.(false);
    setEmail("");
    setNote("");
    setStatus("idle");
    setErrorMessage("");
    setVerificationStep(null);
    setVerificationCode("");
    setBoundaryAccepted(false);
  }

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;

    setStatus("sending");
    setErrorMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          intent: "ask-ai-contact",
          locale: "en",
          scope: buildAskAiContactScope(note),
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | (Partial<EngageResponse> & { error?: string })
        | null;

      if (
        !response.ok ||
        !payload?.issuanceId ||
        !payload.email ||
        !payload.expiresAt
      ) {
        throw new Error(payload?.error ?? "Could not start contact confirmation.");
      }

      setVerificationStep({
        issuanceId: payload.issuanceId,
        email: payload.email,
        expiresAt: payload.expiresAt,
      });
      setVerificationCode("");
      setBoundaryAccepted(false);
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not start contact confirmation.",
      );
    }
  }

  async function handleVerificationSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (!verificationStep || !boundaryAccepted || status === "verifying") {
      return;
    }

    setStatus("verifying");
    setErrorMessage("");

    try {
      const response = await fetch("/api/verify-token", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issuanceId: verificationStep.issuanceId,
          email: verificationStep.email,
          token: verificationCode,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | (Partial<VerifyTokenResponse> & { error?: string })
        | null;

      if (!response.ok || payload?.status !== "verified") {
        throw new Error(payload?.error ?? "Mailbox confirmation failed.");
      }

      setStatus("confirmed");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Mailbox confirmation failed.",
      );
    }
  }

  if (!expanded) {
    return (
      <div className="mt-5 border-t border-surface-border pt-4">
        <p className="text-xs leading-relaxed text-text-muted">
          Want a human follow-up? Leave a work email after—or instead of—asking
          AI.
        </p>
        <button
          type="button"
          onClick={() => {
            setExpanded(true);
            onExpandedChange?.(true);
          }}
          aria-expanded="false"
          aria-controls={CONTACT_PANEL_ID}
          className="mt-2 text-xs font-semibold text-brand-accent underline decoration-brand-accent/40 underline-offset-4 transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
        >
          Leave contact details
        </button>
      </div>
    );
  }

  if (status === "confirmed") {
    return (
      <div
        id={CONTACT_PANEL_ID}
        className="mt-5 border-t border-surface-border pt-4"
        aria-live="polite"
      >
        <h2 className="text-sm font-semibold text-text-primary">
          Contact confirmed
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-text-muted">
          Your work email and optional note are now in the fit-and-scope intake.
          Follow-up is asynchronous; no review or evidence intake has started.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-3 text-xs font-semibold text-brand-accent underline decoration-brand-accent/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
        >
          Return to Ask AI
        </button>
      </div>
    );
  }

  return (
    <div id={CONTACT_PANEL_ID} className="mt-5 border-t border-surface-border pt-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">
            Contact handoff
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            Leave a work email and an optional short, non-secret note. We use an
            email code to confirm the mailbox before the request can be handled.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="shrink-0 text-xs text-text-muted transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
        >
          Back
        </button>
      </div>

      {verificationStep ? (
        <form
          onSubmit={handleVerificationSubmit}
          className="mt-4 space-y-3"
          aria-busy={status === "verifying"}
        >
          <p className="text-xs leading-relaxed text-text-muted">
            Enter the code sent to {verificationStep.email}. This only confirms
            mailbox access; it does not start work or promise an immediate
            response.
          </p>
          <div>
            <label
              htmlFor="ask-ai-contact-code"
              className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted"
            >
              Email code
            </label>
            <input
              ref={verificationCodeRef}
              id="ask-ai-contact-code"
              value={verificationCode}
              onChange={(event) => {
                setVerificationCode(
                  formatVerificationCode(event.currentTarget.value),
                );
                setStatus("idle");
                setErrorMessage("");
              }}
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
              required
              maxLength={80}
              placeholder="ABCD-EFGH-JKLM"
              className="mt-1 w-full rounded border border-surface-border bg-surface-bg px-2.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand-accent focus:outline-none"
            />
            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
              The code expires at {verificationStep.expiresAt}.
            </p>
          </div>
          <label className="flex gap-2 text-[11px] leading-relaxed text-text-muted">
            <input
              type="checkbox"
              checked={boundaryAccepted}
              onChange={(event) => {
                setBoundaryAccepted(event.currentTarget.checked);
                setStatus("idle");
                setErrorMessage("");
              }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand-accent"
            />
            <span>
              I understand this confirms my mailbox only. No review begins here,
              and I will not send secrets or customer evidence.
            </span>
          </label>
          {status === "error" && (
            <p className="text-xs text-red-400" role="alert">
              {errorMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={
              status === "verifying" ||
              !boundaryAccepted ||
              !verificationCode.trim()
            }
            className="w-full rounded border border-brand-accent bg-brand-accent px-3 py-2 text-xs font-semibold text-text-inverse transition-colors hover:bg-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === "verifying" ? "Confirming..." : "Confirm work email"}
          </button>
        </form>
      ) : (
        <form
          onSubmit={handleContactSubmit}
          className="mt-4 space-y-3"
          aria-busy={status === "sending"}
        >
          <div>
            <label
              htmlFor="ask-ai-contact-email"
              className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted"
            >
              Work email
            </label>
            <input
              ref={emailRef}
              id="ask-ai-contact-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.currentTarget.value);
                setStatus("idle");
                setErrorMessage("");
              }}
              autoComplete="email"
              required
              placeholder="you@company.com"
              className="mt-1 w-full rounded border border-surface-border bg-surface-bg px-2.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand-accent focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="ask-ai-contact-note"
              className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted"
            >
              Note or request <span className="normal-case">(optional)</span>
            </label>
            <textarea
              id="ask-ai-contact-note"
              value={note}
              onChange={(event) => setNote(event.currentTarget.value)}
              rows={3}
              maxLength={1_000}
              placeholder="What would you like to discuss? Keep it high level."
              className="mt-1 w-full resize-y rounded border border-surface-border bg-surface-bg px-2.5 py-2 text-xs leading-relaxed text-text-primary placeholder:text-text-muted focus:border-brand-accent focus:outline-none"
            />
          </div>
          <p className="text-[11px] leading-relaxed text-text-muted">
            After mailbox confirmation, this opens an asynchronous fit-and-scope
            review only. It does not start work. Do not include secrets, logs,
            credentials, screenshots, or customer evidence.
          </p>
          {status === "error" && (
            <p className="text-xs text-red-400" role="alert">
              {errorMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={status === "sending" || !email.trim()}
            className="w-full rounded border border-surface-border bg-surface-bg px-3 py-2 text-xs font-semibold text-text-primary transition-colors hover:border-brand-accent hover:text-brand-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === "sending" ? "Sending code..." : "Send confirmation code"}
          </button>
        </form>
      )}
    </div>
  );
}
