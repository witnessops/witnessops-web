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
    WITNESSOPS_ASK_OPENAI_ENABLED: "true",
    WITNESSOPS_ASK_OPENAI_STAGE: "production",
    WITNESSOPS_DOCS_ASSISTANT_VECTOR_STORE_ID:
      DOCS_ASSISTANT_STAGING_VECTOR_STORE_ID,
    WITNESSOPS_DOCS_ASSISTANT_MODEL: DOCS_ASSISTANT_STAGING_MODEL,
    OPENAI_API_KEY: "test-key",
  });

  assert.equal(config.enabled, true);
  if (config.enabled) {
    assert.equal(config.stage, "production");
    assert.equal(config.vectorStoreId, DOCS_ASSISTANT_STAGING_VECTOR_STORE_ID);
    assert.equal(config.model, DOCS_ASSISTANT_STAGING_MODEL);
  }
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
