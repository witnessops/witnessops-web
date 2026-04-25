"use client";

import { useState } from "react";

type FieldName =
  | "name"
  | "org"
  | "email"
  | "workflowName"
  | "agentTool"
  | "systemTouched"
  | "approvalBoundary"
  | "evidenceAvailable"
  | "urgency";

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--color-brand-muted)",
};

const inputClass =
  "w-full bg-transparent border-0 border-b border-surface-border text-text-primary placeholder:text-brand-muted focus:border-brand-accent focus:outline-none py-2";

const textareaClass =
  "w-full bg-transparent border border-surface-border text-text-primary placeholder:text-brand-muted focus:border-brand-accent focus:outline-none p-3";

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
    const workflowName = stringField(data, "workflowName");
    const agentTool = stringField(data, "agentTool");
    const systemTouched = stringField(data, "systemTouched");
    const approvalBoundary = stringField(data, "approvalBoundary");
    const evidenceAvailable = stringField(data, "evidenceAvailable");
    const urgency = stringField(data, "urgency");
    const proofRunScope = [
      `Workflow name: ${workflowName || "not provided"}`,
      `Agent/tool involved: ${agentTool || "not provided"}`,
      `System touched: ${systemTouched || "not provided"}`,
      `Approval boundary: ${approvalBoundary || "not provided"}`,
      `Evidence available: ${evidenceAvailable || "not provided"}`,
      `Urgency: ${urgency || "not provided"}`,
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
        <label htmlFor="org" className="mb-2 block" style={labelStyle}>Organization</label>
        <input
          id="org" name="org" type="text"
          className={inputClass}
          style={inputStyle}
          placeholder="Company or team"
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-2 block" style={labelStyle}>Buyer email</label>
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

      <div>
        <label htmlFor="workflowName" className="mb-2 block" style={labelStyle}>Workflow name</label>
        <input
          id="workflowName" name="workflowName" type="text" required
          aria-invalid={fieldErrors.workflowName ? true : undefined}
          onInvalid={handleInvalid} onInput={handleFieldInput}
          className={`${inputClass} ${fieldErrors.workflowName ? "!border-signal-red" : ""}`}
          style={inputStyle}
          placeholder="Prod config change"
        />
        {fieldErrors.workflowName && <p className="mt-1 text-xs text-signal-red">{fieldErrors.workflowName}</p>}
      </div>

      <div>
        <label htmlFor="agentTool" className="mb-2 block" style={labelStyle}>Agent/tool involved</label>
        <input
          id="agentTool" name="agentTool" type="text" required
          aria-invalid={fieldErrors.agentTool ? true : undefined}
          onInvalid={handleInvalid} onInput={handleFieldInput}
          className={`${inputClass} ${fieldErrors.agentTool ? "!border-signal-red" : ""}`}
          style={inputStyle}
          placeholder="Agent, workflow runner, script, or IDE"
        />
        {fieldErrors.agentTool && <p className="mt-1 text-xs text-signal-red">{fieldErrors.agentTool}</p>}
      </div>

      <div>
        <label htmlFor="systemTouched" className="mb-2 block" style={labelStyle}>System touched</label>
        <input
          id="systemTouched" name="systemTouched" type="text" required
          aria-invalid={fieldErrors.systemTouched ? true : undefined}
          onInvalid={handleInvalid} onInput={handleFieldInput}
          className={`${inputClass} ${fieldErrors.systemTouched ? "!border-signal-red" : ""}`}
          style={inputStyle}
          placeholder="Repo, queue, access system, or internal tool"
        />
        {fieldErrors.systemTouched && <p className="mt-1 text-xs text-signal-red">{fieldErrors.systemTouched}</p>}
      </div>

      <div>
        <div className="mb-2 block" style={labelStyle}>Proof-run scope</div>
        <div
          className="border border-surface-border bg-transparent px-3 py-3 text-text-primary"
          style={{ ...inputStyle, lineHeight: 1.4 }}
        >
          One workflow. One action path. One receipt. One verifier result. One challenge path.
        </div>
        <p className="mt-2 text-xs leading-relaxed text-text-muted">
          If the evidence is incomplete, the proof says so.
        </p>
      </div>

      <div>
        <label htmlFor="approvalBoundary" className="mb-2 block" style={labelStyle}>Approval boundary</label>
        <textarea
          id="approvalBoundary" name="approvalBoundary" rows={3}
          aria-describedby="approvalBoundary-helper"
          className={`${textareaClass} ${fieldErrors.approvalBoundary ? "!border-signal-red" : ""}`}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
          placeholder="Who approves the agent action, and what exactly does that approval allow?"
          onInvalid={handleInvalid}
          onInput={handleFieldInput}
          aria-invalid={fieldErrors.approvalBoundary ? true : undefined}
        />
        <p id="approvalBoundary-helper" className="mt-2 text-xs leading-relaxed text-text-muted">
          Name the human gate, ticket, policy, or approval record if it exists.
        </p>
        {fieldErrors.approvalBoundary && <p className="mt-1 text-xs text-signal-red">{fieldErrors.approvalBoundary}</p>}
      </div>

      <div>
        <label htmlFor="evidenceAvailable" className="mb-2 block" style={labelStyle}>Evidence available</label>
        <textarea
          id="evidenceAvailable" name="evidenceAvailable" rows={3}
          aria-describedby="evidenceAvailable-helper"
          className={`${textareaClass} ${fieldErrors.evidenceAvailable ? "!border-signal-red" : ""}`}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
          placeholder="Logs, prompts, tickets, diffs, exports, approvals, screenshots, or verifier output."
          onInvalid={handleInvalid}
          onInput={handleFieldInput}
          aria-invalid={fieldErrors.evidenceAvailable ? true : undefined}
        />
        <p id="evidenceAvailable-helper" className="mt-2 text-xs leading-relaxed text-text-muted">
          Include what exists today and what you already know is missing.
        </p>
        {fieldErrors.evidenceAvailable && <p className="mt-1 text-xs text-signal-red">{fieldErrors.evidenceAvailable}</p>}
      </div>

      <div>
        <label htmlFor="urgency" className="mb-2 block" style={labelStyle}>Urgency</label>
        <select
          id="urgency" name="urgency" required
          aria-invalid={fieldErrors.urgency ? true : undefined}
          onInvalid={handleInvalid}
          onInput={handleFieldInput}
          className={`${inputClass} ${fieldErrors.urgency ? "!border-signal-red" : ""}`}
          style={inputStyle}
          defaultValue=""
        >
          <option value="" disabled>Choose a proof-run window</option>
          <option value="this_week">This week</option>
          <option value="this_month">This month</option>
          <option value="exploratory">Exploratory</option>
        </select>
        {fieldErrors.urgency && <p className="mt-1 text-xs text-signal-red">{fieldErrors.urgency}</p>}
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
        {status === "sending" ? "Sending..." : "Request Proof Run"}
      </button>

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
