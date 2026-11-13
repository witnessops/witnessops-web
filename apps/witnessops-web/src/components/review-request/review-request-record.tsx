"use client";

import { useId, useRef, useState, type Ref } from "react";

import {
  buildReviewRequestConfirmationText,
  type ReviewRequestConfirmation,
} from "@/lib/review-request-confirmation";
import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PRIMARY_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
  LEGACY_AGENT_ACTION_OFFER,
} from "@/lib/commercial-truth";
import styles from "./review-request-record.module.css";

type CopyState = "idle" | "copied" | "failed";

const copyByLocale = {
  en: {
    documentLabel: "WitnessOps / Request record",
    status: "Mailbox confirmed",
    kicker: "Recorded request / bounded status",
    title: "Request captured.",
    fitCallTitle: "Time requested.",
    fitCallStatus: "Mailbox confirmed / time request received",
    fitCallBookingLabel: "At request verification",
    fitCallBookingState: "Time not booked",
    fitCallEvidenceLabel: "Invitation by this form",
    fitCallEvidenceState: "None sent",
    fitCallNextStep: "Operator checks availability and confirms a time or replies with alternatives",
    fitCallBoundary: "This record confirms mailbox access and a time request at verification. It does not reserve time or start work. A later email or calendar invitation determines current status.",
    requestLabel: "Requested path",
    requestNames: {
      "fit-call": "20-minute expert conversation request",
      "agent-risk-control-review": LEGACY_AGENT_ACTION_OFFER.name.en,
      "agent-action-security-review": PUBLIC_AGENT_ACTION_OFFER.name.en,
      "agent-tools-access-review": PRIMARY_OFFER.name.en,
      "ai-agent-action-proof-run": "AI Agent Action Proof Run",
      "access-change-proof-run": "Access Change Proof Run",
      "public-exposure-review": EXTERNAL_ATTACK_SURFACE_OFFER.name.en,
      "customer-security-review-sprint": "Customer Security Review Sprint",
      "one-server-security-check": "One Server Security Check",
      "launch-readiness-check": "Launch Readiness Check",
      "key-access-custody-review": "Key, Access and Custody Review",
      "incident-readiness-review": "Incident Readiness Review",
      "professional-public-footprint-audit":
        "Professional Public Footprint Audit",
      "review-request": "WitnessOps review request",
    },
    reference: "Request reference",
    confirmedAt: "Confirmed at",
    reviewStarted: "Review started",
    evidenceAccepted: "Customer evidence accepted",
    no: "No",
    nextStepLabel: "Next step",
    nextStep: "Asynchronous fit and scope review",
    boundary:
      "This records mailbox access and intake capture only. It is not a proof receipt, verifier result, identity proof, scope acceptance, or start-of-work record.",
    copy: "Copy request record",
    copied: "Record copied",
    failed: "Select record below",
    fallbackLabel: "Clipboard blocked. Select and copy this bounded record",
    footer: ["Mailbox", "Intake", "Boundary", "Next step"],
  },
  pl: {
    documentLabel: "WitnessOps / Zapis zgłoszenia",
    status: "Skrzynka potwierdzona",
    kicker: "Zapisane zgłoszenie / ograniczony status",
    title: "Zgłoszenie zapisane.",
    fitCallTitle: "Poproszono o termin.",
    fitCallStatus: "Skrzynka potwierdzona / prośba o termin przyjęta",
    fitCallBookingLabel: "W chwili potwierdzenia zgłoszenia",
    fitCallBookingState: "Termin niezarezerwowany",
    fitCallEvidenceLabel: "Zaproszenie z tego formularza",
    fitCallEvidenceState: "Nie wysłano",
    fitCallNextStep: "Operator sprawdzi dostępność i potwierdzi termin albo zaproponuje inne",
    fitCallBoundary: "Ten zapis potwierdza dostęp do skrzynki i prośbę o termin w chwili weryfikacji. Nie rezerwuje terminu ani nie rozpoczyna pracy. Późniejsza wiadomość lub zaproszenie określa aktualny stan.",
    requestLabel: "Wybrana ścieżka",
    requestNames: {
      "fit-call": "Prośba o 20-minutową rozmowę z ekspertem",
      "agent-risk-control-review": LEGACY_AGENT_ACTION_OFFER.name.pl,
      "agent-action-security-review": PUBLIC_AGENT_ACTION_OFFER.name.pl,
      "agent-tools-access-review": PRIMARY_OFFER.name.pl,
      "ai-agent-action-proof-run": "AI Agent Action Proof Run",
      "access-change-proof-run": "Access Change Proof Run",
      "public-exposure-review": EXTERNAL_ATTACK_SURFACE_OFFER.name.pl,
      "customer-security-review-sprint": "Customer Security Review Sprint",
      "one-server-security-check": "One Server Security Check",
      "launch-readiness-check": "Launch Readiness Check",
      "key-access-custody-review": "Key, Access and Custody Review",
      "incident-readiness-review": "Incident Readiness Review",
      "professional-public-footprint-audit":
        "Audyt publicznego śladu zawodowego",
      "review-request": "Zgłoszenie przeglądu WitnessOps",
    },
    reference: "Numer referencyjny",
    confirmedAt: "Potwierdzono",
    reviewStarted: "Przegląd rozpoczęty",
    evidenceAccepted: "Materiały klienta przyjęte",
    no: "Nie",
    nextStepLabel: "Następny krok",
    nextStep: "Asynchroniczna ocena dopasowania i zakresu",
    boundary:
      "Ten zapis potwierdza wyłącznie dostęp do skrzynki i przyjęcie zgłoszenia. Nie jest paragonem dowodowym, wynikiem weryfikatora, potwierdzeniem tożsamości, akceptacją zakresu ani zapisem rozpoczęcia pracy.",
    copy: "Kopiuj zapis zgłoszenia",
    copied: "Zapis skopiowany",
    failed: "Zaznacz zapis poniżej",
    fallbackLabel: "Schowek zablokowany. Zaznacz i skopiuj ten ograniczony zapis",
    footer: ["Skrzynka", "Zgłoszenie", "Granica", "Następny krok"],
  },
} as const;

