"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type Ref,
} from "react";

import { ReviewRequestRecord } from "@/components/review-request/review-request-record";
import { PRIMARY_OFFER } from "@/lib/commercial-truth";
import {
  buildReviewRequestConfirmation,
  type ReviewRequestConfirmation,
} from "@/lib/review-request-confirmation";
import { formatVerificationCode } from "@/lib/verification-code-format";
import type { EngageResponse, VerifyTokenResponse } from "@/lib/token-contract";
import type { AskWitnessOpsCommercialFit } from "./ask-witnessops-response";
import { buildAskAiContactRequest } from "./docs-assistant-contact-handoff-contract";

type VerificationStep = Pick<
  EngageResponse,
  "issuanceId" | "email" | "expiresAt"
>;

const CONTACT_PANEL_ID = "ask-witnessops-contact-handoff";

export function DocsAssistantContactHandoff({
  expanded,
  commercialFit,
  launcherRef,
  onBusyChange,
  onExpandedChange,
}: {
  expanded: boolean;
  commercialFit?: AskWitnessOpsCommercialFit;
  launcherRef?: Ref<HTMLButtonElement>;
  onBusyChange?: (busy: boolean) => void;
  onExpandedChange: (expanded: boolean) => void;
}) {
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
  const [confirmationRecord, setConfirmationRecord] =
    useState<ReviewRequestConfirmation | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const verificationCodeRef = useRef<HTMLInputElement>(null);
  const confirmationHeadingRef = useRef<HTMLHeadingElement>(null);
  const inFlightRef = useRef<"contact" | "verification" | null>(null);
  const offerRequiresSummary = Boolean(commercialFit?.offer);

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

  useEffect(() => {
    if (status !== "confirmed" || !confirmationRecord) return;

    const frame = window.requestAnimationFrame(() =>
      confirmationHeadingRef.current?.focus(),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [confirmationRecord, status]);

  function reset() {
    if (inFlightRef.current !== null) return;

    onExpandedChange(false);
    setEmail("");
    setNote("");
    setStatus("idle");
    setErrorMessage("");
    setVerificationStep(null);
    setVerificationCode("");
    setBoundaryAccepted(false);
    setConfirmationRecord(null);
  }

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlightRef.current !== null) return;
    if (offerRequiresSummary && !note.trim()) {
      setStatus("error");
      setErrorMessage("Add a short, non-secret workflow summary.");
      window.requestAnimationFrame(() => noteRef.current?.focus());
      return;
    }

    inFlightRef.current = "contact";
    onBusyChange?.(true);
    setStatus("sending");
    setErrorMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildAskAiContactRequest(email, note, commercialFit),
        ),
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
    } finally {
      if (inFlightRef.current === "contact") {
        inFlightRef.current = null;
        onBusyChange?.(false);
      }
    }
  }

  async function handleVerificationSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (
      !verificationStep ||
      !boundaryAccepted ||
      inFlightRef.current !== null
    ) {
      return;
    }

    inFlightRef.current = "verification";
    onBusyChange?.(true);
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

      const record = buildReviewRequestConfirmation(payload, {
        locale: "en",
        requestKind:
          commercialFit?.offer_id === PRIMARY_OFFER.id
            ? "agent-risk-control-review"
            : "review-request",
        source: "ask",
      });
      if (!record) {
        throw new Error(
          "Mailbox confirmation completed, but the request boundary could not be confirmed.",
        );
      }

      setConfirmationRecord(record);
      setEmail("");
      setNote("");
      setVerificationStep(null);
      setVerificationCode("");
      setBoundaryAccepted(false);
      setStatus("confirmed");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Mailbox confirmation failed.",
      );
    } finally {
      if (inFlightRef.current === "verification") {
        inFlightRef.current = null;
        onBusyChange?.(false);
      }
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
          ref={launcherRef}
          type="button"
          onClick={() => {
            onExpandedChange(true);
          }}
          aria-expanded="false"
          aria-controls={CONTACT_PANEL_ID}
          className="mt-2 text-xs font-semibold text-brand-accent underline decoration-brand-accent/40 underline-offset-4 transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
        >
          Request a scoped review
        </button>
      </div>
    );
  }

  if (status === "confirmed" && confirmationRecord) {
    return (
      <div
        id={CONTACT_PANEL_ID}
        data-ask-contact-confirmed
        data-ask-contact-region
        className="mt-5 border-t border-surface-border pt-4"
        aria-live="polite"
      >
        <ReviewRequestRecord
          confirmation={confirmationRecord}
          compact
          headingRef={confirmationHeadingRef}
        />
        <button
          type="button"
          onClick={reset}
          data-ask-contact-return
          className="mt-3 text-xs font-semibold text-brand-accent underline decoration-brand-accent/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
        >
          Return to Ask AI
        </button>
      </div>
    );
  }

  return (
    <div
      id={CONTACT_PANEL_ID}
      data-ask-contact-panel
      data-ask-contact-region
      className="mt-5 border-t border-surface-border pt-4"
    >
      <div
        data-ask-contact-heading
        className="flex items-start justify-between gap-3"
      >
        <div>
          <h2 className="text-sm font-semibold text-text-primary">
            {commercialFit?.offer
              ? "Request scope for this workflow"
              : "Contact handoff"}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            {commercialFit?.offer ? (
              <>
                {commercialFit.offer.name} · {commercialFit.offer.price_label} ·{" "}
                {commercialFit.offer.unit_label}. {commercialFit.offer.fit_check_label}.{" "}
                {commercialFit.offer.delivery_label}. Confirm a work email.
                Work starts only after scope, evidence rules, and evidence
                handling are agreed.
              </>
            ) : (
              <>
                Leave a work email and an optional short, non-secret note. We
                use an email code to confirm the mailbox before the request can
                be handled.
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          disabled={status === "sending" || status === "verifying"}
          className="shrink-0 text-xs text-text-muted transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>
      </div>

      {verificationStep ? (
        <form
          onSubmit={handleVerificationSubmit}
          data-ask-contact-form
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
                setStatus((current) =>
                  current === "verifying" ? current : "idle",
                );
                if (inFlightRef.current === null) setErrorMessage("");
              }}
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
              required
              maxLength={80}
              aria-invalid={status === "error" ? true : undefined}
              aria-describedby={status === "error" ? "ask-ai-contact-code-error ask-ai-contact-code-help" : "ask-ai-contact-code-help"}
              aria-errormessage={status === "error" ? "ask-ai-contact-code-error" : undefined}
              placeholder="ABCD-EFGH-JKLM"
              className="mt-1 w-full rounded border border-surface-border bg-surface-bg px-2.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand-accent focus:outline-none"
            />
            <p id="ask-ai-contact-code-help" className="mt-1 text-[11px] leading-relaxed text-text-muted">
              The code expires at {verificationStep.expiresAt}.
            </p>
          </div>
          <label className="flex gap-2 text-[11px] leading-relaxed text-text-muted">
            <input
              type="checkbox"
              checked={boundaryAccepted}
              onChange={(event) => {
                setBoundaryAccepted(event.currentTarget.checked);
                setStatus((current) =>
                  current === "verifying" ? current : "idle",
                );
                if (inFlightRef.current === null) setErrorMessage("");
              }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand-accent"
            />
            <span>
              I understand this confirms my mailbox only. No review begins here,
              and I will not send secrets or customer evidence.
            </span>
          </label>
          {status === "error" && (
            <p id="ask-ai-contact-code-error" className="text-xs text-red-400" role="alert">
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
          data-ask-contact-form
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
                setStatus((current) =>
                  current === "sending" ? current : "idle",
                );
                if (inFlightRef.current === null) setErrorMessage("");
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
              Workflow summary or request{" "}
              <span className="normal-case">
                ({offerRequiresSummary ? "required" : "optional"})
              </span>
            </label>
            <textarea
              ref={noteRef}
              id="ask-ai-contact-note"
              value={note}
              onChange={(event) => {
                setNote(event.currentTarget.value);
                setStatus((current) =>
                  current === "sending" ? current : "idle",
                );
                if (inFlightRef.current === null) setErrorMessage("");
              }}
              rows={2}
              required={offerRequiresSummary}
              maxLength={1_000}
              placeholder="What should we scope? Keep it high level."
              className="mt-1 w-full resize-y rounded border border-surface-border bg-surface-bg px-2.5 py-2 text-xs leading-relaxed text-text-primary placeholder:text-text-muted focus:border-brand-accent focus:outline-none"
            />
          </div>
          <p className="text-[11px] leading-relaxed text-text-muted">
            Mailbox confirmation starts a fit-and-scope reply only. No review
            begins here. Do not include secrets or customer evidence.
          </p>
          {status === "error" && (
            <p className="text-xs text-red-400" role="alert">
              {errorMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={
              status === "sending" ||
              !email.trim() ||
              (offerRequiresSummary && !note.trim())
            }
            className="w-full rounded border border-brand-accent bg-brand-accent px-3 py-2 text-xs font-semibold text-text-inverse transition-colors hover:bg-text-primary disabled:cursor-not-allowed disabled:border-surface-border-strong disabled:bg-surface-inset disabled:text-text-muted disabled:opacity-100"
          >
            {status === "sending" ? "Sending code..." : "Send confirmation code"}
          </button>
        </form>
      )}
    </div>
  );
}
