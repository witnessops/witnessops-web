"use client";

import { useState } from "react";
import { ActionButton } from "@/components/shared/action-button";

type FieldName = "name" | "org" | "email" | "intent" | "scope";

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--color-brand-muted)",
};

const inputClass =
  "w-full bg-transparent border-0 border-b border-surface-border text-text-primary placeholder:text-brand-muted focus:border-brand-accent focus:outline-none py-2";

const selectClass =
  "w-full border-0 border-b border-surface-border bg-transparent py-2 pr-10 text-left text-text-primary focus:border-brand-accent focus:outline-none";

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  letterSpacing: "0.03em",
};

const optionStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  color: "#111111",
};

function SelectChevron() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-brand-muted"
      style={{ fontSize: 10, lineHeight: 1 }}
    >
      v
    </span>
  );
}

export function ContactForm({
  contactEmail,
  initialIntent,
}: {
  contactEmail: string;
  initialIntent?: string;
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

    try {
      const res = await fetch("/api/engage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          org: data.get("org"),
          email: data.get("email"),
          intent: data.get("intent"),
          scope: data.get("scope"),
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

  function handleInvalid(e: React.InvalidEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    updateFieldError(e.currentTarget.name as FieldName, e.currentTarget.validationMessage);
  }

  function handleFieldInput(e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const field = e.currentTarget;
    updateFieldError(field.name as FieldName, field.validity.valid ? "" : field.validationMessage);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={status === "sending"}>
      <div id="witnessops-contact-status" className="sr-only" aria-live="polite" aria-atomic="true">
        {status === "sending"
          ? "Sending..."
          : status === "sent"
            ? "Verification email sent."
            : ""}
      </div>

      <div>
        <label htmlFor="name" className="mb-2 block" style={labelStyle}>Name</label>
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
        <label htmlFor="org" className="mb-2 block" style={labelStyle}>Organization</label>
        <input
          id="org" name="org" type="text"
          className={inputClass}
          style={inputStyle}
          placeholder="Company or team"
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-2 block" style={labelStyle}>Work email</label>
        <input
          id="email" name="email" type="email" required
          aria-invalid={fieldErrors.email ? true : undefined}
          onInvalid={handleInvalid} onInput={handleFieldInput}
          className={`${inputClass} ${fieldErrors.email ? "!border-signal-red" : ""}`}
          style={inputStyle}
          placeholder="you@company.com"
        />
        {fieldErrors.email && <p className="mt-1 text-xs text-signal-red">{fieldErrors.email}</p>}
      </div>

      <div>
        <label htmlFor="intent" className="mb-2 block" style={labelStyle}>What kind of review do you need?</label>
        <div className="relative">
          <select
            id="intent" name="intent" required
            aria-invalid={fieldErrors.intent ? true : undefined}
            onInvalid={handleInvalid} onInput={handleFieldInput}
            className={`${selectClass} ${fieldErrors.intent ? "!border-signal-red" : ""}`}
            style={{
              ...inputStyle,
              background: "transparent",
              appearance: "none",
              WebkitAppearance: "none",
              MozAppearance: "none",
              colorScheme: "light",
            }}
            defaultValue={initialIntent ?? ""}
          >
            <option value="" style={optionStyle}>Select review type</option>
            <option value="review" style={optionStyle}>One workflow review</option>
            <option value="recon" style={optionStyle}>External reconnaissance</option>
            <option value="assessment" style={optionStyle}>Vulnerability assessment</option>
            <option value="continuous" style={optionStyle}>Continuous proof-backed security</option>
            <option value="compliance" style={optionStyle}>Compliance evidence</option>
            <option value="custom" style={optionStyle}>Custom engagement</option>
          </select>
          <SelectChevron />
        </div>
        {fieldErrors.intent && <p className="mt-1 text-xs text-signal-red">{fieldErrors.intent}</p>}
      </div>

      <div>
        <label htmlFor="scope" className="mb-2 block" style={labelStyle}>Describe the workflow</label>
        <textarea
          id="scope" name="scope" rows={3}
          aria-describedby="scope-helper"
          className="w-full bg-transparent border border-surface-border text-text-primary placeholder:text-brand-muted focus:border-brand-accent focus:outline-none p-3"
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
          placeholder="Describe one workflow, automation boundary, or operator decision path."
        />
        <p id="scope-helper" className="mt-2 text-xs leading-relaxed text-text-muted">
          Include the main systems involved, who can approve or act, and what
          evidence exists today.
        </p>
      </div>

      <ActionButton
        type="submit"
        variant="primary"
        disabled={status === "sending"}
        className="w-full"
      >
        {status === "sending" ? "Sending..." : "Request review"}
      </ActionButton>

      {status === "sent" && (
        <div
          className="flex items-center gap-2 py-3"
          style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-signal-green)" }}
          role="status"
        >
          <span>&#10003;</span> Verification email sent. Nothing enters the queue until you confirm mailbox control.
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
            Response within 1 business day
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
