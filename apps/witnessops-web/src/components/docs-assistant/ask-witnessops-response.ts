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

export interface AskWitnessOpsUiAnswer {
  readonly schema: "witnessops.ask.assembled-answer.v1";
  readonly status: "success" | "closed";
  readonly template: {
    readonly template_id: string;
    readonly body: string;
    readonly source_display: string | null;
  };
  readonly route: AskWitnessOpsRoute | null;
  readonly presented_sources: readonly AskWitnessOpsPresentedSource[];
  readonly failure_reason?: string;
  readonly receipt_id?: string;
  readonly receipt_status?: "durable" | "ephemeral";
}

export interface AskWitnessOpsRequestErrorDetails {
  readonly message: string;
}

export function askWitnessOpsAnswerText(answer: AskWitnessOpsUiAnswer): string {
  const body = answer.template.body.trim();
  if (body.length > 0) {
    return body;
  }

  if (answer.status === "closed") {
    return "This question is outside the bounded public Ask WitnessOps path. Do not paste secrets. For private systems, request a fit check.";
  }

  return "";
}

export function askWitnessOpsSourceHref(source: AskWitnessOpsPresentedSource): string {
  if (source.href_class === "same_site" && source.canonical_href.startsWith("https://witnessops.com")) {
    const url = new URL(source.canonical_href);
    return `${url.pathname}${url.search}${url.hash}`;
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
    presented_sources: asPresentedSources(record.presented_sources),
    failure_reason:
      typeof record.failure_reason === "string" ? record.failure_reason : undefined,
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