"use client";

import { useState } from "react";

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

export function ContactForm({ contactEmail }: { contactEmail: string }) {
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
        <label htmlFor="email" className="mb-2 block" style={labelStyle}>Email</label>
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
        <label htmlFor="intent" className="mb-2 block" style={labelStyle}>Intent</label>
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
              colorScheme: "dark",
            }}
            defaultValue=""
          >
            <option value="">Select engagement type</option>
            <option value="recon">External reconnaissance</option>
            <option value="assessment">Vulnerability assessment</option>
            <option value="continuous">Continuous monitoring</option>
            <option value="compliance">Compliance evidence</option>
            <option value="custom">Custom engagement</option>
          </select>
          <SelectChevron />
        </div>
        {fieldErrors.intent && <p className="mt-1 text-xs text-signal-red">{fieldErrors.intent}</p>}
      </div>

      <div>
        <label htmlFor="scope" className="mb-2 block" style={labelStyle}>Scope</label>
        <textarea
          id="scope" name="scope" rows={3}
          className="w-full bg-transparent border border-surface-border text-text-primary placeholder:text-brand-muted focus:border-brand-accent focus:outline-none p-3"
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
          placeholder="Target domains, systems, or describe your needs..."
        />
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
        {status === "sending" ? "Sending..." : "Send Verification Link"}
      </button>

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
        <span style={{ color: "var(--color-brand-accent)" }}>&lt; 1 business day</span>
        <span className="mx-2" style={{ color: "var(--color-surface-border)" }}>&middot;</span>
        {contactEmail}
      </div>
    </form>
  );
}
