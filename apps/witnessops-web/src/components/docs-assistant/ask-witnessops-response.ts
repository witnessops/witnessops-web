import { PRIMARY_OFFER } from "@/lib/commercial-truth";

export interface AskWitnessOpsPresentedSource {
  readonly source_id: string;
  readonly public_label: string;
  readonly canonical_href: string;
  readonly href_class: string;
}

export interface AskWitnessOpsRoute {
  readonly route_id: string;
  readonly href: string;
}

export interface AskWitnessOpsCommercialFit {
  readonly schema: "witnessops.ask.commercial-fit.v1";
  readonly result:
    | "likely"
    | "needs_boundary"
    | "not_fit"
    | "unknown"
    | "blocked";
  readonly intent: "workflow" | "offer" | "specimen" | "other";
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

export interface AskWitnessOpsUiAnswer {
  readonly schema:
    | "witnessops.ask.assembled-answer.v1"
    | "witnessops.ask.public-boundary-response.v1";
  readonly status: "success" | "closed";
  readonly template: {
    readonly template_id: string;
    readonly body: string;
    readonly source_display: string | null;
  };
  readonly route: AskWitnessOpsRoute | null;
  readonly commercial_fit: AskWitnessOpsCommercialFit;
  readonly presented_sources: readonly AskWitnessOpsPresentedSource[];
  readonly failure_reason?: string;
  readonly receipt_id?: string;
  readonly receipt_status?: "durable" | "ephemeral";
  readonly answer_mode:
    | "ai_assisted"
    | "deterministic_fallback"
    | "policy_refusal";
}

export interface AskWitnessOpsRequestErrorDetails {
  readonly message: string;
}

const SUPERSEDED_COMMERCIAL_TEMPLATE_IDS = new Set([
  "route.launch_readiness.v1",
  "route.vendor_change.v1",
  "route.ai_agent_action.v1",
  "route.incident.v1",
  "route.access_authority.v1",
  "route.offline_inspection.v1",
]);

export function askWitnessOpsAnswerText(answer: AskWitnessOpsUiAnswer): string {
  const body = answer.template.body.trim();
  if (
    (answer.status === "closed" ||
      answer.answer_mode === "deterministic_fallback" ||
      (SUPERSEDED_COMMERCIAL_TEMPLATE_IDS.has(answer.template.template_id) &&
        /\bWorkflow [SML]\b/.test(body))) &&
    answer.commercial_fit.offer &&
    (answer.commercial_fit.result === "likely" ||
      answer.commercial_fit.result === "needs_boundary")
  ) {
    const offer = answer.commercial_fit.offer;
    const currentOffer = `${offer.name} is the primary paid path — ${offer.price_label}; ${offer.unit_label}; ${offer.fit_check_label}; ${offer.delivery_label}.`;

    if (answer.commercial_fit.result === "needs_boundary") {
      return `${currentOffer} This public guide cannot inspect a whole environment. Narrow the non-secret description to one consequential agent or automation action; the fit-check path is shown above.`;
    }

    return `${currentOffer} This public guide cannot inspect or verify the action here. Your non-secret description is enough for a likely commercial-fit signal; the fit-check path is shown above.`;
  }

  if (body.length > 0) {
    return body;
  }

  if (answer.status === "closed") {
    return "This question is outside the bounded public Ask WitnessOps path. Do not paste secrets. For private systems, request a fit check.";
  }

  return "";
}

export function askWitnessOpsModeLabel(answer: AskWitnessOpsUiAnswer): string {
  if (answer.answer_mode === "ai_assisted") {
    return "AI-assisted · public WitnessOps material";
  }

  if (
    answer.status === "closed" &&
    answer.commercial_fit.offer &&
    (answer.commercial_fit.result === "likely" ||
      answer.commercial_fit.result === "needs_boundary")
  ) {
    return "Commercial fit · public boundary";
  }

  if (answer.answer_mode === "policy_refusal") {
    return "Boundary guidance";
  }

  return "Deterministic public guide";
}

const SAME_SITE_HOSTS = new Set(["witnessops.com", "www.witnessops.com"]);

/**
 * Prefer path-only links for same-site public sources.
 * Hostname is validated via URL parse (not substring match) so
 * https://witnessops.com.evil.example cannot pass as same-site.
 */
export function askWitnessOpsSourceHref(source: AskWitnessOpsPresentedSource): string {
  if (source.href_class !== "same_site") {
    return source.canonical_href;
  }

  try {
    const url = new URL(source.canonical_href);
    if (url.protocol === "https:" && SAME_SITE_HOSTS.has(url.hostname)) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    // Invalid absolute URL — fall through and return the original href.
  }

  return source.canonical_href;
}

export function askWitnessOpsSourceTarget(
  source: AskWitnessOpsPresentedSource,
): "external" | "same_site" {
  return source.href_class === "same_site" ? "same_site" : "external";
}

export function askWitnessOpsRouteLabel(routeId: string): string {
  const labels: Record<string, string> = {
    "route.fit-check": "Request a fit check",
    "route.support": "Open support",
    "route.security-disclosure": "Security disclosure",
  };

  return labels[routeId] ?? "Continue";
}

export function askWitnessOpsRouteHref(route: AskWitnessOpsRoute): string {
  if (route.route_id === "route.fit-check") {
    return `${PRIMARY_OFFER.requestRoute}?offerId=${PRIMARY_OFFER.id}&source=ask`;
  }

  return route.href;
}

export async function fetchAskWitnessOps(
  question: string,
): Promise<AskWitnessOpsUiAnswer> {
  const res = await fetch("/api/ask-witnessops", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) {
    throw new Error(await askWitnessOpsRequestErrorMessage(res));
  }

  const payload: unknown = await res.json();
  const answer = parseAssembledAnswer(payload);
  const receiptId = res.headers.get("X-Ask-Receipt-Id") ?? undefined;
  const receiptStatus = res.headers.get("X-Ask-Receipt-Status");

  return {
    ...answer,
    receipt_id: receiptId,
    receipt_status:
      receiptStatus === "durable" || receiptStatus === "ephemeral"
        ? receiptStatus
        : undefined,
  };
}

export async function askWitnessOpsRequestErrorMessage(
  response: Response,
): Promise<string> {
  return (await askWitnessOpsRequestErrorDetails(response)).message;
}

export async function askWitnessOpsRequestErrorDetails(
  response: Response,
): Promise<AskWitnessOpsRequestErrorDetails> {
  try {
    const payload: unknown = await response.clone().json();
    if (
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof payload.message === "string"
    ) {
      return { message: payload.message };
    }
  } catch {
    // Fall back to a status-based message when the response body is not JSON.
  }

  return { message: `Ask WitnessOps request failed (${response.status}).` };
}

function parseAssembledAnswer(payload: unknown): AskWitnessOpsUiAnswer {
  if (!payload || typeof payload !== "object") {
    throw new Error("Ask WitnessOps returned an invalid response.");
  }

  const record = payload as Record<string, unknown>;
  if (record.schema === "witnessops.ask.public-boundary-response.v1") {
    return parsePublicBoundaryAnswer(record);
  }

  if (record.schema !== "witnessops.ask.assembled-answer.v1") {
    throw new Error("Ask WitnessOps returned an unexpected response schema.");
  }

  const template = asTemplate(record.template);
  const status = record.status === "closed" ? "closed" : "success";

  return {
    schema: "witnessops.ask.assembled-answer.v1",
    status,
    template,
    route: asRoute(record.route),
    commercial_fit: asCommercialFit(record.commercial_fit),
    presented_sources: asPresentedSources(record.presented_sources),
    failure_reason:
      typeof record.failure_reason === "string" ? record.failure_reason : undefined,
    answer_mode:
      record.answer_mode === "ai_assisted" ||
      record.answer_mode === "policy_refusal"
        ? record.answer_mode
        : "deterministic_fallback",
  };
}

function parsePublicBoundaryAnswer(
  record: Record<string, unknown>,
): AskWitnessOpsUiAnswer {
  const authorityAnswer = record.authority_answer;
  if (
    !isCoherentNestedAuthorityAnswer(authorityAnswer) ||
    record.status !== "closed" ||
    record.route !== null ||
    !Array.isArray(record.presented_sources) ||
    record.presented_sources.length !== 0 ||
    record.answer_mode !== "policy_refusal"
  ) {
    throw new Error("Ask WitnessOps returned an invalid boundary response.");
  }

  return {
    schema: "witnessops.ask.public-boundary-response.v1",
    status: "closed",
    template: asTemplate(record.template),
    route: null,
    commercial_fit: asCommercialFit(record.commercial_fit),
    presented_sources: asPresentedSources(record.presented_sources),
    failure_reason:
      typeof record.failure_reason === "string"
        ? record.failure_reason
        : "PUBLIC_MATERIAL_BOUNDARY",
    answer_mode: "policy_refusal",
  };
}

function isCoherentNestedAuthorityAnswer(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const template =
    record.template && typeof record.template === "object"
      ? (record.template as Record<string, unknown>)
      : null;
  const decision =
    record.policy_decision && typeof record.policy_decision === "object"
      ? (record.policy_decision as Record<string, unknown>)
      : null;

  return (
    record.schema === "witnessops.ask.assembled-answer.v1" &&
    record.assembler_contract_id === "ASK_DETERMINISTIC_ANSWER_ASSEMBLER_V1" &&
    record.assembler_contract_version === 1 &&
    typeof record.deterministic_replay_hash === "string" &&
    record.deterministic_replay_hash.length > 0 &&
    typeof template?.template_id === "string" &&
    template.template_id === decision?.template_id
  );
}

function asCommercialFit(value: unknown): AskWitnessOpsCommercialFit {
  if (!value || typeof value !== "object") {
    return unknownCommercialFit();
  }

  const record = value as Record<string, unknown>;
  const result = record.result;
  const intent = record.intent;
  const validResult =
    result === "likely" ||
    result === "needs_boundary" ||
    result === "not_fit" ||
    result === "unknown" ||
    result === "blocked";
  const validIntent =
    intent === "workflow" ||
    intent === "offer" ||
    intent === "specimen" ||
    intent === "other";

  if (
    record.schema !== "witnessops.ask.commercial-fit.v1" ||
    !validResult ||
    !validIntent ||
    record.source !== "ask"
  ) {
    return unknownCommercialFit();
  }

  const offerRecord =
    record.offer && typeof record.offer === "object"
      ? (record.offer as Record<string, unknown>)
      : null;
  const offerId = record.offer_id === PRIMARY_OFFER.id ? PRIMARY_OFFER.id : null;
  const offer =
    offerRecord?.name === PRIMARY_OFFER.name.en &&
    offerRecord.price_label === PRIMARY_OFFER.price.en &&
    offerRecord.unit_label === PRIMARY_OFFER.unit.en &&
    offerRecord.fit_check_label === PRIMARY_OFFER.fitCheck.en &&
    offerRecord.delivery_label === PRIMARY_OFFER.timing.en
      ? {
          name: PRIMARY_OFFER.name.en,
          price_label: PRIMARY_OFFER.price.en,
          unit_label: PRIMARY_OFFER.unit.en,
          fit_check_label: PRIMARY_OFFER.fitCheck.en,
          delivery_label: PRIMARY_OFFER.timing.en,
        }
      : null;

  const matchingSpecimenId =
    record.matching_specimen_id === "ai-agent-action-proof-run"
      ? "ai-agent-action-proof-run"
      : record.matching_specimen_id === null
        ? null
        : undefined;
  const presentsOffer = result === "likely" || result === "needs_boundary";
  const validOfferState = presentsOffer
    ? offerId === PRIMARY_OFFER.id &&
      offer !== null &&
      (result === "likely"
        ? intent === "workflow" || intent === "offer"
        : intent === "workflow" || intent === "specimen")
    : offerId === null && offer === null && intent === "other";

  if (!validOfferState || matchingSpecimenId === undefined) {
    return unknownCommercialFit();
  }

  return {
    schema: "witnessops.ask.commercial-fit.v1",
    result,
    intent,
    offer_id: offerId,
    source: "ask",
    offer,
    matching_specimen_id: matchingSpecimenId,
  };
}

function unknownCommercialFit(): AskWitnessOpsCommercialFit {
  return {
    schema: "witnessops.ask.commercial-fit.v1",
    result: "unknown",
    intent: "other",
    offer_id: null,
    source: "ask",
    offer: null,
    matching_specimen_id: null,
  };
}

function asTemplate(value: unknown): AskWitnessOpsUiAnswer["template"] {
  if (!value || typeof value !== "object") {
    throw new Error("Ask WitnessOps returned an invalid template.");
  }

  const record = value as Record<string, unknown>;
  if (typeof record.template_id !== "string" || typeof record.body !== "string") {
    throw new Error("Ask WitnessOps returned an invalid template.");
  }

  return {
    template_id: record.template_id,
    body: record.body,
    source_display:
      typeof record.source_display === "string" ? record.source_display : null,
  };
}

function asRoute(value: unknown): AskWitnessOpsRoute | null {
  if (value === null) {
    return null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.route_id !== "string" || typeof record.href !== "string") {
    return null;
  }

  return {
    route_id: record.route_id,
    href: record.href,
  };
}

function asPresentedSources(value: unknown): AskWitnessOpsPresentedSource[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sources: AskWitnessOpsPresentedSource[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const record = item as Record<string, unknown>;
    if (
      typeof record.source_id !== "string" ||
      typeof record.public_label !== "string" ||
      typeof record.canonical_href !== "string" ||
      typeof record.href_class !== "string"
    ) {
      continue;
    }

    sources.push({
      source_id: record.source_id,
      public_label: record.public_label,
      canonical_href: record.canonical_href,
      href_class: record.href_class,
    });
  }

  return sources;
}
