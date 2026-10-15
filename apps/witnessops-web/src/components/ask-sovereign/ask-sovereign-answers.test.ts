import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { sovereignAnswer } from "./ask-sovereign-answers";

test("simulated answers use only the two locked offers and make no request", () => {
  const source = readFileSync(resolve(__dirname, "ask-sovereign-answers.ts"), "utf8");
  assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest|\/api\/ask-witnessops/);
  const agent = sovereignAnswer("What does the agent action review cost at €2,500?", "en");
  const external = sovereignAnswer("What does the external attack surface review cost?", "en");
  const handoff = sovereignAnswer("Where is the data stored and which model do you use?", "en");
  assert.equal(agent.kind, "agent");
  assert.match(agent.text, /€2,500 excl\. VAT/);
  assert.doesNotMatch(agent.text, /retest/i);
  assert.equal(external.kind, "external");
  assert.match(external.text, /€1,900 excl\. VAT/);
  assert.match(external.text, /retest/i);
  assert.equal(handoff.kind, "handoff");
  assert.equal(handoff.needsReview, true);
  assert.match(sovereignAnswer("ile kosztuje ekspozycja", "pl").text, /€1 900 · bez VAT/);
});