function displayTimestamp(timestamp: string): string {
  return timestamp.replace("T", " ").replace("Z", " UTC");
}

export function ReviewRequestRecord({
  confirmation,
  compact = false,
  headingRef,
}: {
  confirmation: ReviewRequestConfirmation;
  compact?: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const fallbackRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const fallbackId = useId();
  const text = copyByLocale[confirmation.locale];
  const recordText = buildReviewRequestConfirmationText(confirmation);
  const fitCall = confirmation.requestKind === "fit-call";

  async function copyRecord() {
    try {
      await navigator.clipboard.writeText(recordText);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
      window.requestAnimationFrame(() => {
        fallbackRef.current?.focus();
        fallbackRef.current?.select();
      });
    }
  }

  return (
    <article
      className={`${styles.record} ${compact ? styles.compact : ""}`}
      data-ui-proof-id="review-request-record"
      aria-labelledby={titleId}
    >
      <header className={styles.header}>
        <span>{text.documentLabel}</span>
        <strong>{fitCall ? text.fitCallStatus : text.status}</strong>
      </header>

      <div className={styles.body}>
        <p className={styles.kicker}>{text.kicker}</p>
        <h2
          ref={headingRef}
          id={titleId}
          className={styles.title}
          tabIndex={headingRef ? -1 : undefined}
        >
          {fitCall ? text.fitCallTitle : text.title}
        </h2>
        <p className={styles.requestName}>
          <span>{text.requestLabel}</span>
          <strong>{text.requestNames[confirmation.requestKind]}</strong>
        </p>

        <dl className={styles.facts}>
          <div className={styles.referenceFact}>
            <dt>{text.reference}</dt>
            <dd>
              <code>{confirmation.requestReference}</code>
            </dd>
          </div>
          <div>
            <dt>{text.confirmedAt}</dt>
            <dd>
              <time dateTime={confirmation.confirmedAt}>
                {displayTimestamp(confirmation.confirmedAt)}
              </time>
            </dd>
          </div>
          <div>
            <dt>{fitCall ? text.fitCallBookingLabel : text.reviewStarted}</dt>
            <dd className={styles.negative}>{fitCall ? text.fitCallBookingState : text.no}</dd>
          </div>
          <div>
            <dt>{fitCall ? text.fitCallEvidenceLabel : text.evidenceAccepted}</dt>
            <dd className={styles.negative}>{fitCall ? text.fitCallEvidenceState : text.no}</dd>
          </div>
        </dl>

        <div className={styles.nextStep}>
          <span>{text.nextStepLabel}</span>
          <strong>{fitCall ? text.fitCallNextStep : text.nextStep}</strong>
        </div>

        <p className={styles.boundary}>{fitCall ? text.fitCallBoundary : text.boundary}</p>

        <button
          type="button"
          onClick={() => void copyRecord()}
          className={styles.copyButton}
        >
          {copyState === "copied"
            ? text.copied
            : copyState === "failed"
              ? text.failed
              : text.copy}
        </button>
        <span className={styles.copyStatus} aria-live="polite">
          {copyState === "idle" ? "" : copyState === "copied" ? text.copied : text.failed}
        </span>
        {copyState === "failed" && (
          <div className={styles.copyFallback}>
            <label htmlFor={fallbackId}>
              {text.fallbackLabel}
            </label>
            <textarea
              ref={fallbackRef}
              id={fallbackId}
              readOnly
              value={recordText}
              rows={7}
            />
          </div>
        )}
      </div>

      <footer className={styles.footer} aria-hidden="true">
        {text.footer.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </footer>
    </article>
  );
}
