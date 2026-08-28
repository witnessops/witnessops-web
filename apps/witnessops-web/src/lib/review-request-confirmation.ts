import { z } from "zod";

import {
  ACCESS_CHANGE_PROOF_RUN_INTENT,
  AI_AGENT_ACTION_PROOF_RUN_INTENT,
  BOUNDED_WORKFLOW_REVIEW_INTENT,
  CUSTOMER_SECURITY_REVIEW_SPRINT_INTENT,
  EXTERNAL_EXPOSURE_ASSESSMENT_INTENT,
  INCIDENT_READINESS_REVIEW_INTENT,
  KEY_ACCESS_CUSTODY_REVIEW_INTENT,
  LAUNCH_READINESS_CHECK_INTENT,
  ONE_SERVER_SECURITY_CHECK_INTENT,
  PROFESSIONAL_PUBLIC_FOOTPRINT_AUDIT_INTENT,
} from "@/lib/commercial-request-intents";
import { verifyTokenResponseSchema } from "@/lib/token-contract";

export const REVIEW_REQUEST_CONFIRMATION_STORAGE_KEY =
  "witnessops.review-request-confirmation.v1" as const;

export type ReviewRequestConfirmationLocale = "en" | "pl";
export type ReviewRequestKind =
  | "agent-risk-control-review"
  | "ai-agent-action-proof-run"
  | "access-change-proof-run"
  | "public-exposure-review"
  | "customer-security-review-sprint"
  | "one-server-security-check"
  | "launch-readiness-check"
  | "key-access-custody-review"
  | "incident-readiness-review"
  | "professional-public-footprint-audit"
  | "review-request";

const reviewRequestConfirmationSchema = z.object({
  schema: z.literal("witnessops.review-request-confirmation.v1"),
  requestReference: z.string().min(1).max(240),
  confirmedAt: z.string().datetime({ offset: true }),
  locale: z.enum(["en", "pl"]),
  requestKind: z.enum([
    "agent-risk-control-review",
    "ai-agent-action-proof-run",
    "access-change-proof-run",
    "public-exposure-review",
    "customer-security-review-sprint",
    "one-server-security-check",
    "launch-readiness-check",
    "key-access-custody-review",
    "incident-readiness-review",
    "professional-public-footprint-audit",
    "review-request",
  ]),
  source: z.enum(["ask", "request-form"]),
});

export type ReviewRequestConfirmation = z.infer<
  typeof reviewRequestConfirmationSchema
>;

export function reviewRequestConfirmationPath(
  locale: ReviewRequestConfirmationLocale,
): string {
  return locale === "pl"
    ? "/pl/review/request/confirmed"
    : "/review/request/confirmed";
}

export function resolveReviewRequestKind(intent: string): ReviewRequestKind {
  const normalizedIntent = intent.trim();
  switch (normalizedIntent) {
    case BOUNDED_WORKFLOW_REVIEW_INTENT:
      return "agent-risk-control-review";
    case AI_AGENT_ACTION_PROOF_RUN_INTENT:
      return "ai-agent-action-proof-run";
    case ACCESS_CHANGE_PROOF_RUN_INTENT:
      return "access-change-proof-run";
    case EXTERNAL_EXPOSURE_ASSESSMENT_INTENT:
      return "public-exposure-review";
    case CUSTOMER_SECURITY_REVIEW_SPRINT_INTENT:
      return "customer-security-review-sprint";
    case ONE_SERVER_SECURITY_CHECK_INTENT:
      return "one-server-security-check";
    case LAUNCH_READINESS_CHECK_INTENT:
      return "launch-readiness-check";
    case KEY_ACCESS_CUSTODY_REVIEW_INTENT:
      return "key-access-custody-review";
    case INCIDENT_READINESS_REVIEW_INTENT:
      return "incident-readiness-review";
    case PROFESSIONAL_PUBLIC_FOOTPRINT_AUDIT_INTENT:
      return "professional-public-footprint-audit";
    default:
      return "review-request";
  }
}

export function buildReviewRequestConfirmation(
  payload: unknown,
  context: {
    locale: ReviewRequestConfirmationLocale;
    requestKind: ReviewRequestKind;
    source: "ask" | "request-form";
  },
): ReviewRequestConfirmation | null {
  const parsed = verifyTokenResponseSchema.safeParse(payload);
  if (!parsed.success) return null;

  const response = parsed.data;
  if (
    response.channel !== "engage" ||
    response.status !== "verified" ||
    response.admissionState !== "admitted" ||
    response.assessmentRunId !== null ||
    response.assessmentStatus !== "unavailable" ||
    response.postVerifyPath !== reviewRequestConfirmationPath(context.locale)
  ) {
    return null;
  }

  return reviewRequestConfirmationSchema.parse({
    schema: "witnessops.review-request-confirmation.v1",
    requestReference: response.intakeId,
    confirmedAt: response.verifiedAt,
    locale: context.locale,
    requestKind: context.requestKind,
    source: context.source,
  });
}

