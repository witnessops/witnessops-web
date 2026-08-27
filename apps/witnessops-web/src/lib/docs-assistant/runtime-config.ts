export const DOCS_ASSISTANT_STAGING_VECTOR_STORE_ID =
  "vs_69fe62ba0e8c81918d2763cece82f0c0";

export const DOCS_ASSISTANT_STAGING_MODEL = "gpt-5.4-mini";

export const DOCS_ASSISTANT_CORPUS_PLAN_FILE_ID =
  "file-Si3z9HvNWAQjuCEtheZsiY";

export const DOCS_ASSISTANT_COLLECTED_CORPUS_FILE_ID =
  "file-9ztnkfLvWtUvi9ZY52q2UQ";

export type DocsAssistantRuntimeDisabledReason =
  | "gate_not_enabled"
  | "stage_not_staging"
  | "stage_not_production"
  | "vector_store_not_allowed"
  | "model_not_allowed"
  | "missing_api_key";

export interface DocsAssistantRuntimeDisabledConfig {
  enabled: false;
  reason: DocsAssistantRuntimeDisabledReason;
}

export interface DocsAssistantRuntimeEnabledConfig {
  enabled: true;
  stage: "staging" | "production" | "development";
  vectorStoreId: typeof DOCS_ASSISTANT_STAGING_VECTOR_STORE_ID;
  model: typeof DOCS_ASSISTANT_STAGING_MODEL;
  apiKey: string;
}

export type DocsAssistantRuntimeConfig =
  | DocsAssistantRuntimeDisabledConfig
  | DocsAssistantRuntimeEnabledConfig;

export type DocsAssistantRuntimeEnv = Record<string, string | undefined>;

export function readDocsAssistantRuntimeConfig(
  env: DocsAssistantRuntimeEnv = process.env,
): DocsAssistantRuntimeConfig {
  if (env.NODE_ENV === "development") {
    const apiKey = env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return { enabled: false, reason: "missing_api_key" };
    }
    return {
      enabled: true,
      stage: "development",
      vectorStoreId: DOCS_ASSISTANT_STAGING_VECTOR_STORE_ID,
      model: DOCS_ASSISTANT_STAGING_MODEL,
      apiKey,
    };
  }

  if (env.WITNESSOPS_DOCS_ASSISTANT_ENABLED !== "true") {
    return { enabled: false, reason: "gate_not_enabled" };
  }

  if (env.WITNESSOPS_DOCS_ASSISTANT_STAGE !== "staging") {
    return { enabled: false, reason: "stage_not_staging" };
  }

  if (
    env.WITNESSOPS_DOCS_ASSISTANT_VECTOR_STORE_ID !==
    DOCS_ASSISTANT_STAGING_VECTOR_STORE_ID
  ) {
    return { enabled: false, reason: "vector_store_not_allowed" };
  }

  if (env.WITNESSOPS_DOCS_ASSISTANT_MODEL !== DOCS_ASSISTANT_STAGING_MODEL) {
    return { enabled: false, reason: "model_not_allowed" };
  }

  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { enabled: false, reason: "missing_api_key" };
  }

  return {
    enabled: true,
    stage: "staging",
    vectorStoreId: DOCS_ASSISTANT_STAGING_VECTOR_STORE_ID,
    model: DOCS_ASSISTANT_STAGING_MODEL,
    apiKey,
  };
}

/**
 * The public Ask surface has its own explicit production gate so enabling the
 * browser-visible experience does not also enable the separate staging probe.
 * It reuses the exact approved model, vector store, and server-only key.
 */
export function readAskWitnessOpsOpenAiRuntimeConfig(
  env: DocsAssistantRuntimeEnv = process.env,
): DocsAssistantRuntimeConfig {
  if (env.NODE_ENV === "development") {
    const apiKey = env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return { enabled: false, reason: "missing_api_key" };
    }
    return {
      enabled: true,
      stage: "development",
      vectorStoreId: DOCS_ASSISTANT_STAGING_VECTOR_STORE_ID,
      model: DOCS_ASSISTANT_STAGING_MODEL,
      apiKey,
    };
  }

  if (env.WITNESSOPS_ASK_OPENAI_ENABLED !== "true") {
    return { enabled: false, reason: "gate_not_enabled" };
  }

  if (env.WITNESSOPS_ASK_OPENAI_STAGE !== "production") {
    return { enabled: false, reason: "stage_not_production" };
  }

  if (
    env.WITNESSOPS_DOCS_ASSISTANT_VECTOR_STORE_ID !==
    DOCS_ASSISTANT_STAGING_VECTOR_STORE_ID
  ) {
    return { enabled: false, reason: "vector_store_not_allowed" };
  }

  if (env.WITNESSOPS_DOCS_ASSISTANT_MODEL !== DOCS_ASSISTANT_STAGING_MODEL) {
    return { enabled: false, reason: "model_not_allowed" };
  }

  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { enabled: false, reason: "missing_api_key" };
  }

  return {
    enabled: true,
    stage: "production",
    vectorStoreId: DOCS_ASSISTANT_STAGING_VECTOR_STORE_ID,
    model: DOCS_ASSISTANT_STAGING_MODEL,
    apiKey,
  };
}
