import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildOpenAIResponsesRequest,
  createOpenAIProvider,
  extractOpenAIOutputText,
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
