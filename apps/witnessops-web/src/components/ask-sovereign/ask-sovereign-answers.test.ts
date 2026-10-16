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
  assert.match(agent.text, /€2,500\u00A0excl\.\u00A0VAT/);
  assert.doesNotMatch(agent.text, /retest/i);
  assert.equal(external.kind, "external");
  assert.match(external.text, /€1,900\u00A0excl\.\u00A0VAT/);
  assert.match(external.text, /retest/i);
  assert.equal(handoff.kind, "handoff");
  assert.equal(handoff.needsReview, true);
  const polishExternal = sovereignAnswer("ile kosztuje ekspozycja", "pl").text;
  const polishAgent = sovereignAnswer("ile kosztuje przegląd agenta za 2500", "pl").text;
  assert.match(polishExternal, /€1\u00A0900\u00A0bez\u00A0VAT/);
  assert.match(polishAgent, /€2\u00A0500\u00A0bez\u00A0VAT/);
  assert.doesNotMatch(`${polishExternal}\n${polishAgent}`, /€\s?[\d\s\u00A0]+\s?·\s?bez VAT/);
});
