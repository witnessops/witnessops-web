import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAskEvent } from "@/lib/docs-assistant/ask-analytics";
import { isAskTelemetryRequest, recordAskTelemetry } from "./ask-telemetry";

function request(origin = "https://witnessops.com") {
  return new Request("https://witnessops.com/api/ask-witnessops", { headers: { origin } });
}

test("funnel accepts only fixed categories, never contact details or free text", () => {
  assert.deepEqual(normalizeAskEvent({ event: "answered", outcome: "generated", surface: "widget" }), {
    event: "answered", outcome: "generated", surface: "widget",
  });
  for (const payload of [
    { event: "opened", email: "buyer@example.com" },
    { event: "opened", question: "Private workflow" },
    { event: "opened", service_id: "buyer@example.com" },
    { event: "opened", surface: "/contact?email=buyer@example.com" },
    { event: "answered", outcome: "Arbitrary provider error" },
    { event: "feedback", feedback: "Private note" },
    { event: "opened", feedback: "helpful" },
    { event: "feedback" },
    { event: "paid_client" },
  ]) assert.equal(normalizeAskEvent(payload), null);
});

test("telemetry requires same-origin requests and never logs rejected content", (t) => {
  const logs: unknown[][] = [];
  t.mock.method(console, "info", (...args: unknown[]) => logs.push(args));
  assert.equal(recordAskTelemetry({ telemetry: { event: "opened" } }, request("https://elsewhere.example")).status, 403);
  assert.equal(recordAskTelemetry({ telemetry: { event: "opened", email: "buyer@example.com" } }, request()).status, 400);
  assert.equal(recordAskTelemetry({ telemetry: { event: "opened" }, question: "private" }, request()).status, 400);
  assert.equal(logs.length, 0);
  const response = recordAskTelemetry({ telemetry: { event: "feedback", feedback: "helpful" } }, request());
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(logs, [["[ask-witnessops:funnel]", '{"event":"feedback","feedback":"helpful"}']]);
  assert.equal(isAskTelemetryRequest({ telemetry: null }), true);
  assert.equal(isAskTelemetryRequest({ question: "pricing" }), false);
});

test("canonical browser origin works behind the existing reverse proxy", (t) => {
  t.mock.method(console, "info", () => undefined);
  const proxied = new Request("http://127.0.0.1:3000/api/ask-witnessops", {
    headers: { origin: "https://witnessops.com", "sec-fetch-site": "same-origin" },
  });
  assert.equal(recordAskTelemetry({ telemetry: { event: "opened" } }, proxied).status, 204);
});
