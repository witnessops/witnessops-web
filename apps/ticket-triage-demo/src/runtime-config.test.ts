import assert from "node:assert/strict";
import test from "node:test";
import { resolveRuntimeConfig } from "./runtime-config.js";

const VALID_ENVIRONMENT: NodeJS.ProcessEnv = {
  TICKET_TRIAGE_DEMO_ENABLED: "true",
  TICKET_TRIAGE_PROVIDER: "openai",
  TICKET_TRIAGE_MODEL: "gpt-5.4-mini",
  TICKET_TRIAGE_PORT: "3025",
  OPENAI_API_KEY: "test-key",
};

test("accepts the explicit private demo configuration", () => {
  assert.deepEqual(resolveRuntimeConfig(VALID_ENVIRONMENT), {
    apiKey: "test-key",
    model: "gpt-5.4-mini",
    port: 3025,
  });
});

test("fails closed when enablement, provider, key, model, or port is invalid", () => {
  const invalidCases: Array<[string, NodeJS.ProcessEnv]> = [
    ["not_enabled", { ...VALID_ENVIRONMENT, TICKET_TRIAGE_DEMO_ENABLED: "false" }],
    ["requires_openai_provider", { ...VALID_ENVIRONMENT, TICKET_TRIAGE_PROVIDER: "mock" }],
    ["missing_openai_api_key", { ...VALID_ENVIRONMENT, OPENAI_API_KEY: "" }],
    ["model_must_be_pinned", { ...VALID_ENVIRONMENT, TICKET_TRIAGE_MODEL: "gpt-5.4" }],
    ["invalid_port", { ...VALID_ENVIRONMENT, TICKET_TRIAGE_PORT: "80" }],
  ];

  for (const [message, environment] of invalidCases) {
    assert.throws(() => resolveRuntimeConfig(environment), new RegExp(message));
  }
});
