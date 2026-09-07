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
import { BUYER_SERVICES, type BuyerService } from "@/lib/buyer-services";
import { trackAskEvent } from "@/lib/docs-assistant/ask-analytics";
import {
  buildReviewRequestConfirmation,
  type ReviewRequestConfirmation,
} from "@/lib/review-request-confirmation";
import { formatVerificationCode } from "@/lib/verification-code-format";
import type { EngageResponse, VerifyTokenResponse } from "@/lib/token-contract";
import type { AskWitnessOpsCommercialFit } from "./ask-witnessops-response";
import {
  ASK_CONTACT_NOTE_MAX_LENGTH,
  ASK_CONTACT_QUESTION_MAX_LENGTH,
  buildAskAiContactRequest,
} from "./docs-assistant-contact-handoff-contract";

type VerificationStep = Pick<
  EngageResponse,
  "issuanceId" | "email" | "expiresAt"
>;

const CONTACT_PANEL_ID = "ask-witnessops-contact-handoff";

export function DocsAssistantContactHandoff({
  expanded,
  commercialFit,
  question,
  proposedBrief,
  surface = "widget",
  serviceId,
  launcherRef,
  onBusyChange,
  onExpandedChange,
}: {
  expanded: boolean;
  commercialFit?: AskWitnessOpsCommercialFit;
  question?: string;
  proposedBrief?: string;
  surface?: "widget" | "page" | "inline";
  serviceId?: BuyerService["id"];
  launcherRef?: Ref<HTMLButtonElement>;
  onBusyChange?: (busy: boolean) => void;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [includeQuestion, setIncludeQuestion] = useState(false);
  const [sharedQuestion, setSharedQuestion] = useState(
    (proposedBrief ?? question)?.trim().slice(0, ASK_CONTACT_QUESTION_MAX_LENGTH) ?? "",
  );
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
  const service = BUYER_SERVICES.find(
    (candidate) => candidate.id === (serviceId ?? commercialFit?.offer_id),
  );
  const offerRequiresSummary = Boolean(service);
  const summary = includeQuestion ? sharedQuestion : note;
  const hasConversation = Boolean((proposedBrief ?? question)?.trim());
  const wasExpandedRef = useRef(false);

  useEffect(() => {
    setIncludeQuestion(false);
    setSharedQuestion((proposedBrief ?? question)?.trim().slice(0, ASK_CONTACT_QUESTION_MAX_LENGTH) ?? "");
  }, [proposedBrief, question]);

  useEffect(() => {
    if (expanded && !wasExpandedRef.current) {
      trackAskEvent("contact_started", { service_id: service?.id, surface });
    }
    wasExpandedRef.current = expanded;
  }, [expanded, service?.id, surface]);

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
    setIncludeQuestion(false);
    setSharedQuestion((proposedBrief ?? question)?.trim().slice(0, ASK_CONTACT_QUESTION_MAX_LENGTH) ?? "");
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
    if (offerRequiresSummary && !summary.trim()) {
      setStatus("error");
      setErrorMessage("Add a short, non-secret summary of what you need reviewed.");
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
          buildAskAiContactRequest(email, includeQuestion ? "" : note, commercialFit, {
            includeQuestion,
            question: sharedQuestion,
            serviceId,
          }),
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
          service?.id === PRIMARY_OFFER.id
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
      trackAskEvent("mailbox_confirmed", { service_id: service?.id, surface });
      setEmail("");
      setNote("");
      setIncludeQuestion(false);
      setSharedQuestion("");
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
          Prefer a person? Request a follow-up about fit and scope.
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
          Request a follow-up
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
            Request a follow-up
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            {service ? (
              <>
                About {service.name.en}. Share a short summary for a fit-and-scope reply.
              </>
            ) : (
              <>
                Leave your work email and a short question for a fit-and-scope reply.
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          disabled={status === "sending" || status === "verifying"}
          className="min-h-11 min-w-11 shrink-0 text-xs text-text-muted transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent disabled:cursor-not-allowed disabled:opacity-40"
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
              className="mt-1 min-h-11 w-full rounded border border-surface-border bg-surface-bg px-3 py-2 text-base text-text-primary placeholder:text-text-muted focus:border-brand-accent focus:outline-none"
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
            className="min-h-11 w-full rounded border border-brand-accent bg-brand-accent px-3 py-2 text-sm font-semibold text-text-inverse transition-colors hover:bg-text-primary disabled:cursor-not-allowed disabled:opacity-40"
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
              className="mt-1 min-h-11 w-full rounded border border-surface-border bg-surface-bg px-3 py-2 text-base text-text-primary placeholder:text-text-muted focus:border-brand-accent focus:outline-none"
            />
          </div>
          {hasConversation && (
            <label className="flex min-h-11 items-center gap-2 text-sm leading-relaxed text-text-muted">
              <input
                type="checkbox"
                checked={includeQuestion}
                onChange={(event) => setIncludeQuestion(event.currentTarget.checked)}
                disabled={status === "sending"}
                className="h-4 w-4 shrink-0 accent-brand-accent"
              />
              <span>Use my questions as the request summary.</span>
            </label>
          )}
          <div>
            <label
              htmlFor="ask-ai-contact-note"
              className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted"
            >
              Request summary{" "}
              <span className="normal-case">
                ({offerRequiresSummary ? "required" : "optional"})
              </span>
            </label>
            <textarea
              ref={noteRef}
              id="ask-ai-contact-note"
              value={summary}
              onChange={(event) => {
                if (includeQuestion) setSharedQuestion(event.currentTarget.value);
                else setNote(event.currentTarget.value);
                setStatus((current) =>
                  current === "sending" ? current : "idle",
                );
                if (inFlightRef.current === null) setErrorMessage("");
              }}
              rows={4}
              required={offerRequiresSummary}
              maxLength={includeQuestion ? ASK_CONTACT_QUESTION_MAX_LENGTH : ASK_CONTACT_NOTE_MAX_LENGTH}
              placeholder="What would you like help with?"
              aria-describedby="ask-ai-contact-summary-help"
              className="mt-1 w-full resize-y rounded border border-surface-border bg-surface-bg px-3 py-2 text-base leading-relaxed text-text-primary placeholder:text-text-muted focus:border-brand-accent focus:outline-none"
            />
            <p id="ask-ai-contact-summary-help" className="mt-1 text-xs leading-relaxed text-text-muted">
              Edit what WitnessOps will receive. AI answers are not shared. Do not include secrets or customer evidence.
            </p>
          </div>
          <p className="text-xs leading-relaxed text-text-muted">
            Your email and summary are saved for this reply. Confirm your mailbox next.
            No mailing list or review booking.
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
              (offerRequiresSummary && !summary.trim()) ||
              (includeQuestion && !sharedQuestion.trim())
            }
            className="min-h-11 w-full rounded border border-brand-accent bg-brand-accent px-3 py-2 text-sm font-semibold text-text-inverse transition-colors hover:bg-text-primary disabled:cursor-not-allowed disabled:border-surface-border-strong disabled:bg-surface-inset disabled:text-text-muted disabled:opacity-100"
          >
            {status === "sending" ? "Sending code..." : "Send confirmation code"}
          </button>
        </form>
      )}
    </div>
  );
}