export function storeReviewRequestConfirmation(
  storage: Pick<Storage, "setItem">,
  confirmation: ReviewRequestConfirmation,
): void {
  storage.setItem(
    REVIEW_REQUEST_CONFIRMATION_STORAGE_KEY,
    JSON.stringify(reviewRequestConfirmationSchema.parse(confirmation)),
  );
}

export function readReviewRequestConfirmation(
  storage: Pick<Storage, "getItem">,
  locale: ReviewRequestConfirmationLocale,
): ReviewRequestConfirmation | null {
  try {
    const serialized = storage.getItem(REVIEW_REQUEST_CONFIRMATION_STORAGE_KEY);
    if (!serialized) return null;

    const parsed = reviewRequestConfirmationSchema.safeParse(
      JSON.parse(serialized),
    );
    if (!parsed.success) return null;
    return { ...parsed.data, locale };
  } catch {
    return null;
  }
}

export function buildReviewRequestConfirmationText(
  confirmation: ReviewRequestConfirmation,
): string {
  const polish = confirmation.locale === "pl";
  const requestLabels: Record<
    ReviewRequestConfirmationLocale,
    Record<ReviewRequestKind, string>
  > = {
    en: {
      "agent-risk-control-review": "Agent Risk & Control Review",
      "ai-agent-action-proof-run": "AI Agent Action Proof Run",
      "access-change-proof-run": "Access Change Proof Run",
      "public-exposure-review": "Public Exposure Review",
      "customer-security-review-sprint": "Customer Security Review Sprint",
      "one-server-security-check": "One Server Security Check",
      "launch-readiness-check": "Launch Readiness Check",
      "key-access-custody-review": "Key, Access and Custody Review",
      "incident-readiness-review": "Incident Readiness Review",
      "professional-public-footprint-audit":
        "Professional Public Footprint Audit",
      "review-request": "WitnessOps review request",
    },
    pl: {
      "agent-risk-control-review": "Agent Risk & Control Review",
      "ai-agent-action-proof-run": "AI Agent Action Proof Run",
      "access-change-proof-run": "Access Change Proof Run",
      "public-exposure-review": "Public Exposure Review",
      "customer-security-review-sprint": "Customer Security Review Sprint",
      "one-server-security-check": "One Server Security Check",
      "launch-readiness-check": "Launch Readiness Check",
      "key-access-custody-review": "Key, Access and Custody Review",
      "incident-readiness-review": "Incident Readiness Review",
      "professional-public-footprint-audit":
        "Audyt publicznego śladu zawodowego",
      "review-request": "Zgłoszenie przeglądu WitnessOps",
    },
  };
  const requestLabel = requestLabels[confirmation.locale][confirmation.requestKind];

  return polish
    ? [
        "WITNESSOPS / ZAPIS ZGŁOSZENIA",
        `Zgłoszenie: ${requestLabel}`,
        `Numer referencyjny: ${confirmation.requestReference}`,
        `Potwierdzono: ${confirmation.confirmedAt}`,
        "Dostęp do skrzynki: POTWIERDZONY",
        "Przegląd rozpoczęty: NIE",
        "Materiały klienta przyjęte: NIE",
        "Zakres, cena, termin i obsługa materiałów uzgodnione: NIE",
        "Wniosek dotyczący bezpieczeństwa lub zgodności: BRAK",
        "",
        "Ten zapis potwierdza wyłącznie dostęp do skrzynki i przyjęcie zgłoszenia. Nie jest paragonem dowodowym, wynikiem weryfikatora, potwierdzeniem tożsamości, akceptacją zakresu ani zapisem rozpoczęcia pracy.",
      ].join("\n")
    : [
        "WITNESSOPS / REQUEST RECORD",
        `Request: ${requestLabel}`,
        `Request reference: ${confirmation.requestReference}`,
        `Confirmed at: ${confirmation.confirmedAt}`,
        "Mailbox access: CONFIRMED",
        "Review started: NO",
        "Customer evidence accepted: NO",
        "Scope, fee, timing, and evidence handling agreed: NO",
        "Security or compliance conclusion: NONE",
        "",
        "This record confirms mailbox access and intake capture only. It is not a proof receipt, verifier result, identity proof, scope acceptance, or start-of-work record.",
      ].join("\n");
}
