"use client";

import { useId, useRef, useState, type Ref } from "react";

import {
  buildReviewRequestConfirmationText,
  type ReviewRequestConfirmation,
} from "@/lib/review-request-confirmation";
import styles from "./review-request-record.module.css";

type CopyState = "idle" | "copied" | "failed";

const copyByLocale = {
  en: {
    documentLabel: "WitnessOps / Request record",
    status: "Mailbox confirmed",
    kicker: "Recorded request / bounded status",
    title: "Request captured.",
    requestLabel: "Requested path",
    requestNames: {
      "agent-risk-control-review": "Agent Risk & Control Review",
      "public-exposure-review": "Public Exposure Review",
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
    fallbackLabel: "Clipboard blocked — select and copy this bounded record",
    footer: ["Mailbox", "Intake", "Boundary", "Next step"],
  },
  pl: {
    documentLabel: "WitnessOps / Zapis zgłoszenia",
    status: "Skrzynka potwierdzona",
    kicker: "Zapisane zgłoszenie / ograniczony status",
    title: "Zgłoszenie zapisane.",
    requestLabel: "Wybrana ścieżka",
    requestNames: {
      "agent-risk-control-review": "Agent Risk & Control Review",
      "public-exposure-review": "Public Exposure Review",
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
    fallbackLabel: "Schowek zablokowany — zaznacz i skopiuj ten ograniczony zapis",
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
        <strong>{text.status}</strong>
      </header>

      <div className={styles.body}>
        <p className={styles.kicker}>{text.kicker}</p>
        <h2
          ref={headingRef}
          id={titleId}
          className={styles.title}
          tabIndex={headingRef ? -1 : undefined}
        >
          {text.title}
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
            <dt>{text.reviewStarted}</dt>
            <dd className={styles.negative}>{text.no}</dd>
          </div>
          <div>
            <dt>{text.evidenceAccepted}</dt>
            <dd className={styles.negative}>{text.no}</dd>
          </div>
        </dl>

        <div className={styles.nextStep}>
          <span>{text.nextStepLabel}</span>
          <strong>{text.nextStep}</strong>
        </div>

        <p className={styles.boundary}>{text.boundary}</p>

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
