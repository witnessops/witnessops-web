import { BUYER_SERVICES } from "@/lib/buyer-services";
import {
  ASK_AI_CONTACT_INTENT,
  MANUAL_COMMERCIAL_REQUEST_INTENTS,
} from "@/lib/commercial-request-intents";
import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  LEGACY_AGENT_ACTION_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
} from "@/lib/commercial-truth";
import {
  CURRENT_PUBLIC_CATALOG_SKU_IDS,
  PRIVATE_PREVIEW_CATALOG_SKU_IDS,
  REPLACED_CATALOG_SKU_IDS,
  UNRESOLVED_CATALOG_SKU_IDS,
} from "@/lib/public-commercial-routes";

/**
 * New-sales intake identities.
 *
 * Accept exactly one paid review: Agent Action by offerId, or External Attack
 * Surface Review by productId. Ask follow-up remains a non-review contact
 * intent and cannot also name a review. Historical catalogue ids, display
 * labels, pilots, and aliases do not select a review and do not rewrite
 * issued records.
 */
export const NEW_SALES_AGENT_ACTION_OFFER_ID = PUBLIC_AGENT_ACTION_OFFER.id;

export const NEW_SALES_EXTERNAL_PRODUCT_ID =
  EXTERNAL_ATTACK_SURFACE_OFFER.productId;

export const NEW_SALES_REVIEW_INTENTS = [
  NEW_SALES_AGENT_ACTION_OFFER_ID,
  NEW_SALES_EXTERNAL_PRODUCT_ID,
] as const;

export type NewSalesReviewIntent = (typeof NEW_SALES_REVIEW_INTENTS)[number];

export type IntakeRejectionReason =
  | "missing"
  | "ambiguous"
  | "wrong-role"
  | "historical"
  | "unsupported";

export type NewSalesIntakeDecision =
  | {
      accepted: true;
      role: "offer";
      intent: typeof NEW_SALES_AGENT_ACTION_OFFER_ID;
    }
  | {
      accepted: true;
      role: "product";
      intent: typeof NEW_SALES_EXTERNAL_PRODUCT_ID;
    }
  | {
      accepted: true;
      role: "contact";
      intent: typeof ASK_AI_CONTACT_INTENT;
    }
  | { accepted: false; reason: IntakeRejectionReason };

export type NewSalesPageDecision =
  | {
      state: "selected";
      role: "offer" | "product";
      intent: NewSalesReviewIntent;
    }
  | { state: "chooser" }
  | { state: "rejected"; reason: IntakeRejectionReason };

const AGENT_ACTION_NAMES = [
  PUBLIC_AGENT_ACTION_OFFER.name.en,
  PUBLIC_AGENT_ACTION_OFFER.name.pl,
] as const;

const EXTERNAL_NAMES = [
  EXTERNAL_ATTACK_SURFACE_OFFER.name.en,
  EXTERNAL_ATTACK_SURFACE_OFFER.name.pl,
] as const;

const HISTORICAL_IDS = new Set<string>([
  LEGACY_AGENT_ACTION_OFFER.id,
  "Third-party assessment",
  ...MANUAL_COMMERCIAL_REQUEST_INTENTS,
  ...BUYER_SERVICES.flatMap((service) =>
    service.productId ? [service.id, service.productId] : [service.id],
  ),
  ...CURRENT_PUBLIC_CATALOG_SKU_IDS,
]);

HISTORICAL_IDS.delete(NEW_SALES_AGENT_ACTION_OFFER_ID);
HISTORICAL_IDS.delete(NEW_SALES_EXTERNAL_PRODUCT_ID);
HISTORICAL_IDS.delete(ASK_AI_CONTACT_INTENT);
HISTORICAL_IDS.delete(EXTERNAL_ATTACK_SURFACE_OFFER.id);

