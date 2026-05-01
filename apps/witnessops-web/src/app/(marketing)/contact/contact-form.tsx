"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { EngageResponse, VerifyTokenResponse } from "@/lib/token-contract";
import { formatVerificationCode } from "@/lib/verification-code-format";

type FieldName =
  | "name"
  | "email"
  | "org"
  | "accessChange";

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--color-text-secondary)",
};

const inputClass =
  "w-full border border-surface-border-strong bg-surface-card px-3 py-3 text-text-primary placeholder:text-text-secondary transition-colors focus:border-brand-accent focus:bg-surface-bg focus:outline-none";

const textareaClass =
  "w-full border border-surface-border-strong bg-surface-card px-3 py-3 text-text-primary placeholder:text-text-secondary transition-colors focus:border-brand-accent focus:bg-surface-bg focus:outline-none";

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 15,
  letterSpacing: 0,
};

type VerificationStep = Pick<
  EngageResponse,
  "issuanceId" | "email" | "expiresAt"
>;

function stringField(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function ContactForm({
  contactEmail,
}: {
  contactEmail: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "verifying" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("Failed to send. Please try again.");
  const [verifyErrorMessage, setVerifyErrorMessage] = useState("Verification failed. Please try again.");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [verificationStep, setVerificationStep] = useState<VerificationStep | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationBoundaryAccepted, setVerificationBoundaryAccepted] = useState(false);

  function updateFieldError(name: FieldName, message: string) {
    setFieldErrors((current) => {
      if (!message) {
        const next = { ...current };
        delete next[name];
        return next;
      }
      return { ...current, [name]: message };
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setStatus("sending");
    setErrorMessage("Failed to send. Please try again.");

    const form = e.currentTarget;
    const data = new FormData(form);
    const accessChange = stringField(data, "accessChange");
    const proofRunScope = [
      "Offer: Bounded Access-Change Proof Run",
      `First-contact note: ${accessChange || "not provided"}`,
      "First-message boundary: no files, secrets, source exports, logs, screenshots, or customer evidence requested in the form",
      "Follow-up needed: fit, authority boundary, likely evidence sources, reviewer, scope, fee, and evidence handling",
    ].join("\n");

    try {
      const res = await fetch("/api/review/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          org: data.get("org"),
          email: data.get("email"),
          intent: "access-change-proof-run",
          scope: proofRunScope,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: "Failed to send." }));
        if (typeof payload.error === "string" && payload.error.toLowerCase().includes("email")) {
          updateFieldError("email", payload.error);
        }
        throw new Error(payload.error ?? "Failed to send.");
      }
      const payload = (await res.json().catch(() => null)) as
        | Partial<EngageResponse>
        | null;
      if (!payload?.issuanceId || !payload.email || !payload.expiresAt) {
        throw new Error("Verification was issued, but the response was incomplete.");
      }
      setVerificationStep({
        issuanceId: payload.issuanceId,
        email: payload.email,
        expiresAt: payload.expiresAt,
      });
      setVerificationCode("");
      setVerificationBoundaryAccepted(false);
      setVerifyStatus("idle");
      setStatus("sent");
      form.reset();
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error && error.message.length > 0
          ? error.message
          : "Failed to send. Please try again.",
      );
    }
  }

  async function handleVerifySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!verificationStep) return;

    setVerifyStatus("verifying");
    setVerifyErrorMessage("Verification failed. Please try again.");

    try {
      if (!verificationBoundaryAccepted) {
        throw new Error("Confirm the boundary before verifying the code.");
      }

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

      if (
        !response.ok ||
        !payload?.issuanceId ||
        !payload.email ||
        !payload.postVerifyPath
      ) {
        throw new Error(payload?.error ?? "Verification failed.");
      }

      router.replace(payload.postVerifyPath);
    } catch (error) {
      setVerifyStatus("error");
      setVerifyErrorMessage(
        error instanceof Error && error.message.length > 0
          ? error.message
          : "Verification failed. Please try again.",
      );
    }
  }

  function handleInvalid(
    e: React.InvalidEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    updateFieldError(e.currentTarget.name as FieldName, e.currentTarget.validationMessage);
  }

  function handleFieldInput(
    e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const field = e.currentTarget;
    updateFieldError(field.name as FieldName, field.validity.valid ? "" : field.validationMessage);
  }

  if (verificationStep) {
    return (
      <form onSubmit={handleVerifySubmit} className="space-y-5" aria-busy={verifyStatus === "verifying"}>
        <div id="witnessops-contact-status" className="sr-only" aria-live="polite" aria-atomic="true">
          {verifyStatus === "verifying"
            ? "Verifying code..."
            : "Verification email sent. Enter the email code on this page."}
        </div>

        <div className="border border-surface-border bg-surface-bg p-5">
          <div className="mb-2" style={labelStyle}>Mailbox verification</div>
          <h2
            className="text-xl font-semibold uppercase leading-tight text-text-primary"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}
          >
            Enter your email code
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            We sent a code to {verificationStep.email}. Keep this page open,
            then type the code below. The email contains the code only; no link
            is required.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-text-muted">
            Mailbox verification does not start a proof run. Fit, scope,
            payment, and evidence handling are confirmed by email first.
          </p>
        </div>

        <div>
          <label htmlFor="verification-code" className="mb-2 block" style={labelStyle}>
            Verification code
          </label>
          <input
            id="verification-code"
            name="verification-code"
            value={verificationCode}
            onChange={(event) => {
              setVerificationCode(formatVerificationCode(event.currentTarget.value));
              setVerifyErrorMessage("Verification failed. Please try again.");
              setVerifyStatus("idle");
            }}
            autoComplete="one-time-code"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            required
            maxLength={80}
            placeholder="ABCD-EFGH-JKLM"
            className={inputClass}
            style={{ ...inputStyle, textAlign: "center", letterSpacing: "0.16em" }}
          />
          <p className="mt-2 text-xs leading-relaxed text-text-muted">
            Do not share this code. It expires at {verificationStep.expiresAt}.
          </p>
        </div>

        <label className="flex gap-3 border border-surface-border bg-surface-bg p-4 text-sm leading-relaxed text-text-muted">
          <input
            type="checkbox"
            checked={verificationBoundaryAccepted}
            onChange={(event) => {
              setVerificationBoundaryAccepted(event.currentTarget.checked);
              setVerifyErrorMessage("Verification failed. Please try again.");
              setVerifyStatus("idle");
            }}
            className="mt-1 h-4 w-4 shrink-0 accent-brand-accent"
          />
          <span>
            I understand this confirms mailbox access only. No proof run starts
            here, and I will not send secrets, logs, screenshots, source
            exports, or customer evidence until scope and evidence handling are
            agreed.
          </span>
        </label>

        {verifyStatus === "error" && (
          <div
            className="flex items-center gap-2 py-3"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-signal-red)" }}
            role="alert"
          >
            {verifyErrorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={verifyStatus === "verifying" || !verificationBoundaryAccepted}
          className="w-full py-3 text-text-inverse bg-brand-accent disabled:opacity-50 transition-all hover:brightness-110 hover:shadow-[0_0_24px_rgba(255,107,53,0.3)] active:scale-[0.98]"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {verifyStatus === "verifying" ? "Confirming..." : "Confirm mailbox"}
        </button>

        <button
          type="button"
          onClick={() => {
            setVerificationStep(null);
            setVerificationCode("");
            setVerificationBoundaryAccepted(false);
            setVerifyStatus("idle");
            setStatus("idle");
          }}
          className="w-full border border-surface-border py-3 text-text-muted transition-colors hover:text-text-primary"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          Start a new request
        </button>

        <div
          className="pt-4 border-t border-surface-border"
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-brand-muted)", letterSpacing: "0.06em" }}
        >
          <div className="flex flex-wrap items-center gap-y-1">
            <span
              className="whitespace-nowrap"
              style={{ color: "var(--color-brand-accent)" }}
            >
              Email follow-up
            </span>
            <span className="inline-flex items-center whitespace-nowrap">
              <span
                className="mx-2"
                style={{ color: "var(--color-surface-border)" }}
                aria-hidden="true"
              >
                &middot;
              </span>
              <a
                href={`mailto:${contactEmail}`}
                className="whitespace-nowrap underline decoration-surface-border underline-offset-2 transition-colors hover:text-text-primary"
                style={{ color: "inherit" }}
              >
                {contactEmail}
              </a>
            </span>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={status === "sending"}>
      <input type="hidden" name="intent" value="access-change-proof-run" />
      <div id="witnessops-contact-status" className="sr-only" aria-live="polite" aria-atomic="true">
        {status === "sending"
          ? "Sending..."
          : status === "sent"
            ? "Request sent. Enter the email code on this page."
            : ""}
      </div>

      <div className="border border-surface-border bg-surface-bg p-4">
        <div className="text-sm font-semibold text-text-primary">
          Start with the minimum.
        </div>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Four fields. No files. No evidence upload. Use plain language and
          save tickets, logs, screenshots, exports, and customer evidence for
          the scoped intake.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-2 block" style={labelStyle}>Your name</label>
          <input
            id="name" name="name" type="text" required
            aria-invalid={fieldErrors.name ? true : undefined}
            onInvalid={handleInvalid} onInput={handleFieldInput}
            className={`${inputClass} ${fieldErrors.name ? "!border-signal-red" : ""}`}
            style={inputStyle}
            placeholder="Your name"
          />
          {fieldErrors.name && <p className="mt-1 text-xs text-signal-red">{fieldErrors.name}</p>}
        </div>

        <div>
          <label htmlFor="email" className="mb-2 block" style={labelStyle}>Work email</label>
          <input
            id="email" name="email" type="email" required
            aria-invalid={fieldErrors.email ? true : undefined}
            onInvalid={handleInvalid} onInput={handleFieldInput}
            className={`${inputClass} ${fieldErrors.email ? "!border-signal-red" : ""}`}
            style={inputStyle}
            placeholder="buyer@company.com"
          />
          {fieldErrors.email && <p className="mt-1 text-xs text-signal-red">{fieldErrors.email}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="org" className="mb-2 block" style={labelStyle}>Company or team <span className="text-text-muted">(optional)</span></label>
        <input
          id="org" name="org" type="text"
          aria-invalid={fieldErrors.org ? true : undefined}
          onInvalid={handleInvalid} onInput={handleFieldInput}
          className={`${inputClass} ${fieldErrors.org ? "!border-signal-red" : ""}`}
          style={inputStyle}
          placeholder="Company, team, or project"
        />
        {fieldErrors.org && <p className="mt-1 text-xs text-signal-red">{fieldErrors.org}</p>}
      </div>

      <div>
        <label htmlFor="accessChange" className="mb-2 block" style={labelStyle}>What access change should we inspect?</label>
        <textarea
          id="accessChange" name="accessChange" rows={4} required
          aria-describedby="accessChange-helper"
          className={`${textareaClass} ${fieldErrors.accessChange ? "!border-signal-red" : ""}`}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
          placeholder="Example: contractor production access was revoked. We need a proof bundle showing approval, execution evidence, and remaining gaps."
          onInvalid={handleInvalid}
          onInput={handleFieldInput}
          aria-invalid={fieldErrors.accessChange ? true : undefined}
        />
        <p id="accessChange-helper" className="mt-2 text-xs leading-relaxed text-text-muted">
          One or two sentences is enough. Name systems at a high level only.
          Do not paste secrets, source exports, full logs, screenshots,
          credentials, or customer evidence.
        </p>
        {fieldErrors.accessChange && <p className="mt-1 text-xs text-signal-red">{fieldErrors.accessChange}</p>}
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full py-3 text-text-inverse bg-brand-accent disabled:opacity-50 transition-all hover:brightness-110 hover:shadow-[0_0_24px_rgba(255,107,53,0.3)] active:scale-[0.98]"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        {status === "sending" ? "Sending..." : "Send request"}
      </button>

      <p className="text-xs leading-relaxed text-text-muted">
        Submitting this form only opens a fit check. No proof run starts until
        scope, fee, and evidence handling are agreed.
      </p>

      {status === "sent" && (
        <div
          className="flex items-center gap-2 py-3"
          style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-signal-green)" }}
          role="status"
        >
          <span>&#10003;</span> Request received. Enter the code from your work email on this page.
        </div>
      )}
      {status === "error" && (
        <div
          className="flex items-center gap-2 py-3"
          style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-signal-red)" }}
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      {/* Response info */}
      <div
        className="pt-4 border-t border-surface-border"
        style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-brand-muted)", letterSpacing: "0.06em" }}
      >
        <div className="flex flex-wrap items-center gap-y-1">
          <span
            className="whitespace-nowrap"
            style={{ color: "var(--color-brand-accent)" }}
          >
            Email follow-up
          </span>
          <span className="inline-flex items-center whitespace-nowrap">
            <span
              className="mx-2"
              style={{ color: "var(--color-surface-border)" }}
              aria-hidden="true"
            >
              &middot;
            </span>
            <a
              href={`mailto:${contactEmail}`}
              className="whitespace-nowrap underline decoration-surface-border underline-offset-2 transition-colors hover:text-text-primary"
              style={{ color: "inherit" }}
            >
              {contactEmail}
            </a>
          </span>
        </div>
      </div>
    </form>
  );
}
