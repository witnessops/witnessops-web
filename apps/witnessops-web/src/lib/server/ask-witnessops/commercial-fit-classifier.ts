import "server-only";

import { PRIMARY_OFFER } from "@/lib/commercial-truth";

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
  readonly offer_id: typeof PRIMARY_OFFER.id | null;
  readonly source: "ask";
  readonly offer: {
    readonly name: (typeof PRIMARY_OFFER.name)["en"];
    readonly price_label: (typeof PRIMARY_OFFER.price)["en"];
    readonly unit_label: (typeof PRIMARY_OFFER.unit)["en"];
    readonly fit_check_label: (typeof PRIMARY_OFFER.fitCheck)["en"];
    readonly delivery_label: (typeof PRIMARY_OFFER.timing)["en"];
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

const SECRET_PATTERNS = [
  /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----/i,
  /\bAuthorization\s*:\s*Basic\s+[A-Za-z0-9+/=]{4,}/i,
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,
  /\b(?:sk|rk|pk)[_-](?:live|test|proj)?[_-]?[A-Za-z0-9_-]{16,}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/i,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/,
  /\b(?:aws[_-]?)?(?:secret[_-]?access[_-]?key|access[_-]?key|client[_-]?secret|password|passwd|secret|token|api[_ -]?key|private[_ -]?key)["']?\s*[:=]\s*["']?[A-Za-z0-9_./+=:-]{8,}/i,
] as const;

const NAMED_OFFER_PATTERN =
  /\b(agent workflow reconstruction|agent risk (?:&|and) control review|what does witnessops do|what can witnessops do)\b/i;
const OFFER_DETAIL_PATTERN =
  /\b(how much|price|pricing|cost|fee|deliverables?|what (?:is|isn't|is not) included|review scope)\b/i;
const OFFER_CONTEXT_PATTERN =
  /\b(witnessops|agent workflow reconstruction|agent risk|control review|workflow review|review (?:of )?one (?:agentic |automated |ai[- ]?agent )?workflow)\b/i;
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

function hasLikelySecret(input: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(input));
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

function assessment(
  result: AskCommercialFitResult,
  intent: AskCommercialIntent,
  matchingSpecimen: AskCommercialFitAssessment["matching_specimen_id"] = null,
): AskCommercialFitAssessment {
  const presentsOffer = result === "likely" || result === "needs_boundary";

  return {
    schema: "witnessops.ask.commercial-fit.v1",
    result,
    intent,
    offer_id: presentsOffer ? PRIMARY_OFFER.id : null,
    source: "ask",
    offer: presentsOffer
      ? {
          name: PRIMARY_OFFER.name.en,
          price_label: PRIMARY_OFFER.price.en,
          unit_label: PRIMARY_OFFER.unit.en,
          fit_check_label: PRIMARY_OFFER.fitCheck.en,
          delivery_label: PRIMARY_OFFER.timing.en,
        }
      : null,
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

  const specimenId = matchingSpecimenId(question);

  if (
    WHOLE_ESTATE_PATTERN.test(question) ||
    MULTI_WORKFLOW_PATTERN.test(question)
  ) {
    return assessment("needs_boundary", "workflow", specimenId);
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
    return assessment("likely", intent, specimenId);
  }

  if (authorityClass === "private_system_verification") {
    return assessment("needs_boundary", "workflow", specimenId);
  }

  if (authorityClass === "incident") {
    return assessment("needs_boundary", "workflow", specimenId);
  }

  if (isOfferQuestion(question)) {
    return assessment("likely", "offer", specimenId);
  }

  if (
    AGENT_PATTERN.test(question) &&
    (CONSEQUENTIAL_ACTION_PATTERN.test(question) || REVIEW_PATTERN.test(question))
  ) {
    return assessment("likely", "workflow", specimenId);
  }

  if (specimenId) {
    return assessment("needs_boundary", "specimen", specimenId);
  }

  return assessment("unknown", "other");
}
