import "server-only";
import { hasLikelySecret } from "../secret-detection";

import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
} from "@/lib/commercial-truth";

export type AskCommercialFitResult =
  | "likely"
  | "needs_boundary"
  | "not_fit"
  | "unknown"
  | "blocked";

export type AskCommercialIntent =
  | "workflow"
  | "offer"
  | "specimen"
  | "other";

export interface AskCommercialFitAssessment {
  readonly schema: "witnessops.ask.commercial-fit.v1";
  readonly result: AskCommercialFitResult;
  readonly intent: AskCommercialIntent;
  readonly offer_id:
    | typeof PUBLIC_AGENT_ACTION_OFFER.id
    | typeof EXTERNAL_ATTACK_SURFACE_OFFER.id
    | null;
  readonly source: "ask";
  readonly offer: {
    readonly name: string;
    readonly price_label: string;
    readonly unit_label: string;
    readonly fit_check_label: string;
    readonly delivery_label: string;
  } | null;
  readonly matching_specimen_id: "ai-agent-action-proof-run" | null;
}

const BLOCKED_AUTHORITY_CLASSES = new Set([
  "secret_or_evidence_intake",
  "exploit_or_bypass_request",
]);

const LIKELY_FIT_AUTHORITY_CLASSES = new Set([
  "fit_check",
  "launch_readiness",
  "vendor_change",
  "ai_agent_action",
  "access_authority",
  "offline_inspection",
]);



const NAMED_OFFER_PATTERN = /\bagent action security review\b/i;
const EXTERNAL_OFFER_PATTERN =
  /\b(external attack surface(?: review)?|internet-facing)\b/i;
const WITHDRAWN_NEW_SALES_PATTERN =
  /\b(ai agent tools (?:&|and) access review|private pilot|internet footprint|one server security check|customer security review sprint|automation repair|early bird)\b/i;
const HISTORICAL_OFFER_PATTERN =
  /\b(agent workflow reconstruction|agent risk (?:&|and) control review|bounded workflow review)\b/i;
