import assert from "node:assert/strict";
import test from "node:test";
import { AskWitnessOpsRequestError } from "../docs-assistant/ask-witnessops-response";
import { sovereignRequestError } from "./sovereign-request-error";

test("connection, timeout, rate limit and disabled-service failures describe observed causes", () => {
  assert.match(sovereignRequestError(new TypeError("Failed to fetch"), "en"), /Couldn’t connect to Sovereign/);
  assert.match(sovereignRequestError(new DOMException("Expired", "TimeoutError"), "en"), /took too long/);
  assert.match(sovereignRequestError(new AskWitnessOpsRequestError("raw server text", 429), "en"), /Too many questions/);
  assert.match(sovereignRequestError(new AskWitnessOpsRequestError("raw server text", 410), "en"), /isn’t enabled here/);
  assert.match(sovereignRequestError(new SyntaxError("bad JSON"), "en"), /unreadable response/);
});

test("server and unknown failures do not expose raw errors or invent an OpenAI outage", () => {
  for (const locale of ["en", "pl"] as const) {
    for (const reason of [undefined, new Error("private upstream detail"), new AskWitnessOpsRequestError("private upstream detail", 503)]) {
      const message = sovereignRequestError(reason, locale);
      assert.doesNotMatch(message, /private|upstream|OpenAI|API key/);
      assert.match(message, locale === "en" ? /Your question is still here/ : /pytanie nadal jest/);
    }
    assert.match(sovereignRequestError(new TypeError("Offline"), locale), locale === "en" ? /connect/ : /połączyć/);
  }
});
