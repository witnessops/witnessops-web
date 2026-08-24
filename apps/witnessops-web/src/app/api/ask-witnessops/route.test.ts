import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { _resetAllStores } from "@witnessops/config/rate-limit";
import { JSON_AMBIGUITY_MAX_DEPTH } from "@/lib/json-ambiguity";
import { POST } from "./route";

afterEach(() => {
  _resetAllStores();
});

test("public Ask returns an answer without durable receipt custody", async () => {
  const response = await POST(
    new Request("https://witnessops.com/api/ask-witnessops", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.81",
      },
      body: JSON.stringify({ question: "Do I need a fit check?" }),
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Ask-Receipt-Id"), null);
  assert.equal(response.headers.get("X-Ask-Receipt-Status"), null);
  const payload = (await response.json()) as { schema?: string };
  assert.equal(payload.schema, "witnessops.ask.assembled-answer.v1");
});

test("public Ask rejects valid but excessively nested JSON as a controlled client error", async () => {
  const depth = JSON_AMBIGUITY_MAX_DEPTH + 1;
  const body = `${'{"nested":'.repeat(depth)}{"question":"one","question":"two"}${"}".repeat(depth)}`;
  assert.doesNotThrow(() => JSON.parse(body));

  const response = await POST(
    new Request("https://witnessops.com/api/ask-witnessops", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.82",
      },
      body,
    }),
  );

  assert.equal(response.status, 400);
  const payload = (await response.json()) as { failureClass?: string; message?: string };
  assert.equal(payload.failureClass, "FAILURE_INPUT_MALFORMED");
  assert.equal(payload.message, "request body exceeds supported JSON parser limits.");
});

test("public Ask keeps malformed JSON distinct from the scanner depth limit", async () => {
  const response = await POST(
    new Request("https://witnessops.com/api/ask-witnessops", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.83",
      },
      body: '{"unterminated":',
    }),
  );

  assert.equal(response.status, 400);
  const payload = (await response.json()) as { failureClass?: string; message?: string };
  assert.equal(payload.failureClass, "FAILURE_INPUT_MALFORMED");
  assert.equal(payload.message, "request body must be valid JSON.");
});
