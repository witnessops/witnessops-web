"use client";

import { useState } from "react";

type FieldName =
  | "name"
  | "email"
  | "workflowName";

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
    const workflowSummary = stringField(data, "workflowName");
    const proofRunScope = [
      `Workflow summary: ${workflowSummary || "not provided"}`,
      "Known evidence or links: not requested in the low-friction first form",
    ].join("\n");

    try {
      const res = await fetch("/api/review/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          org: data.get("org"),
          email: data.get("email"),
          intent: "ai-agent-action-proof-run",
          scope: proofRunScope,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: "Failed to send." }));
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
      <input type="hidden" name="intent" value="ai-agent-action-proof-run" />
      <div id="witnessops-contact-status" className="sr-only" aria-live="polite" aria-atomic="true">
        {status === "sending"
          ? "Sending..."
          : status === "sent"
            ? "Message sent."
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
        <label htmlFor="workflowName" className="mb-2 block" style={labelStyle}>What should we look at?</label>
        <textarea
          id="workflowName" name="workflowName" rows={4} required
          aria-describedby="workflowName-helper"
          className={`${textareaClass} ${fieldErrors.workflowName ? "!border-signal-red" : ""}`}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
          placeholder="One agent-assisted workflow, action, or decision path. Plain language is fine."
          onInvalid={handleInvalid}
          onInput={handleFieldInput}
          aria-invalid={fieldErrors.workflowName ? true : undefined}
        />
        <p id="workflowName-helper" className="mt-2 text-xs leading-relaxed text-text-muted">
          No secrets or customer data. A short summary is enough for the first fit check.
        </p>
        {fieldErrors.workflowName && <p className="mt-1 text-xs text-signal-red">{fieldErrors.workflowName}</p>}
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
        We reply by email before anything runs.
      </p>

      {status === "sent" && (
        <div
          className="flex items-center gap-2 py-3"
          style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-signal-green)" }}
          role="status"
        >
          <span>&#10003;</span> Proof-run request sent. We will follow up by email.
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
