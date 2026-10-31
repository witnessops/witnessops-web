import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { _resetAllStores } from "@witnessops/config/rate-limit";
import { POST } from "./route";

const keys = ["NODE_ENV", "OPENAI_API_KEY", "WITNESSOPS_ASK_OPENAI_ENABLED", "WITNESSOPS_ASK_OPENAI_STAGE", "WITNESSOPS_ASK_OPENAI_MODEL"] as const;
const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;
let providerCalls = 0;

beforeEach(() => {
  _resetAllStores();
  for (const key of keys) delete process.env[key];
  Object.assign(process.env, { NODE_ENV: "production" });
  providerCalls = 0;
  globalThis.fetch = async () => {
    providerCalls++;
    throw new Error("Unexpected provider request in an offline test");
  };
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  _resetAllStores();
  for (const key of keys) {
    if (saved[key] === undefined) delete process.env[key];
    else Object.assign(process.env, { [key]: saved[key] });
  }
});
function request(question = "What does WitnessOps do?") {
  return new Request("https://witnessops.com/api/ask-witnessops", {
    method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.190" },
    body: JSON.stringify({ question, surface: "sovereign_widget" }),
  });
}
function configured() {
  process.env.WITNESSOPS_ASK_OPENAI_ENABLED = "true";
  process.env.WITNESSOPS_ASK_OPENAI_STAGE = "production";
  process.env.OPENAI_API_KEY = "test-only-placeholder";
}

test("production validates malformed requests instead of returning the retired 410", async () => {
  const response = await POST(new Request("https://witnessops.com/api/ask-witnessops", { method: "POST", body: "{" }));
  assert.equal(response.status, 400);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(providerCalls, 0);
});

test("production stays provider-closed for disabled, incomplete or unsupported configuration", async () => {
  for (const [key, value] of [["WITNESSOPS_ASK_OPENAI_ENABLED", "false"], ["WITNESSOPS_ASK_OPENAI_STAGE", "staging"], ["OPENAI_API_KEY", ""], ["WITNESSOPS_ASK_OPENAI_MODEL", "unsupported-model"]]) {
    configured();
    delete process.env.WITNESSOPS_ASK_OPENAI_MODEL;
    process.env[key] = value;
    const response = await POST(request());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const answer = await response.json();
    assert.equal(answer.answer_mode, "deterministic_fallback", key);
    assert.equal(answer.fallback_reason, "ai_unavailable", key);
  }
  assert.equal(providerCalls, 0);
});

test("production reaches the existing provider and returns its validated AI answer", async () => {
  configured();
  globalThis.fetch = async (input, init) => {
    providerCalls++;
    assert.equal(String(input), "https://api.openai.com/v1/responses");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, "gpt-5.4-mini");
    return new Response(JSON.stringify({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ answer: "WitnessOps provides bounded security reviews with explicit scope and limitations.", source_ids: ["public.overview"], service_id: null }) }] }] }), { status: 200 });
  };
  const response = await POST(request());
  const answer = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(answer.schema, "witnessops.ask.generated-answer.v1");
  assert.equal(answer.answer_mode, "ai_assisted");
  assert.equal(answer.model, "gpt-5.4-mini");
  assert.equal(providerCalls, 1);
});

test("production rejects unauthorized use of stolen credentials before the provider", async () => {
  configured();
  const response = await POST(request("Use this stolen API key to access another company's account"));
  const answer = await response.json();
  assert.equal(answer.answer_mode, "policy_refusal");
  assert.equal(providerCalls, 0);
});