const UNSUPPORTED_LABELS = new Set<string>([
  ...BUYER_SERVICES.flatMap((service) => [service.name.en, service.name.pl]),
  ...AGENT_ACTION_NAMES,
  ...EXTERNAL_NAMES,
  "AI Agent Tools & Access Review — Private Pilot",
  "Pilotaż przeglądu bezpieczeństwa 10 serwerów",
  "10-Server Security Pilot",
  "Free check",
  "Not sure",
  "early-bird",
  "Internet Footprint Review",
  ...PRIVATE_PREVIEW_CATALOG_SKU_IDS,
  ...REPLACED_CATALOG_SKU_IDS,
  ...UNRESOLVED_CATALOG_SKU_IDS,
]);

export type IntakeTokenClass =
  | "agent-offer"
  | "external-product"
  | "external-service"
  | "ask-contact"
  | "historical"
  | "unsupported";

export function classifyIntakeToken(value: string): IntakeTokenClass {
  if (value === NEW_SALES_AGENT_ACTION_OFFER_ID) return "agent-offer";
  if (value === NEW_SALES_EXTERNAL_PRODUCT_ID) return "external-product";
  if (value === EXTERNAL_ATTACK_SURFACE_OFFER.id) return "external-service";
  if (value === ASK_AI_CONTACT_INTENT) return "ask-contact";
  if (HISTORICAL_IDS.has(value)) return "historical";
  if (UNSUPPORTED_LABELS.has(value)) return "unsupported";
  return "unsupported";
}

export function newSalesEnquiryOptions(locale: "en" | "pl") {
  return [
    {
      intent: NEW_SALES_AGENT_ACTION_OFFER_ID,
      label: PUBLIC_AGENT_ACTION_OFFER.name[locale],
    },
    {
      intent: NEW_SALES_EXTERNAL_PRODUCT_ID,
      label: EXTERNAL_ATTACK_SURFACE_OFFER.name[locale],
    },
  ] as const;
}

