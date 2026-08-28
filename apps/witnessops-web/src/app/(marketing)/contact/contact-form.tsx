"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { verificationLight } from "@/components/shared/verification-light-shell";
import {
  buildReviewRequestConfirmation,
  resolveReviewRequestKind,
  reviewRequestConfirmationPath,
  storeReviewRequestConfirmation,
} from "@/lib/review-request-confirmation";
import type { EngageResponse, VerifyTokenResponse } from "@/lib/token-contract";
import { formatVerificationCode } from "@/lib/verification-code-format";
import {
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_SUBJECTS,
  PUBLIC_NO_SECRETS_NOTE,
  publicContactMailto,
} from "@/lib/public-contact";

type FieldName =
  | "name"
  | "email"
  | "org"
  | "workflow"
  | "agentPath"
  | "approvalBoundary"
  | "evidenceAvailable";

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--color-text-secondary)",
};

const inputClass =
  "min-h-12 w-full border border-text-muted bg-surface-card px-3 py-3 text-text-primary placeholder:text-text-secondary transition-colors focus:border-brand-accent focus:bg-surface-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg";

const textareaClass =
  "min-h-32 w-full border border-text-muted bg-surface-card px-3 py-3 text-text-primary placeholder:text-text-secondary transition-colors focus:border-brand-accent focus:bg-surface-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg md:min-h-24";

const buttonFocusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg";

const lightButtonFocusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b94716] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f5f1]";

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 16,
  letterSpacing: 0,
  scrollMarginTop: "calc(var(--app-navbar-height) + 16px)",
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
  locale = "en",
  intent = "review",
  campaignAttribution,
}: {
  locale?: "en" | "pl";
  intent?: string;
  campaignAttribution?: string;
}) {
  const router = useRouter();
  const invalidScrollScheduled = useRef(false);
  const verificationHeadingRef = useRef<HTMLHeadingElement>(null);
  const polish = locale === "pl";
  const externalExposureOrder = intent === "OFFSEC-EXTERNAL-EXPOSURE";
  const baseCopy = polish
    ? {
        sendError: "Nie udało się wysłać zgłoszenia. Spróbuj ponownie.",
        verifyError: "Nie udało się potwierdzić kodu. Spróbuj ponownie.",
        boundaryError: "Potwierdź granicę przed sprawdzeniem kodu.",
        emailError: "Wpisz prawidłowy służbowy adres e-mail.",
        requiredError: "To pole jest wymagane.",
        verifying: "Sprawdzanie kodu...",
        verificationSent: "Wiadomość weryfikacyjna została wysłana. Wpisz kod z wiadomości na tej stronie.",
        mailboxVerification: "Weryfikacja skrzynki pocztowej",
        enterCode: "Wpisz kod z wiadomości e-mail",
        codeSent: "Wysłaliśmy kod na adres",
        codeInstructions: "Pozostaw tę stronę otwartą i wpisz kod poniżej. Wiadomość zawiera tylko kod; link nie jest wymagany.",
        mailboxBoundary: "Weryfikacja skrzynki nie rozpoczyna przeglądu. Dopasowanie, zakres, cena, termin i obsługa materiałów są najpierw potwierdzane e-mailem.",
        verificationCode: "Kod weryfikacyjny",
        codeExpiry: "Nie udostępniaj tego kodu. Kod wygasa:",
        verificationConsent: "Rozumiem, że potwierdza to wyłącznie dostęp do skrzynki pocztowej. Przegląd nie rozpoczyna się na tym etapie. Nie wyślę danych poufnych, logów, zrzutów ekranu, eksportów kodu, danych uwierzytelniających, kluczy prywatnych, kodów MFA, danych klientów ani materiałów produkcyjnych, dopóki zakres i sposób obsługi materiałów nie zostaną uzgodnione.",
        confirming: "Potwierdzanie...",
        confirmMailbox: "Potwierdź skrzynkę",
        newRequest: "Rozpocznij nowe zgłoszenie",
        emailFollowup: "Dalszy kontakt e-mail",
        sending: "Wysyłanie...",
        requestSent: "Zgłoszenie wysłane. Wpisz kod z wiadomości e-mail na tej stronie.",
        fitTitle: "Zacznij od krótkiej, niepoufnej oceny dopasowania.",
        fitBody: "Opisz jedną potrzebę na wysokim poziomie. Bez plików i dowodów — najpierw uzgodnimy zakres oraz sposób obsługi materiałów.",
        name: "Imię i nazwisko",
        email: "Służbowy adres e-mail",
        organization: "Firma lub zespół",
        required: "(wymagane)",
        optional: "(opcjonalnie)",
        organizationPlaceholder: "Firma, zespół lub projekt",
        workflow: "Co wymaga sprawdzenia?",
        workflowPlaceholder: "Przykład: ankieta bezpieczeństwa, jeden serwer, planowane wdrożenie, zmiana dostępu, incydent lub jedno działanie techniczne.",
        workflowHelp: "Opisz jedną potrzebę ogólnie. Nie wklejaj danych poufnych, eksportów kodu, pełnych logów, zrzutów ekranu, danych uwierzytelniających, kluczy prywatnych, kodów MFA ani materiałów klienta.",
        actionPath: "Sytuacja i system objęty przeglądem",
        actionPathPlaceholder: "Wskaż ogólnie sytuację, środowisko lub system, którego dotyczy zgłoszenie. Nie podawaj danych dostępowych ani materiałów źródłowych.",
        approval: "Granica zakresu i zatwierdzenie",
        approvalPlaceholder: "Co jest w zakresie, kto zatwierdził działanie, z jakiego upoważnienia skorzystał i gdzie zatwierdzenie się kończy.",
        evidence: "Dostępne rodzaje materiałów",
        evidencePlaceholder: "Nazwij tylko rodzaje materiałów: zgłoszenia, prompty, logi, commity, zatwierdzenia, wyniki lub artefakty weryfikatora.",
        send: "Wyślij ocenę dopasowania",
        submitBoundary: "Wysłanie formularza otwiera wyłącznie etap oceny dopasowania i ustalania zakresu. Przegląd nie rozpoczyna się, dopóki zakres, cena, termin i sposób obsługi materiałów nie zostaną uzgodnione.",
        received: "Zgłoszenie odebrane. Wpisz na tej stronie kod wysłany na służbowy adres e-mail.",
        noSecrets: "Nie wysyłaj haseł, kluczy prywatnych, kluczy API, kodów odzyskiwania, tokenów sesji ani innych danych poufnych.",
      }
    : {
        sendError: "Failed to send. Please try again.",
        verifyError: "Verification failed. Please try again.",
        boundaryError: "Confirm the boundary before verifying the code.",
        emailError: "Enter a valid work email.",
        requiredError: "This field is required.",
        verifying: "Verifying code...",
        verificationSent: "Verification email sent. Enter the email code on this page.",
        mailboxVerification: "Mailbox verification",
        enterCode: "Enter your email code",
        codeSent: "We sent a code to",
        codeInstructions: "Keep this page open, then type the code below. The email contains the code only; no link is required.",
        mailboxBoundary: "Mailbox verification does not start a review. Fit, scope, price, timing and evidence handling are confirmed by email first.",
        verificationCode: "Verification code",
        codeExpiry: "Do not share this code. It expires at",
        verificationConsent: "I understand this confirms mailbox access only. No review starts here, and I will not send secrets, logs, screenshots, source exports, credentials, private keys, MFA codes, customer records, or production evidence until scope and evidence handling are agreed.",
        confirming: "Confirming...",
        confirmMailbox: "Confirm mailbox",
        newRequest: "Start a new request",
        emailFollowup: "Email follow-up",
        sending: "Sending...",
        requestSent: "Request sent. Enter the email code on this page.",
        fitTitle: "Start with a short, non-secret fit check.",
        fitBody: "Describe one review need at a high level. No files or evidence yet—we’ll agree scope and handling first.",
        name: "Your name",
        email: "Work email",
        organization: "Company or team",
        required: "(required)",
        optional: "(optional)",
        organizationPlaceholder: "Company, team, or project",
        workflow: "What do you need reviewed?",
        workflowPlaceholder: "Example: a security questionnaire, one server, a planned launch, an access change, an incident scenario, or one technical action.",
        workflowHelp: "Describe one review need at a high level. Do not paste secrets, source exports, full logs, screenshots, credentials, private keys, MFA codes, or customer evidence.",
        actionPath: "Situation and affected system",
        actionPathPlaceholder: "Name the situation, environment or affected system at a high level. Do not include access details or source material.",
        approval: "Boundary and approval",
        approvalPlaceholder: "What is in scope, who approved the action, what authority they used, and where approval stopped.",
        evidence: "Evidence available",
        evidencePlaceholder: "Name evidence types only: tickets, prompts, logs, commit records, approval records, outputs, verifier artifacts.",
        send: "Send fit check",
        submitBoundary: "Submitting this form only opens fit and scope review. No review starts until scope, price, timing and evidence handling are agreed.",
        received: "Request received. Enter the code from your work email on this page.",
        noSecrets: PUBLIC_NO_SECRETS_NOTE,
      };
  const copy = externalExposureOrder
    ? {
        ...baseCopy,
        mailboxBoundary: polish
          ? "Weryfikacja skrzynki nie rozpoczyna przeglądu. Najpierw asynchronicznie potwierdzamy zakres, upoważnienie, dostępność, cenę i warunki startu terminu dostawy."
          : "Mailbox verification does not start the review. Scope, authority, capacity, price, and delivery-clock conditions are accepted asynchronously first.",
        fitTitle: polish
          ? "Rozpocznij Public Exposure Review."
          : "Start your Public Exposure Review.",
        fitBody: polish
          ? "Wskaż jeden system publicznie dostępny i podstawę upoważnienia. Rozmowa sprzedażowa nie jest wymagana. Formularz rozpoczyna akceptację zakresu; nie upoważnia do testów ani nie uruchamia trzydniowego terminu."
          : "Tell us what public-facing system you want reviewed. We’ll confirm the exact boundary and authority before any testing begins.",
        workflow: polish ? "System publicznie dostępny do przeglądu" : "Public target",
        workflowPlaceholder: polish
          ? "example.com, api.example.com, aplikacja, API, publiczny adres IP lub endpoint chmurowy"
          : "example.com or api.example.com",
        workflowHelp: polish
          ? "Podaj domenę, host, aplikację, API, publiczny adres IP albo publiczny endpoint chmurowy. Nie wklejaj sekretów, logów, zrzutów ekranu ani danych dostępowych."
          : "Domain, hostname, public IP, API, application, or public cloud endpoint. No credentials or secrets.",
        actionPath: polish ? "Dlaczego teraz?" : "Why now?",
        actionPathPlaceholder: polish
          ? "Na przykład: uruchomienie, klient enterprise, audyt lub zmiana infrastruktury."
          : "For example: launch, enterprise customer, audit, or infrastructure change.",
        approval: polish ? "Podstawa upoważnienia" : "Authority to request this review",
        approvalPlaceholder: polish
          ? "Wskaż, że jesteś właścicielem domeny lub masz pisemne upoważnienie do zamówienia uzgodnionych kontroli."
          : "State that you own the domain or have written authority to commission the agreed checks.",
        evidence: polish
          ? "Znane granice first-party lub dostawców współdzielonych"
          : "Related endpoints or exclusions",
        evidencePlaceholder: polish
          ? "Opcjonalnie: znane hosty first-party, CDN, hosting współdzielony lub cele, których nie wolno dotykać."
          : "If the system uses several related public endpoints, list them here. We’ll confirm exactly what’s included before the review starts.",
        send: polish ? "Wyślij zgłoszenie do akceptacji zakresu" : "Start a review",
        submitBoundary: polish
          ? "Wysłanie formularza rozpoczyna wyłącznie asynchroniczną akceptację zakresu. Praca wobec celu zaczyna się dopiero po potwierdzeniu płatności, SOW, upoważnienia, stałego zakresu, wymaganych danych wejściowych i okna zbierania."
          : "Submitting this form begins asynchronous scope acceptance only. Target-facing work starts only after payment, the SOW, authority, fixed scope, required inputs, and the collection window are confirmed.",
      }
    : baseCopy;
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "verifying" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState(copy.sendError);
  const [verifyErrorMessage, setVerifyErrorMessage] = useState(copy.verifyError);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [verificationStep, setVerificationStep] = useState<VerificationStep | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationBoundaryAccepted, setVerificationBoundaryAccepted] = useState(false);

  useEffect(() => {
    if (!verificationStep) return;

    const frame = window.requestAnimationFrame(() => {
      const heading = verificationHeadingRef.current;
      if (!heading) return;
      heading.scrollIntoView({ block: "start", behavior: "auto" });
      heading.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [verificationStep]);

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
    setErrorMessage(copy.sendError);

    const form = e.currentTarget;
    const data = new FormData(form);
    const workflow = stringField(data, "workflow");
    const agentPath = stringField(data, "agentPath");
    const approvalBoundary = stringField(data, "approvalBoundary");
    const evidenceAvailable = stringField(data, "evidenceAvailable");
    const proofRunScope = [
      externalExposureOrder
        ? "Request: Public Exposure Review"
        : "Request: WitnessOps review fit check",
      `Selected product / intent: ${intent}`,
      `Request locale: ${locale}`,
      ...(campaignAttribution
        ? [`Campaign attribution: ${campaignAttribution}`]
        : []),
      `${externalExposureOrder ? "Boundary seed / public target" : "Review need"}: ${workflow || "not provided"}`,
      `${externalExposureOrder ? "Trigger and timing" : "Situation and affected system"}: ${agentPath || "not provided"}`,
      `${externalExposureOrder ? "Authority statement" : "Boundary and approval"}: ${approvalBoundary || "not provided"}`,
      `${externalExposureOrder ? "Proposed accepted asset set / exclusions" : "Evidence available"}: ${evidenceAvailable || "not provided"}`,
      "First-message boundary: no files, secrets, source exports, logs, screenshots, credentials, private keys, MFA codes, customer records, or unrelated production data requested in the form",
      externalExposureOrder
        ? "Follow-up needed: scope acceptance, authority evidence, target and check schedules, capacity, payment, collection window, evidence handling, and stop contact"
        : "Follow-up needed: fit, action boundary, authority boundary, likely evidence sources, possible proof pack contents, verifier path, challenge path, fee, and evidence handling",
    ].join("\n");

    try {
      const res = await fetch("/api/review/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          org: data.get("org"),
          email: data.get("email"),
          intent,
          locale,
          scope: proofRunScope,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: "Failed to send." }));
        if (typeof payload.error === "string" && payload.error.toLowerCase().includes("email")) {
          updateFieldError("email", copy.emailError);
        }
        throw new Error(polish ? copy.sendError : (payload.error ?? copy.sendError));
      }
      const payload = (await res.json().catch(() => null)) as
        | Partial<EngageResponse>
        | null;
      if (!payload?.issuanceId || !payload.email || !payload.expiresAt) {
        throw new Error(
          polish
            ? "Weryfikacja została rozpoczęta, ale odpowiedź była niepełna."
            : "Verification was issued, but the response was incomplete.",
        );
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
          : copy.sendError,
      );
    }
  }

  async function handleVerifySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!verificationStep) return;

    setVerifyStatus("verifying");
    setVerifyErrorMessage(copy.verifyError);

    try {
      if (!verificationBoundaryAccepted) {
        throw new Error(copy.boundaryError);
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
        throw new Error(polish ? copy.verifyError : (payload?.error ?? "Verification failed."));
      }

      if (payload.postVerifyPath === reviewRequestConfirmationPath(locale)) {
        const confirmation = buildReviewRequestConfirmation(payload, {
          locale,
          requestKind: resolveReviewRequestKind(intent),
          source: "request-form",
        });
        if (!confirmation) {
          throw new Error(
            polish
              ? "Skrzynka została potwierdzona, ale nie udało się potwierdzić granicy zgłoszenia."
              : "Mailbox confirmation completed, but the request boundary could not be confirmed.",
          );
        }
        try {
          storeReviewRequestConfirmation(window.sessionStorage, confirmation);
        } catch {
          throw new Error(
            polish
              ? "Skrzynka została potwierdzona, ale ta przeglądarka nie mogła zapisać zapisu zgłoszenia."
              : "Mailbox confirmation completed, but this browser could not store the request record.",
          );
        }
      }

      setVerificationCode("");
      setVerificationBoundaryAccepted(false);
      router.replace(payload.postVerifyPath);
    } catch (error) {
      setVerifyStatus("error");
      setVerifyErrorMessage(
        error instanceof Error && error.message.length > 0
          ? error.message
          : copy.verifyError,
      );
    }
  }

  function handleInvalid(
    e: React.InvalidEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const field = e.currentTarget;
    if (!invalidScrollScheduled.current) {
      invalidScrollScheduled.current = true;
      window.requestAnimationFrame(() => {
        field.scrollIntoView({ block: "start", behavior: "auto" });
        field.focus({ preventScroll: true });
        invalidScrollScheduled.current = false;
      });
    }
    if (polish) {
      field.setCustomValidity(
        field.validity.typeMismatch ? copy.emailError : copy.requiredError,
      );
    }
    updateFieldError(field.name as FieldName, field.validationMessage);
  }

  function handleFieldInput(
    e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const field = e.currentTarget;
    field.setCustomValidity("");
    if (polish && !field.validity.valid) {
      field.setCustomValidity(
        field.validity.typeMismatch ? copy.emailError : copy.requiredError,
      );
    }
    updateFieldError(field.name as FieldName, field.validity.valid ? "" : field.validationMessage);
  }

  if (verificationStep) {
    return (
      <div className="-m-4 rounded border border-[#cfc9bd] bg-[#f7f5f1] p-4 text-[#121212] sm:-m-6 sm:p-6 md:-m-8 md:p-8">
        <form
          onSubmit={handleVerifySubmit}
          method="post"
          action="/api/verify-token"
          className="space-y-5"
          aria-busy={verifyStatus === "verifying"}
        >
          <div id="witnessops-contact-status" className="sr-only" aria-live="polite" aria-atomic="true">
            {verifyStatus === "verifying"
              ? copy.verifying
              : copy.verificationSent}
          </div>

          <div className={`p-5 ${verificationLight.card}`}>
            <div className={`mb-2 ${verificationLight.label} ${verificationLight.trust}`}>
              {copy.mailboxVerification}
            </div>
            <h2
              ref={verificationHeadingRef}
              tabIndex={-1}
              className={`text-xl font-semibold uppercase leading-tight ${verificationLight.title}`}
              style={{
                fontFamily: "var(--font-display)",
                letterSpacing: "0.04em",
                scrollMarginTop: "calc(var(--app-navbar-height) + 16px)",
              }}
            >
              {copy.enterCode}
            </h2>
            <p className={`mt-3 text-sm leading-relaxed ${verificationLight.body}`}>
              {copy.codeSent} {verificationStep.email}. {copy.codeInstructions}
            </p>
            <p className={`mt-2 text-xs leading-relaxed ${verificationLight.muted}`}>
              {copy.mailboxBoundary}
            </p>
          </div>

          <div>
            <label htmlFor="verification-code" className={`mb-2 block ${verificationLight.label}`}>
              {copy.verificationCode}{" "}
              <span className={verificationLight.muted}>{copy.required}</span>
            </label>
            <input
              id="verification-code"
              name="verification-code"
              value={verificationCode}
              onChange={(event) => {
                setVerificationCode(formatVerificationCode(event.currentTarget.value));
                setVerifyErrorMessage(copy.verifyError);
                setVerifyStatus("idle");
              }}
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
              inputMode="text"
              required
              maxLength={80}
              placeholder="ABCD-EFGH-JKLM"
              className={verificationLight.input}
            />
            <p className={`mt-2 text-xs leading-relaxed ${verificationLight.muted}`}>
              {copy.codeExpiry} {verificationStep.expiresAt}.
            </p>
          </div>

          <label className={`flex gap-3 p-4 text-sm leading-relaxed ${verificationLight.cardMuted} ${verificationLight.body}`}>
            <input
              type="checkbox"
              checked={verificationBoundaryAccepted}
              onChange={(event) => {
                setVerificationBoundaryAccepted(event.currentTarget.checked);
                setVerifyErrorMessage(copy.verifyError);
                setVerifyStatus("idle");
              }}
              className="mt-1 h-4 w-4 shrink-0 accent-[#171713]"
            />
            <span>{copy.verificationConsent}</span>
          </label>

          {verifyStatus === "error" && (
            <div className={verificationLight.error} role="alert">
              {verifyErrorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={verifyStatus === "verifying" || !verificationBoundaryAccepted}
            className={`min-h-11 ${verificationLight.button} ${lightButtonFocusClass}`}
          >
            {verifyStatus === "verifying" ? copy.confirming : copy.confirmMailbox}
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
            className={`min-h-11 ${verificationLight.buttonSecondary} ${lightButtonFocusClass}`}
          >
            {copy.newRequest}
          </button>

          <div
            className={`border-t border-[#e4e0d8] pt-4 ${verificationLight.muted}`}
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em" }}
          >
            <div className="flex flex-wrap items-center gap-y-1">
              <span className={`whitespace-nowrap ${verificationLight.accent}`}>
                {copy.emailFollowup}
              </span>
              <span className="inline-flex items-center whitespace-nowrap">
                <span className="mx-2 text-[#cfc9bd]" aria-hidden="true">
                  &middot;
                </span>
                <a
                  href={publicContactMailto(PUBLIC_CONTACT_SUBJECTS.fitCheck)}
                  className="whitespace-nowrap underline decoration-[#cfc9bd] underline-offset-2 transition-colors hover:text-[#121212]"
                  style={{ color: "inherit" }}
                >
                  {PUBLIC_CONTACT_EMAIL}
                </a>
              </span>
            </div>
            <p className="mt-2">{copy.noSecrets}</p>
          </div>
        </form>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      method="post"
      action="/api/review/request"
      className="space-y-5"
      aria-busy={status === "sending"}
    >
      <input type="hidden" name="intent" value={intent} />
      <div id="witnessops-contact-status" className="sr-only" aria-live="polite" aria-atomic="true">
        {status === "sending"
          ? copy.sending
          : status === "sent"
            ? copy.requestSent
            : ""}
      </div>

      <div className="border-l-2 border-brand-accent bg-surface-inset p-4">
        <div className="text-sm font-semibold text-text-primary">
          {copy.fitTitle}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          {copy.fitBody}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-2 block" style={labelStyle}>{copy.name} <span className="text-text-muted">{copy.required}</span></label>
          <input
            id="name" name="name" type="text" required
            aria-invalid={fieldErrors.name ? true : undefined}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
            aria-errormessage={fieldErrors.name ? "name-error" : undefined}
            onInvalid={handleInvalid} onInput={handleFieldInput}
            className={`${inputClass} ${fieldErrors.name ? "!border-signal-red" : ""}`}
            style={inputStyle}
            placeholder={copy.name}
          />
          {fieldErrors.name && <p id="name-error" className="mt-1 text-xs text-signal-red" role="alert">{fieldErrors.name}</p>}
        </div>

        <div>
          <label htmlFor="email" className="mb-2 block" style={labelStyle}>{copy.email} <span className="text-text-muted">{copy.required}</span></label>
          <input
            id="email" name="email" type="email" required
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            aria-errormessage={fieldErrors.email ? "email-error" : undefined}
            onInvalid={handleInvalid} onInput={handleFieldInput}
            className={`${inputClass} ${fieldErrors.email ? "!border-signal-red" : ""}`}
            style={inputStyle}
            placeholder="buyer@company.com"
          />
          {fieldErrors.email && <p id="email-error" className="mt-1 text-xs text-signal-red" role="alert">{fieldErrors.email}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="org" className="mb-2 block" style={labelStyle}>{copy.organization} <span className="text-text-muted">{copy.optional}</span></label>
        <input
          id="org" name="org" type="text"
          aria-invalid={fieldErrors.org ? true : undefined}
          onInvalid={handleInvalid} onInput={handleFieldInput}
          className={`${inputClass} ${fieldErrors.org ? "!border-signal-red" : ""}`}
          style={inputStyle}
          placeholder={copy.organizationPlaceholder}
        />
        {fieldErrors.org && <p className="mt-1 text-xs text-signal-red">{fieldErrors.org}</p>}
      </div>

      <div>
        <label htmlFor="workflow" className="mb-2 block" style={labelStyle}>
          {copy.workflow} <span className="text-text-muted">{copy.required}</span>
        </label>
        <textarea
          id="workflow" name="workflow" rows={3} required
          aria-describedby={fieldErrors.workflow ? "workflow-helper workflow-error" : "workflow-helper"}
          aria-errormessage={fieldErrors.workflow ? "workflow-error" : undefined}
          className={`${textareaClass} ${fieldErrors.workflow ? "!border-signal-red" : ""}`}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
          placeholder={copy.workflowPlaceholder}
          onInvalid={handleInvalid}
          onInput={handleFieldInput}
          aria-invalid={fieldErrors.workflow ? true : undefined}
        />
        <p id="workflow-helper" className="mt-2 text-xs leading-relaxed text-text-muted">
          {copy.workflowHelp}
        </p>
        {fieldErrors.workflow && <p id="workflow-error" className="mt-1 text-xs text-signal-red" role="alert">{fieldErrors.workflow}</p>}
      </div>

      <div>
        <label htmlFor="agentPath" className="mb-2 block" style={labelStyle}>
          {copy.actionPath} <span className="text-text-muted">{externalExposureOrder ? copy.optional : copy.required}</span>
        </label>
        <textarea
          id="agentPath" name="agentPath" rows={3} required={!externalExposureOrder}
          className={`${textareaClass} ${fieldErrors.agentPath ? "!border-signal-red" : ""}`}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
          placeholder={copy.actionPathPlaceholder}
          onInvalid={handleInvalid}
          onInput={handleFieldInput}
          aria-invalid={fieldErrors.agentPath ? true : undefined}
          aria-describedby={fieldErrors.agentPath ? "agentPath-error" : undefined}
          aria-errormessage={fieldErrors.agentPath ? "agentPath-error" : undefined}
        />
        {fieldErrors.agentPath && <p id="agentPath-error" className="mt-1 text-xs text-signal-red" role="alert">{fieldErrors.agentPath}</p>}
      </div>

      <div>
        <label htmlFor="approvalBoundary" className="mb-2 block" style={labelStyle}>
          {copy.approval} <span className="text-text-muted">{copy.required}</span>
        </label>
        <textarea
          id="approvalBoundary" name="approvalBoundary" rows={3} required
          className={`${textareaClass} ${fieldErrors.approvalBoundary ? "!border-signal-red" : ""}`}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
          placeholder={copy.approvalPlaceholder}
          onInvalid={handleInvalid}
          onInput={handleFieldInput}
          aria-invalid={fieldErrors.approvalBoundary ? true : undefined}
          aria-describedby={fieldErrors.approvalBoundary ? "approvalBoundary-error" : undefined}
          aria-errormessage={fieldErrors.approvalBoundary ? "approvalBoundary-error" : undefined}
        />
        {fieldErrors.approvalBoundary && <p id="approvalBoundary-error" className="mt-1 text-xs text-signal-red" role="alert">{fieldErrors.approvalBoundary}</p>}
      </div>

      <div>
        <label htmlFor="evidenceAvailable" className="mb-2 block" style={labelStyle}>
          {copy.evidence} <span className="text-text-muted">{externalExposureOrder ? copy.optional : copy.required}</span>
        </label>
        <textarea
          id="evidenceAvailable" name="evidenceAvailable" rows={3} required={!externalExposureOrder}
          className={`${textareaClass} ${fieldErrors.evidenceAvailable ? "!border-signal-red" : ""}`}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
          placeholder={copy.evidencePlaceholder}
          onInvalid={handleInvalid}
          onInput={handleFieldInput}
          aria-invalid={fieldErrors.evidenceAvailable ? true : undefined}
          aria-describedby={fieldErrors.evidenceAvailable ? "evidenceAvailable-error" : undefined}
          aria-errormessage={fieldErrors.evidenceAvailable ? "evidenceAvailable-error" : undefined}
        />
        {fieldErrors.evidenceAvailable && <p id="evidenceAvailable-error" className="mt-1 text-xs text-signal-red" role="alert">{fieldErrors.evidenceAvailable}</p>}
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className={`min-h-11 w-full py-3 text-text-inverse bg-brand-accent disabled:opacity-50 transition-all hover:brightness-110 hover:shadow-[0_0_24px_rgba(255,107,53,0.3)] active:scale-[0.98] ${buttonFocusClass}`}
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        {status === "sending" ? copy.sending : copy.send}
      </button>

      <p className="text-xs leading-relaxed text-text-muted">
        {copy.submitBoundary}
      </p>

      {status === "sent" && (
        <div
          className="flex items-center gap-2 py-3"
          style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-signal-green)" }}
          role="status"
        >
          <span>&#10003;</span> {copy.received}
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

      <div
        className="pt-4 border-t border-surface-border"
        style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-brand-muted)", letterSpacing: "0.06em" }}
      >
        <div className="flex flex-wrap items-center gap-y-1">
          <span
            className="whitespace-nowrap"
            style={{ color: "var(--color-brand-accent)" }}
          >
            {copy.emailFollowup}
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
              href={publicContactMailto(PUBLIC_CONTACT_SUBJECTS.fitCheck)}
              className="whitespace-nowrap underline decoration-surface-border underline-offset-2 transition-colors hover:text-text-primary"
              style={{ color: "inherit" }}
            >
              {PUBLIC_CONTACT_EMAIL}
            </a>
          </span>
        </div>
        <p className="mt-2">{copy.noSecrets}</p>
      </div>
    </form>
  );
}
