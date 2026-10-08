import { PUBLIC_PAID_REVIEW_IDS, type PublicPaidReviewId } from "./public-paid-reviews";

/** New issuance only. Never apply this policy to stored requests or token verification. */
export const AI_REVIEW_REQUEST_INTENT = PUBLIC_PAID_REVIEW_IDS[0];
export const EXTERNAL_REVIEW_REQUEST_INTENT = "OFFSEC-EXTERNAL-EXPOSURE" as const;
export type NewReviewIntent =
  | typeof AI_REVIEW_REQUEST_INTENT
  | typeof EXTERNAL_REVIEW_REQUEST_INTENT
  | "review"
  | "ask-ai-contact";

export type NewReviewSelection =
  | { kind: "fit" }
  | { kind: "unavailable" }
  | { kind: "selected"; serviceId: PublicPaidReviewId; intent: NewReviewIntent };

const selectionKeys = ["offerId", "productId", "offer", "enquiryPath"] as const;

/** Only identifier roles select an offer. The optional display label is never authority. */
export function resolveNewReviewSelection(params: Record<string, unknown>): NewReviewSelection {
  for (const key of selectionKeys) {
    if (Object.hasOwn(params, key) && typeof params[key] !== "string") {
      return { kind: "unavailable" };
    }
  }
  if (Object.hasOwn(params, "enquiryPath")) return { kind: "unavailable" };
  const hasOffer = Object.hasOwn(params, "offerId");
  const hasProduct = Object.hasOwn(params, "productId");
  if (hasOffer && hasProduct) return { kind: "unavailable" };
  if (hasOffer) {
    return params.offerId === AI_REVIEW_REQUEST_INTENT
      ? { kind: "selected", serviceId: PUBLIC_PAID_REVIEW_IDS[0], intent: AI_REVIEW_REQUEST_INTENT }
      : { kind: "unavailable" };
  }
  if (hasProduct) {
    return params.productId === EXTERNAL_REVIEW_REQUEST_INTENT
      ? { kind: "selected", serviceId: PUBLIC_PAID_REVIEW_IDS[1], intent: EXTERNAL_REVIEW_REQUEST_INTENT }
      : { kind: "unavailable" };
  }
  return Object.hasOwn(params, "offer") ? { kind: "unavailable" } : { kind: "fit" };
}

export type NewReviewIntakeDecision =
  | { ok: true; intent: NewReviewIntent }
  | { ok: false };

/**
 * Validate raw JSON before schema parsing can strip selector aliases. Generic review
 * and Ask contact are fit contexts, not extra products. Free text is never routing
 * authority. Retired structured landing choices require a fresh explicit selection.
 */
export function validateNewReviewIntake(raw: unknown): NewReviewIntakeDecision {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false };
  const data = raw as Record<string, unknown>;
  if (selectionKeys.some((key) => Object.hasOwn(data, key))) return { ok: false };
  const intent = Object.hasOwn(data, "intent") ? data.intent : "review";
  if (intent !== AI_REVIEW_REQUEST_INTENT && intent !== EXTERNAL_REVIEW_REQUEST_INTENT && intent !== "review" && intent !== "ask-ai-contact") {
    return { ok: false };
  }
  if (typeof data.scope === "string") {
    if (/^\s*Enquiry path:/m.test(data.scope)) return { ok: false };
    const declared = [...data.scope.matchAll(/^Selected product \/ intent:\s*([^\r\n]*)/gm)];
    if (declared.length > 1 || (declared.length === 1 && declared[0]?.[1]?.trim() !== intent)) {
      return { ok: false };
    }
  }
  return { ok: true, intent };
}
