import { PINNED_DEMO_MODEL } from "./types.js";

const DEFAULT_PORT = 3025;

export interface TicketTriageRuntimeConfig {
  apiKey: string;
  model: typeof PINNED_DEMO_MODEL;
  port: number;
}

export function resolveRuntimeConfig(
  environment: NodeJS.ProcessEnv,
): TicketTriageRuntimeConfig {
  if (environment.TICKET_TRIAGE_DEMO_ENABLED !== "true") {
    throw new Error("ticket_triage_demo_not_enabled");
  }
  if (environment.TICKET_TRIAGE_PROVIDER !== "openai") {
    throw new Error("ticket_triage_server_requires_openai_provider");
  }
  const apiKey = environment.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ticket_triage_missing_openai_api_key");
  }
  if (environment.TICKET_TRIAGE_MODEL !== PINNED_DEMO_MODEL) {
    throw new Error("ticket_triage_live_model_must_be_pinned");
  }
  const requestedPort = Number(
    environment.TICKET_TRIAGE_PORT ?? DEFAULT_PORT,
  );
  if (
    !Number.isInteger(requestedPort) ||
    requestedPort < 1024 ||
    requestedPort > 65535
  ) {
    throw new Error("ticket_triage_invalid_port");
  }

  return { apiKey, model: PINNED_DEMO_MODEL, port: requestedPort };
}
