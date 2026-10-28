import assert from "node:assert/strict";
import test from "node:test";

import {
  DOCS_ASSISTANT_STAGING_MODEL,
  DOCS_ASSISTANT_STAGING_VECTOR_STORE_ID,
  type DocsAssistantRuntimeEnv,
  readAskWitnessOpsOpenAiRuntimeConfig,
  readDocsAssistantRuntimeConfig,
} from "../runtime-config";

function enabledEnv(overrides: Record<string, string | undefined> = {}) {
  const env: DocsAssistantRuntimeEnv = {
    WITNESSOPS_DOCS_ASSISTANT_ENABLED: "true",
    WITNESSOPS_DOCS_ASSISTANT_STAGE: "staging",
    WITNESSOPS_DOCS_ASSISTANT_VECTOR_STORE_ID:
      DOCS_ASSISTANT_STAGING_VECTOR_STORE_ID,
    WITNESSOPS_DOCS_ASSISTANT_MODEL: DOCS_ASSISTANT_STAGING_MODEL,
    OPENAI_API_KEY: "test-key",
  };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete env[key];
    } else {
      env[key] = value;
    }
  }

  return env;
}

test("docs assistant runtime config is disabled when gate is absent", () => {
  assert.deepEqual(readDocsAssistantRuntimeConfig({}), {
    enabled: false,
    reason: "gate_not_enabled",
  });
});

test("docs assistant runtime config accepts only exact staging anchors", () => {
  const config = readDocsAssistantRuntimeConfig(enabledEnv());

  assert.equal(config.enabled, true);
  if (config.enabled) {
    assert.equal(config.stage, "staging");
    assert.equal(config.vectorStoreId, DOCS_ASSISTANT_STAGING_VECTOR_STORE_ID);
    assert.equal(config.model, DOCS_ASSISTANT_STAGING_MODEL);
    assert.equal(config.apiKey, "test-key");
  }
});

test("docs assistant runtime config enables in development without staging gates", () => {
  const config = readDocsAssistantRuntimeConfig({
    NODE_ENV: "development",
    OPENAI_API_KEY: "test-key",
  });

  assert.equal(config.enabled, true);
  if (config.enabled) {
    assert.equal(config.stage, "development");
    assert.equal(config.vectorStoreId, DOCS_ASSISTANT_STAGING_VECTOR_STORE_ID);
    assert.equal(config.model, DOCS_ASSISTANT_STAGING_MODEL);
    assert.equal(config.apiKey, "test-key");
  }
});

test("docs assistant runtime config still fails closed in development without key", () => {
  assert.deepEqual(readDocsAssistantRuntimeConfig({ NODE_ENV: "development" }), {
    enabled: false,
    reason: "missing_api_key",
  });
});

test("docs assistant runtime config fails closed for wrong stage", () => {
  assert.deepEqual(
    readDocsAssistantRuntimeConfig(
      enabledEnv({ WITNESSOPS_DOCS_ASSISTANT_STAGE: "production" }),
    ),
    { enabled: false, reason: "stage_not_staging" },
  );
});

test("docs assistant runtime config fails closed for wrong vector store", () => {
  assert.deepEqual(
    readDocsAssistantRuntimeConfig(
      enabledEnv({ WITNESSOPS_DOCS_ASSISTANT_VECTOR_STORE_ID: "vs_wrong" }),
    ),
    { enabled: false, reason: "vector_store_not_allowed" },
  );
});

test("docs assistant runtime config fails closed when key is missing", () => {
  assert.deepEqual(
    readDocsAssistantRuntimeConfig(enabledEnv({ OPENAI_API_KEY: undefined })),
    { enabled: false, reason: "missing_api_key" },
  );
});