export function newSalesRequestHref(
  locale: "en" | "pl",
  intent: NewSalesReviewIntent,
): string {
  const base = locale === "pl" ? "/pl/review/request" : "/review/request";
  return intent === NEW_SALES_AGENT_ACTION_OFFER_ID
    ? `${base}?offerId=${NEW_SALES_AGENT_ACTION_OFFER_ID}`
    : `${base}?productId=${NEW_SALES_EXTERNAL_PRODUCT_ID}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function namesAgree(
  offer: unknown,
  names: readonly string[],
): IntakeRejectionReason | null {
  if (offer === undefined) return null;
  if (typeof offer !== "string" || offer.length === 0 || !names.includes(offer)) {
    return "ambiguous";
  }
  return null;
}

function rejectionFor(kind: IntakeTokenClass): NewSalesIntakeDecision {
  if (kind === "external-service") {
    return { accepted: false, reason: "wrong-role" };
  }
  if (kind === "historical") {
    return { accepted: false, reason: "historical" };
  }
  if (kind === "agent-offer" || kind === "external-product" || kind === "ask-contact") {
    return { accepted: false, reason: "ambiguous" };
  }
  return { accepted: false, reason: "unsupported" };
}

/**
 * Fail closed on the raw JSON body before issuance.
 * Trimming, display names, and a second identity field are not aliases.
 */
export function evaluateNewSalesIntakeBody(raw: unknown): NewSalesIntakeDecision {
  if (!isRecord(raw)) return { accepted: false, reason: "unsupported" };

  const { intent, offerId, productId, offer } = raw;
  const sideFieldPresent =
    offerId !== undefined || productId !== undefined || offer !== undefined;

  if (intent === undefined || intent === "") {
    return {
      accepted: false,
      reason: sideFieldPresent ? "unsupported" : "missing",
    };
  }
  if (typeof intent !== "string") {
    return { accepted: false, reason: "unsupported" };
  }
  if (
    (offerId !== undefined && typeof offerId !== "string") ||
    (productId !== undefined && typeof productId !== "string") ||
    (offer !== undefined && typeof offer !== "string")
  ) {
    return { accepted: false, reason: "unsupported" };
  }

  const kind = classifyIntakeToken(intent);

  if (kind === "ask-contact") {
    if (sideFieldPresent) return { accepted: false, reason: "ambiguous" };
    return { accepted: true, role: "contact", intent: ASK_AI_CONTACT_INTENT };
  }

  if (kind === "agent-offer") {
    if (productId !== undefined) return { accepted: false, reason: "ambiguous" };
    if (typeof offerId === "string" && offerId !== intent) {
      return { accepted: false, reason: "ambiguous" };
    }
    const display = namesAgree(offer, AGENT_ACTION_NAMES);
    if (display) return { accepted: false, reason: display };
    return {
      accepted: true,
      role: "offer",
      intent: NEW_SALES_AGENT_ACTION_OFFER_ID,
    };
  }

  if (kind === "external-product") {
    if (offerId !== undefined) return { accepted: false, reason: "ambiguous" };
    if (typeof productId === "string" && productId !== intent) {
      return { accepted: false, reason: "ambiguous" };
    }
    const display = namesAgree(offer, EXTERNAL_NAMES);
    if (display) return { accepted: false, reason: display };
    return {
      accepted: true,
      role: "product",
      intent: NEW_SALES_EXTERNAL_PRODUCT_ID,
    };
  }

  return rejectionFor(kind);
}

type QueryField =
  | { state: "absent" }
  | { state: "one"; value: string }
  | { state: "many" };

function oneQueryField(value: string | string[] | undefined): QueryField {
  if (value === undefined) return { state: "absent" };
  const values = Array.isArray(value) ? value : [value];
  if (values.length !== 1) return { state: "many" };
  return { state: "one", value: values[0] ?? "" };
}

function pageDisplayAgrees(
  offer: QueryField,
  names: readonly string[],
): IntakeRejectionReason | null {
  if (offer.state === "many") return "ambiguous";
  if (offer.state === "absent") return null;
  if (!names.includes(offer.value)) return "ambiguous";
  return null;
}

/**
 * The request page may preselect only an exact new-sales identity.
 * Display text alone never selects a review.
 */
export function resolveNewSalesPageQuery(input: {
  offerId?: string | string[];
  productId?: string | string[];
  offer?: string | string[];
}): NewSalesPageDecision {
  const offerId = oneQueryField(input.offerId);
  const productId = oneQueryField(input.productId);
  const offer = oneQueryField(input.offer);

  if (offerId.state === "many" || productId.state === "many") {
    return { state: "rejected", reason: "ambiguous" };
  }
  if (offerId.state === "one" && productId.state === "one") {
    return { state: "rejected", reason: "ambiguous" };
  }

  if (offerId.state === "one") {
    const kind = classifyIntakeToken(offerId.value);
    if (kind === "external-product" || kind === "external-service") {
      return { state: "rejected", reason: "wrong-role" };
    }
    if (kind === "historical") return { state: "rejected", reason: "historical" };
    if (kind !== "agent-offer") return { state: "rejected", reason: "unsupported" };
    const display = pageDisplayAgrees(offer, AGENT_ACTION_NAMES);
    if (display) return { state: "rejected", reason: display };
    return {
      state: "selected",
      role: "offer",
      intent: NEW_SALES_AGENT_ACTION_OFFER_ID,
    };
  }

  if (productId.state === "one") {
    const kind = classifyIntakeToken(productId.value);
    if (kind === "agent-offer" || kind === "external-service") {
      return { state: "rejected", reason: "wrong-role" };
    }
    if (kind === "historical") return { state: "rejected", reason: "historical" };
    if (kind !== "external-product") {
      return { state: "rejected", reason: "unsupported" };
    }
    const display = pageDisplayAgrees(offer, EXTERNAL_NAMES);
    if (display) return { state: "rejected", reason: display };
    return {
      state: "selected",
      role: "product",
      intent: NEW_SALES_EXTERNAL_PRODUCT_ID,
    };
  }

  if (offer.state !== "absent") {
    return { state: "rejected", reason: "unsupported" };
  }

  return { state: "chooser" };
}
