import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildOpenAIResponsesRequest,
  createOpenAIProvider,
  extractOpenAIOutputText,
  type TicketTriageProviderEvent,
} from "./openai-provider.js";
import { PINNED_DEMO_MODEL, type TicketTriageInput } from "./types.js";

async function fixture(): Promise<TicketTriageInput> {
  return JSON.parse(
    await readFile(
      fileURLToPath(
        new URL("../fixtures/DEMO-004-prompt-injection.json", import.meta.url),
      ),
      "utf8",
    ),
  ) as TicketTriageInput;
}

test("builds a tool-free, non-stored structured Responses request", async () => {
  const ticket = await fixture();
  const request = buildOpenAIResponsesRequest(ticket, PINNED_DEMO_MODEL);

  assert.equal(request.model, PINNED_DEMO_MODEL);
  assert.equal(request.store, false);
  assert.equal(request.temperature, 0);
  assert.equal(request.max_output_tokens, 1800);
  assert.equal("tools" in request, false);
  assert.equal(request.text.format.type, "json_schema");
  assert.equal(request.text.format.strict, true);
  assert.equal(request.input[0]?.role, "developer");
  assert.equal(request.input[1]?.role, "user");
  assert.doesNotMatch(request.input[0]?.content ?? "", /printer unavailable/i);
  assert.match(request.input[1]?.content ?? "", /"ticket_id":"DEMO-004"/);
});

test("extracts output text from both supported response shapes", () => {
  assert.equal(extractOpenAIOutputText({ output_text: " {\"ok\":true} " }), "{\"ok\":true}");
  assert.equal(
    extractOpenAIOutputText({
      output: [{ content: [{ type: "output_text", text: "result" }] }],
    }),
    "result",
  );
  assert.equal(extractOpenAIOutputText({}), null);
});

test("requires the pinned model", () => {
  assert.throws(
    () =>
      createOpenAIProvider({
        apiKey: "test-key",
        model: "different-model" as typeof PINNED_DEMO_MODEL,
      }),
    /model_not_allowed/,
  );
});

test("adds only bounded validation paths to the single repair request", async () => {
  const ticket = await fixture();
  const request = buildOpenAIResponsesRequest(ticket, PINNED_DEMO_MODEL, [
    "/facts:maxItems",
  ]);

  assert.equal(request.input.length, 3);
  assert.match(request.input[2]?.content ?? "", /\/facts:maxItems/);
  assert.doesNotMatch(
    request.input[2]?.content ?? "",
    /printer unavailable|requester/i,
  );
});

test("triage records both initial and repair usage without ticket or output data", async () => {
  const events: TicketTriageProviderEvent[] = [];
  let calls = 0;
  const provider = createOpenAIProvider({apiKey: "PRIVATE KEY", model: PINNED_DEMO_MODEL,
    logger: event => events.push(event), fetchImpl: async () => {
      calls++;
      return new Response(JSON.stringify({output_text: "PRIVATE INVALID ANSWER", usage: {input_tokens: 1000 + calls, output_tokens: 20,
        input_tokens_details: {cached_tokens: calls === 1 ? 0 : 512}}}), {headers: {"x-request-id": `req_triage_${calls}`}});
    }});
  await assert.rejects(provider.generate(await fixture()));
  assert.equal(calls, 2);
  assert.deepEqual(events.map(e => e.attempt), ["initial", "repair"]);
  for (const [index, event] of events.entries()) {
    assert.deepEqual(event, {input_tokens: 1001 + index, output_tokens: 20, cached_tokens: index === 0 ? 0 : 512,
      model: PINNED_DEMO_MODEL, workload: "ticket-triage", prompt_version: "ticket-triage.v1", schema_version: "witnessops_ticket_triage_v1",
      attempt: index === 0 ? "initial" : "repair", request_id: `req_triage_${index + 1}`, status: 200,
      duration_ms: event.duration_ms, error_class: "provider_invalid_output", event: "openai_error"});
  }
  assert.doesNotMatch(JSON.stringify(events), /PRIVATE|DEMO-004|printer/);
});

test("a failing measurement sink does not interrupt the bounded repair", async () => {
  let calls = 0;
  const provider = createOpenAIProvider({apiKey: "test-key", model: PINNED_DEMO_MODEL,
    logger: () => { throw new Error("sink unavailable"); },
    fetchImpl: async () => { calls++; return new Response(JSON.stringify({output_text: "invalid"})); }});
  await assert.rejects(provider.generate(await fixture()), /ticket_triage_invalid_provider_output/);
  assert.equal(calls, 2);
});
