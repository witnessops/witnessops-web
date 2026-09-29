// Allowlist numeric provider usage only. Missing or invalid values stay absent.
export interface OpenAIUsageMetrics {
  input_tokens?: number;
  cached_tokens?: number;
  cache_write_tokens?: number;
  output_tokens?: number;
}

export function extractOpenAIUsage(response: unknown): OpenAIUsageMetrics {
  const record = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown> : {};
  const usage = record(record(response).usage);
  const details = record(usage.input_tokens_details);
  const metrics: OpenAIUsageMetrics = {};
  const candidates = {
    input_tokens: usage.input_tokens,
    cached_tokens: details.cached_tokens,
    cache_write_tokens: details.cache_write_tokens,
    output_tokens: usage.output_tokens,
  };
  for (const [key, value] of Object.entries(candidates)) {
    if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
      metrics[key as keyof OpenAIUsageMetrics] = value;
    }
  }
  return metrics;
}
