import assert from "node:assert/strict";
import test from "node:test";
import { extractOpenAIUsage } from "./openai-usage.js";

test("usage projection accepts only nonnegative integer counts, preserving missing versus zero", () => {
  assert.deepEqual(extractOpenAIUsage({usage: {input_tokens: 1234, output_tokens: 0,
    input_tokens_details: {cached_tokens: 1024, cache_write_tokens: 0, secret: "PRIVATE"}, question: "PRIVATE"}, output_text: "PRIVATE"}),
    {input_tokens: 1234, cached_tokens: 1024, cache_write_tokens: 0, output_tokens: 0});
  for (const response of [null, {}, {usage: []}, {usage: {input_tokens: "123", output_tokens: -1,
    input_tokens_details: {cached_tokens: 1.5, cache_write_tokens: Infinity}}}]) {
    assert.deepEqual(extractOpenAIUsage(response), {});
  }
  assert.deepEqual(extractOpenAIUsage({usage: {input_tokens: 12, input_tokens_details: {cached_tokens: 0}}}), {input_tokens: 12, cached_tokens: 0});
});