test("public Ask OpenAI config uses a separate exact production gate", () => {
  const config = readAskWitnessOpsOpenAiRuntimeConfig({
    NODE_ENV: "production",
    WITNESSOPS_ASK_OPENAI_ENABLED: "true",
    WITNESSOPS_ASK_OPENAI_STAGE: "production",
    OPENAI_API_KEY: "test-key",
  });

  assert.equal(config.enabled, true);
  if (config.enabled) {
    assert.equal(config.stage, "production");
    assert.equal("vectorStoreId" in config, false);
    assert.equal(config.model, DOCS_ASSISTANT_STAGING_MODEL);
  }
});

test("public Ask development needs a key and accepts only supported public models", () => {
  assert.deepEqual(readAskWitnessOpsOpenAiRuntimeConfig({ NODE_ENV: "development" }), { enabled: false, reason: "missing_api_key" });
  const configured = readAskWitnessOpsOpenAiRuntimeConfig({ NODE_ENV: "development", OPENAI_API_KEY: "test-key" });
  assert.equal(configured.enabled, true);
  if (configured.enabled) assert.equal(configured.model, "gpt-5.4-mini");
  assert.deepEqual(readAskWitnessOpsOpenAiRuntimeConfig({ NODE_ENV: "development", OPENAI_API_KEY: "test-key", WITNESSOPS_ASK_OPENAI_MODEL: "unknown-model" }), { enabled: false, reason: "model_not_allowed" });
});

test("public Ask explicitly selects Terra without changing the default or legacy docs runtime", () => {
  const selection = {
    OPENAI_API_KEY: "test-key",
    WITNESSOPS_ASK_OPENAI_MODEL: " gpt-6.1-terra ",
  };
  assert.deepEqual(readAskWitnessOpsOpenAiRuntimeConfig({
    NODE_ENV: "development",
    ...selection,
  }), { enabled: true, stage: "development", model: "gpt-6.1-terra", apiKey: "test-key" });
  assert.deepEqual(readAskWitnessOpsOpenAiRuntimeConfig({
    NODE_ENV: "production",
    WITNESSOPS_ASK_OPENAI_ENABLED: "true",
    WITNESSOPS_ASK_OPENAI_STAGE: "production",
    ...selection,
  }), { enabled: true, stage: "production", model: "gpt-6.1-terra", apiKey: "test-key" });

  const legacy = readDocsAssistantRuntimeConfig(enabledEnv(selection));
  assert.equal(legacy.enabled, true);
  if (legacy.enabled) assert.equal(legacy.model, "gpt-5.4-mini");
  assert.deepEqual(readDocsAssistantRuntimeConfig(enabledEnv({
    WITNESSOPS_DOCS_ASSISTANT_MODEL: "gpt-6.1-terra",
  })), { enabled: false, reason: "model_not_allowed" });
});

test("selecting Terra does not bypass the public production gates or missing-key check", () => {
  const selection = {
    NODE_ENV: "production",
    WITNESSOPS_ASK_OPENAI_MODEL: "gpt-6.1-terra",
    OPENAI_API_KEY: "test-key",
  };
  assert.deepEqual(readAskWitnessOpsOpenAiRuntimeConfig(selection), {
    enabled: false, reason: "gate_not_enabled",
  });
  assert.deepEqual(readAskWitnessOpsOpenAiRuntimeConfig({
    ...selection, WITNESSOPS_ASK_OPENAI_ENABLED: "true",
  }), { enabled: false, reason: "stage_not_production" });
  assert.deepEqual(readAskWitnessOpsOpenAiRuntimeConfig({
    ...selection, NODE_ENV: "development", OPENAI_API_KEY: " ",
  }), { enabled: false, reason: "missing_api_key" });
});

test("public Ask OpenAI config fails closed for missing and staging-only gates", () => {
  assert.deepEqual(readAskWitnessOpsOpenAiRuntimeConfig({}), {
    enabled: false,
    reason: "gate_not_enabled",
  });
  assert.deepEqual(
    readAskWitnessOpsOpenAiRuntimeConfig({
      WITNESSOPS_ASK_OPENAI_ENABLED: "true",
      WITNESSOPS_ASK_OPENAI_STAGE: "staging",
    }),
    { enabled: false, reason: "stage_not_production" },
  );
});
