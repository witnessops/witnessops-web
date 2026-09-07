import assert from "node:assert/strict";
import test from "node:test";
import { summarizeAskFunnel } from "./summarize-ask-funnel.mjs";

test("funnel summary counts supported events and never returns source log content", () => {
  const result = summarizeAskFunnel([
    '2026-09-05 [ask-witnessops:funnel] {"event":"opened","surface":"widget"}',
    '[ask-witnessops:funnel] {"event":"answered","outcome":"generated"}',
    '[ask-witnessops:funnel] {"event":"answered","outcome":"unavailable"}',
    '[ask-witnessops:funnel] {"event":"feedback","feedback":"helpful"}',
    '[ask-witnessops:funnel] {"event":"buyer@example.com"}',
    '[ask-witnessops:funnel] not JSON buyer@example.com',
    'An unrelated line containing buyer@example.com',
  ]);
  assert.equal(result.events.opened, 1);
  assert.equal(result.events.answered, 2);
  assert.equal(result.events.mailbox_confirmed, 0);
  assert.deepEqual(result.answers, { generated: 1, guide: 0, unavailable: 1 });
  assert.equal(result.feedback.helpful, 1);
  assert.doesNotMatch(JSON.stringify(result), /buyer@example|2026-09-05/);
  assert.match(result.basis, /not unique visitors or verified sales/);
});
