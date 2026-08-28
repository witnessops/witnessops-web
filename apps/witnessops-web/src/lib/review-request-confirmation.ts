import { z } from "zod";

import { verifyTokenResponseSchema } from "@/lib/token-contract";

export const REVIEW_REQUEST_CONFIRMATION_STORAGE_KEY =
  "witnessops.review-request-confirmation.v1" as const;

export type ReviewRequestConfirmationLocale = "en" | "pl";
export type ReviewRequestKind =
  | "agent-risk-control-review"
  | "public-exposure-review"
  | "review-request";

const reviewRequestConfirmationSchema = z.object({
  schema: z.literal("witnessops.review-request-confirmation.v1"),
  requestReference: z.string().min(1).max(240),
  confirmedAt: z.string().datetime({ offset: true }),
  locale: z.enum(["en", "pl"]),
  requestKind: z.enum([
    "agent-risk-control-review",
    "public-exposure-review",
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
  if (intent.trim() === "bounded-workflow-review") {
    return "agent-risk-control-review";
  }
  if (intent.trim() === "OFFSEC-EXTERNAL-EXPOSURE") {
    return "public-exposure-review";
  }
  return "review-request";
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
  const requestLabel = polish
    ? confirmation.requestKind === "agent-risk-control-review"
      ? "Agent Risk & Control Review"
      : confirmation.requestKind === "public-exposure-review"
        ? "Public Exposure Review"
        : "Zgłoszenie przeglądu WitnessOps"
    : confirmation.requestKind === "agent-risk-control-review"
      ? "Agent Risk & Control Review"
      : confirmation.requestKind === "public-exposure-review"
        ? "Public Exposure Review"
        : "WitnessOps review request";

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