const OFFER_DETAIL_PATTERN =
  /\b(how much|price|pricing|cost|fee|deliverables?|what (?:is|isn't|is not) included|review scope)\b/i;
const OFFER_CONTEXT_PATTERN =
  /\b(witnessops|ai agent tools (?:&|and) access review|agent tools|agent access|workflow review)\b/i;
const AGENT_PATTERN =
  /\b(ai[- ]?agent|agentic|agent workflow|automated workflow|automation|autonomous agent|copilot)\b/i;
const CONSEQUENTIAL_ACTION_PATTERN =
  /\b(action|change|changed|changes|rotate|rotates|rotation|revoke|revoked|revocation|deploy|deployed|deployment|execute|executed|execution|modify|modified|update|updated|delete|deleted|approve|approved|authorize|authorized|authorization|production|credential|api[- ]?key|access|permission|workflow|tool|sensitive system)\b/i;
const REVIEW_PATTERN =
  /\b(review|scope|fit|risk|control|evidence|prove|proof|receipt|audit|inspect|challenge|authority|authorized|observed|unresolved|read[- ]?back)\b/i;
const SPECIMEN_PATTERN =
  /\b(compromised\b.{0,32}\bapi[- ]?keys?|api[- ]?keys?\b.{0,24}\brotation|rotation demo|public specimen|sample case|matching demo)\b/i;
const WHOLE_ESTATE_PATTERN =
  /\b(whole|entire|all)\b.{0,24}\b(cloud|estate|environment|company|infrastructure)\b/i;
const MULTI_WORKFLOW_PATTERN =
  /\b(?:all|every|multiple|many|several|full|entire)\b.{0,36}\b(?:ai[- ]?agents?|agents?|agentic|automated|automation)?\s*(?:workflows?|automations?|agents?)\b|\b(?:workflows|automations|ai[- ]?agents?)\b.{0,24}\b(?:across|throughout)\b/i;
const ACTIVE_INCIDENT_PATTERN =
  /\b(ransomware|active incident|ongoing incident|incident right now|active breach|ongoing breach|live breach|under attack)\b|\b(?:currently|right now|live)\b.{0,32}\b(?:being )?(?:hacked|attacked|breached|compromised)\b|\b(?:being|currently being)\s+(?:hacked|attacked|breached|compromised)\b/i;
const CERTIFICATION_PATTERN =
  /\b(certif(?:y|ies|ication)|compliant|compliance|soc\s*2|iso\s*27001|hipaa)\b/i;
const SECURITY_CONCLUSION_PATTERN =
  /\b(?:is|prove|verify|certify|guarantee)\b.{0,48}\b(?:secure|safe|vulnerability[- ]?free|production[- ]?ready|correct)\b|\b(?:secure|safe|vulnerability[- ]?free|production[- ]?ready)\b.{0,48}\b(?:prove|verify|certify|guarantee)\b/i;
const UNAUTHORIZED_CONTEXT_PATTERN =
  /\b(without (?:authorization|permission|consent|approval)|unauthorized|not authori[sz]ed|not approved|unapproved|no permission|no approval|competitor|rival)\b/i;
const UNAUTHORIZED_ACTION_PATTERN =
  /\b(test(?:s|ing)?|scan(?:s|ning)?|probe(?:s|d|ing)?|hack(?:s|ed|ing)?|exploit(?:s|ed|ing)?|access(?:es|ed|ing)?|enter(?:s|ed|ing)?|bypass(?:es|ed|ing)?|persist(?:s|ed|ing)?|attack(?:s|ed|ing)?|steal(?:s|ing)?|exfiltrat(?:e|es|ed|ing)|harvest(?:s|ed|ing)?|scrape(?:s|d|ing)?)\b/i;

function normalize(input: string): string {
  return input.normalize("NFKC").trim().replace(/\s+/g, " ");
}



function isUnauthorizedRequest(input: string): boolean {
  return (
    UNAUTHORIZED_CONTEXT_PATTERN.test(input) &&
    UNAUTHORIZED_ACTION_PATTERN.test(input)
  );
}

function isOfferQuestion(input: string): boolean {
  return (
    NAMED_OFFER_PATTERN.test(input) ||
    (OFFER_DETAIL_PATTERN.test(input) && OFFER_CONTEXT_PATTERN.test(input))
  );
}

function matchingSpecimenId(
  input: string,
): AskCommercialFitAssessment["matching_specimen_id"] {
  if (SPECIMEN_PATTERN.test(input)) {
    return "ai-agent-action-proof-run";
  }

  if (
    /\b(api[- ]?keys?|credentials?)\b/i.test(input) &&
    /\b(compromis|rotat|revok)/i.test(input)
  ) {
    return "ai-agent-action-proof-run";
  }

  return null;
}

type PublicAskOffer = "agent-action" | "external";

const AGENT_ACTION_FIT = {
  name: PUBLIC_AGENT_ACTION_OFFER.name.en,
  price_label: PUBLIC_AGENT_ACTION_OFFER.price.en,
  unit_label: PUBLIC_AGENT_ACTION_OFFER.unit.en,
  fit_check_label: PUBLIC_AGENT_ACTION_OFFER.fitCheck.en,
  delivery_label: PUBLIC_AGENT_ACTION_OFFER.timing.en,
} as const;

const EXTERNAL_FIT = {
  name: EXTERNAL_ATTACK_SURFACE_OFFER.name.en,
  price_label: EXTERNAL_ATTACK_SURFACE_OFFER.price.en,
  unit_label:
    "One authorised public-facing system. One focused retest within 30 calendar days of initial report handover.",
  fit_check_label: "Non-secret fit check first. This is not a penetration test.",
  delivery_label: EXTERNAL_ATTACK_SURFACE_OFFER.timing.en,
} as const;

function publicOffer(which: PublicAskOffer) {
  return which === "agent-action"
    ? {
        id: PUBLIC_AGENT_ACTION_OFFER.id,
        offer: AGENT_ACTION_FIT,
      }
    : {
        id: EXTERNAL_ATTACK_SURFACE_OFFER.id,
        offer: EXTERNAL_FIT,
      };
}

function selectPublicOffer(question: string): PublicAskOffer | "ambiguous" | null {
  const agent =
    NAMED_OFFER_PATTERN.test(question) ||
    (AGENT_PATTERN.test(question) &&
      (CONSEQUENTIAL_ACTION_PATTERN.test(question) || REVIEW_PATTERN.test(question)));
  const external = EXTERNAL_OFFER_PATTERN.test(question);
  if (agent && external) return "ambiguous";
  if (external) return "external";
  if (agent) return "agent-action";
  return null;
}

function assessment(
  result: AskCommercialFitResult,
  intent: AskCommercialIntent,
  matchingSpecimen: AskCommercialFitAssessment["matching_specimen_id"] = null,
  which: PublicAskOffer | null = result === "likely" || result === "needs_boundary"
    ? "agent-action"
    : null,
): AskCommercialFitAssessment {
  const selected = which ? publicOffer(which) : null;
  const presentsOffer =
    selected !== null && (result === "likely" || result === "needs_boundary");

  return {
    schema: "witnessops.ask.commercial-fit.v1",
    result,
    intent,
    offer_id: presentsOffer ? selected.id : null,
    source: "ask",
    offer: presentsOffer ? selected.offer : null,
    matching_specimen_id: matchingSpecimen,
  };
}

export function classifyCommercialFit(args: {
  question: string;
  authorityQuestionClassId: string;
}): AskCommercialFitAssessment {
  const question = normalize(args.question);
  const authorityClass = args.authorityQuestionClassId;

  if (
    hasLikelySecret(question) ||
    isUnauthorizedRequest(question) ||
    BLOCKED_AUTHORITY_CLASSES.has(authorityClass)
  ) {
    return assessment("blocked", "other");
  }

  if (
    CERTIFICATION_PATTERN.test(question) ||
    ACTIVE_INCIDENT_PATTERN.test(question) ||
    SECURITY_CONCLUSION_PATTERN.test(question) ||
    authorityClass === "unsupported_verification_claim"
  ) {
    return assessment("not_fit", "other");
  }

  // Withdrawn, pilot, and historical names do not select a current new-sales review.
  if (
    (WITHDRAWN_NEW_SALES_PATTERN.test(question) ||
      HISTORICAL_OFFER_PATTERN.test(question)) &&
    !NAMED_OFFER_PATTERN.test(question) &&
    !EXTERNAL_OFFER_PATTERN.test(question)
  ) {
    return assessment("unknown", "other");
  }

  const selection = selectPublicOffer(question);
  if (selection === "ambiguous") {
    return assessment("unknown", "other");
  }
  const offerChoice: PublicAskOffer = selection === "external" ? "external" : "agent-action";

  const specimenId = matchingSpecimenId(question);

  if (
    WHOLE_ESTATE_PATTERN.test(question) ||
    MULTI_WORKFLOW_PATTERN.test(question)
  ) {
    return assessment("needs_boundary", "workflow", specimenId, offerChoice);
  }

  if (selection === "external") {
    return assessment(
      "likely",
      OFFER_DETAIL_PATTERN.test(question) ? "offer" : "workflow",
      specimenId,
      "external",
    );
  }

  // A generic infrastructure or vendor price question is not an inquiry about
  // the WitnessOps review merely because it mentions an automated workflow.
  if (OFFER_DETAIL_PATTERN.test(question) && !isOfferQuestion(question)) {
    return assessment("unknown", "other");
  }

  if (LIKELY_FIT_AUTHORITY_CLASSES.has(authorityClass)) {
    const intent =
      authorityClass === "fit_check" || isOfferQuestion(question)
        ? "offer"
        : "workflow";
    return assessment("likely", intent, specimenId, offerChoice);
  }

  if (authorityClass === "private_system_verification") {
    return assessment("needs_boundary", "workflow", specimenId, offerChoice);
  }

  if (authorityClass === "incident") {
    return assessment("needs_boundary", "workflow", specimenId, offerChoice);
  }

  if (isOfferQuestion(question)) {
    return assessment("likely", "offer", specimenId, offerChoice);
  }

  if (
    AGENT_PATTERN.test(question) &&
    (CONSEQUENTIAL_ACTION_PATTERN.test(question) || REVIEW_PATTERN.test(question))
  ) {
    return assessment("likely", "workflow", specimenId, offerChoice);
  }

  if (specimenId) {
    return assessment("needs_boundary", "specimen", specimenId, offerChoice);
  }

  return assessment("unknown", "other");
}
