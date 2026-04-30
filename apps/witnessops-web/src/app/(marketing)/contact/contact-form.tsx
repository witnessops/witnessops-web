"use client";

import { useState } from "react";

type FieldName =
  | "name"
  | "email"
  | "org"
  | "accessChange"
  | "systemInvolved"
  | "approvingAuthority"
  | "evidenceSummary"
  | "reviewer";

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--color-brand-muted)",
};

const inputClass =
  "w-full bg-transparent border-0 border-b border-surface-border text-text-primary placeholder:text-brand-muted focus:border-brand-accent focus:outline-none py-2.5";

const textareaClass =
  "w-full bg-transparent border border-surface-border text-text-primary placeholder:text-brand-muted focus:border-brand-accent focus:outline-none p-4";

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  letterSpacing: "0.03em",
};

function stringField(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function ContactForm({
  contactEmail,
}: {
  contactEmail: string;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("Failed to send. Please try again.");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});

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
    const systemInvolved = stringField(data, "systemInvolved");
    const approvingAuthority = stringField(data, "approvingAuthority");
    const evidenceSummary = stringField(data, "evidenceSummary");
    const reviewer = stringField(data, "reviewer");
    const proofRunScope = [
      "Offer: Bounded Access-Change Proof Run",
      `Access change: ${accessChange || "not provided"}`,
      `System involved: ${systemInvolved || "not provided"}`,
      `Approving authority: ${approvingAuthority || "not provided"}`,
      `Evidence summary: ${evidenceSummary || "not provided"}`,
      `Reviewer: ${reviewer || "not provided"}`,
      "First-message boundary: no secrets, source exports, logs, screenshots, or customer evidence requested in the form",
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

  function handleInvalid(
    e: React.InvalidEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    updateFieldError(e.currentTarget.name as FieldName, e.currentTarget.validationMessage);
  }

  function handleFieldInput(
    e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const field = e.currentTarget;
    updateFieldError(field.name as FieldName, field.validity.valid ? "" : field.validationMessage);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={status === "sending"}>
      <input type="hidden" name="intent" value="access-change-proof-run" />
      <div id="witnessops-contact-status" className="sr-only" aria-live="polite" aria-atomic="true">
        {status === "sending"
          ? "Sending..."
          : status === "sent"
            ? "Request sent. Check your email for the verification step."
            : ""}
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
        <label htmlFor="org" className="mb-2 block" style={labelStyle}>Company or team</label>
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
        <label htmlFor="accessChange" className="mb-2 block" style={labelStyle}>Access change to inspect</label>
        <textarea
          id="accessChange" name="accessChange" rows={3} required
          aria-describedby="accessChange-helper"
          className={`${textareaClass} ${fieldErrors.accessChange ? "!border-signal-red" : ""}`}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
          placeholder="Example: contractor production access revoked, admin permission updated, vendor access reviewed."
          onInvalid={handleInvalid}
          onInput={handleFieldInput}
          aria-invalid={fieldErrors.accessChange ? true : undefined}
        />
        <p id="accessChange-helper" className="mt-2 text-xs leading-relaxed text-text-muted">
          Plain language only. Do not paste secrets, source exports, full logs, screenshots, or customer data.
        </p>
        {fieldErrors.accessChange && <p className="mt-1 text-xs text-signal-red">{fieldErrors.accessChange}</p>}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="systemInvolved" className="mb-2 block" style={labelStyle}>System involved</label>
          <input
            id="systemInvolved" name="systemInvolved" type="text"
            aria-invalid={fieldErrors.systemInvolved ? true : undefined}
            onInvalid={handleInvalid} onInput={handleFieldInput}
            className={`${inputClass} ${fieldErrors.systemInvolved ? "!border-signal-red" : ""}`}
            style={inputStyle}
            placeholder="Production app, cloud IAM, GitHub, IdP, etc."
          />
          {fieldErrors.systemInvolved && <p className="mt-1 text-xs text-signal-red">{fieldErrors.systemInvolved}</p>}
        </div>

        <div>
          <label htmlFor="approvingAuthority" className="mb-2 block" style={labelStyle}>Who approved it?</label>
          <input
            id="approvingAuthority" name="approvingAuthority" type="text"
            aria-invalid={fieldErrors.approvingAuthority ? true : undefined}
            onInvalid={handleInvalid} onInput={handleFieldInput}
            className={`${inputClass} ${fieldErrors.approvingAuthority ? "!border-signal-red" : ""}`}
            style={inputStyle}
            placeholder="Role or title is enough for first contact"
          />
          {fieldErrors.approvingAuthority && <p className="mt-1 text-xs text-signal-red">{fieldErrors.approvingAuthority}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="evidenceSummary" className="mb-2 block" style={labelStyle}>What evidence exists?</label>
        <textarea
          id="evidenceSummary" name="evidenceSummary" rows={3}
          aria-describedby="evidenceSummary-helper"
          className={`${textareaClass} ${fieldErrors.evidenceSummary ? "!border-signal-red" : ""}`}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
          placeholder="Ticket, approval record, access log, export, screenshot, policy text. Name evidence types only."
          onInvalid={handleInvalid}
          onInput={handleFieldInput}
          aria-invalid={fieldErrors.evidenceSummary ? true : undefined}
        />
        <p id="evidenceSummary-helper" className="mt-2 text-xs leading-relaxed text-text-muted">
          Source materials are handled only after scope and intake are agreed.
        </p>
        {fieldErrors.evidenceSummary && <p className="mt-1 text-xs text-signal-red">{fieldErrors.evidenceSummary}</p>}
      </div>

      <div>
        <label htmlFor="reviewer" className="mb-2 block" style={labelStyle}>Who needs to inspect the bundle?</label>
        <input
          id="reviewer" name="reviewer" type="text"
          aria-invalid={fieldErrors.reviewer ? true : undefined}
          onInvalid={handleInvalid} onInput={handleFieldInput}
          className={`${inputClass} ${fieldErrors.reviewer ? "!border-signal-red" : ""}`}
          style={inputStyle}
          placeholder="Founder, CTO, security lead, customer, auditor, or internal reviewer"
        />
        {fieldErrors.reviewer && <p className="mt-1 text-xs text-signal-red">{fieldErrors.reviewer}</p>}
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
        {status === "sending" ? "Sending..." : "Request proof run"}
      </button>

      <p className="text-xs leading-relaxed text-text-muted">
        A form submission does not start a proof run. We confirm fit, scope, payment, and evidence handling by email first.
      </p>

      {status === "sent" && (
        <div
          className="flex items-center gap-2 py-3"
          style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-signal-green)" }}
          role="status"
        >
          <span>&#10003;</span> Request received. Check your work email for the verification step before scope starts.
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
