import { extractOpenAIUsage, type OpenAIUsageMetrics } from "./openai-usage.js";
import { TICKET_TRIAGE_DEVELOPER_INSTRUCTION } from "./prompt.js";
import {
  providerTriageJsonSchema,
  summarizeValidationErrors,
  validateProviderTriage,
} from "./schema-validator.js";
import {
  PINNED_DEMO_MODEL,
  type TicketTriage,
  type TicketTriageInput,
  type TriageProvider,
} from "./types.js";

export class ProviderUnavailableError extends Error {
  constructor(readonly status: number | "timeout" | "network") {
    super("ticket_triage_provider_unavailable");
    this.name = "ProviderUnavailableError";
  }
}

export class InvalidProviderOutputError extends Error {
  constructor(readonly reasons: string[]) {
    super("ticket_triage_invalid_provider_output");
    this.name = "InvalidProviderOutputError";
  }
}

export interface TicketTriageProviderEvent extends OpenAIUsageMetrics {
  event: "openai_response" | "openai_error";
  model: string;
  workload: "ticket-triage";
  prompt_version: "ticket-triage.v1";
  schema_version: "witnessops_ticket_triage_v1";
  attempt: "initial" | "repair";
  request_id: string | null;
  status: number | null;
  duration_ms: number;
  error_class: string | null;
}

interface OpenAIResponsesConfig {
  logger?: (event: TicketTriageProviderEvent) => void;
  apiKey: string;
  model: typeof PINNED_DEMO_MODEL;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

interface OpenAIResponseShape {
  output_text?: unknown;
  output?: Array<{
    content?: Array<{
      type?: unknown;
      text?: unknown;
    }>;
  }>;
}

export function buildOpenAIResponsesRequest(
  ticket: TicketTriageInput,
  model: typeof PINNED_DEMO_MODEL,
  repairReasons: string[] = [],
) {
  const input = [
    {
      role: "developer",
      content: TICKET_TRIAGE_DEVELOPER_INSTRUCTION,
    },
    {
      role: "user",
      content: JSON.stringify({ ticket }),
    },
  ];
  if (repairReasons.length > 0) {
    input.push({
      role: "developer",
      content: `The previous draft failed local validation at ${repairReasons.join(", ")}. Return a corrected JSON object within those bounds.`,
    });
  }

  return {
    model,
    store: false,
    temperature: 0,
    max_output_tokens: 1800,
    text: {
      format: {
        type: "json_schema",
        name: "witnessops_ticket_triage_v1",
        strict: true,
        schema: providerTriageJsonSchema,
      },
    },
    input,
  };
}

export function extractOpenAIOutputText(response: unknown): string | null {
  if (!response || typeof response !== "object") {
    return null;
  }

  const typed = response as OpenAIResponseShape;
  if (typeof typed.output_text === "string" && typed.output_text.trim()) {
    return typed.output_text.trim();
  }

  for (const item of typed.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        if (content.text.trim()) {
          return content.text.trim();
        }
      }
    }
  }

  return null;
}

async function executeRequest(args: {
  ticket: TicketTriageInput;
  repairReasons?: string[];
  config: Required<Pick<OpenAIResponsesConfig, "apiKey" | "model">> &
    Pick<OpenAIResponsesConfig, "fetchImpl" | "timeoutMs" | "logger">;
}): Promise<TicketTriage> {
  const fetchImpl = args.config.fetchImpl ?? globalThis.fetch;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    args.config.timeoutMs ?? 30_000,
  );

  const startedAt = Date.now();
  let requestId: string | null = null;
  let status: number | null = null;
  let errorClass: string | null = null;
  let usage: OpenAIUsageMetrics = {};
  try {
    let response: Response;
    try {
      response = await fetchImpl("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${args.config.apiKey}`,
        },
        body: JSON.stringify(
          buildOpenAIResponsesRequest(
            args.ticket,
            args.config.model,
            args.repairReasons,
          ),
        ),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new ProviderUnavailableError("timeout");
      }
      throw new ProviderUnavailableError("network");
    }

    requestId = response.headers.get("x-request-id");
    status = response.status;
    if (!response.ok) {
      throw new ProviderUnavailableError(response.status);
    }

    const rawResponse = (await response.json()) as unknown;
    usage = extractOpenAIUsage(rawResponse);
    const outputText = extractOpenAIOutputText(rawResponse);
    if (!outputText) {
      throw new InvalidProviderOutputError(["missing_output_text"]);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      throw new InvalidProviderOutputError(["invalid_json"]);
    }

    const validated = validateProviderTriage(parsed);
    if (!validated.ok || !validated.value) {
      throw new InvalidProviderOutputError(
        summarizeValidationErrors(validated.errors),
      );
    }

    return validated.value;
  } catch (error) {
    if (error instanceof InvalidProviderOutputError) {
      errorClass = "provider_invalid_output";
    } else if (error instanceof ProviderUnavailableError) {
      errorClass = error.status === "timeout" ? "provider_timeout"
        : error.status === "network" ? "provider_unavailable" : "provider_http_error";
    } else {
      errorClass = "provider_invalid_response";
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    const logger = args.config.logger ?? ((event: TicketTriageProviderEvent) =>
      console.info("[ticket-triage:openai]", JSON.stringify(event)));
    try {
      logger({
        ...usage,
        model: args.config.model,
        workload: "ticket-triage",
        prompt_version: "ticket-triage.v1",
        schema_version: "witnessops_ticket_triage_v1",
        attempt: args.repairReasons ? "repair" : "initial",
        request_id: requestId,
        status,
        duration_ms: Date.now() - startedAt,
        error_class: errorClass,
        event: errorClass ? "openai_error" : "openai_response",
      });
    } catch {
      // Measurement failures must not change provider behavior or trigger retries.
    }
  }
}

export function createOpenAIProvider(
  config: OpenAIResponsesConfig,
): TriageProvider {
  if (!config.apiKey.trim()) {
    throw new Error("ticket_triage_missing_openai_api_key");
  }
  if (config.model !== PINNED_DEMO_MODEL) {
    throw new Error("ticket_triage_model_not_allowed");
  }

  return {
    name: "openai",
    model: config.model,
    async generate(ticket) {
      try {
        return await executeRequest({ ticket, config });
      } catch (error) {
        if (!(error instanceof InvalidProviderOutputError)) {
          throw error;
        }
        return executeRequest({
          ticket,
          config,
          repairReasons: error.reasons,
        });
      }
    },
  };
}
