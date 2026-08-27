import assert from "node:assert/strict";
import test from "node:test";

import { buildAskAiContactScope } from "./docs-assistant-contact-handoff";

test("Ask AI contact handoff records a bounded optional note", () => {
  const scope = buildAskAiContactScope("  Discuss one agent workflow.  ");

  assert.match(scope, /Contact path: Ask AI panel handoff/);
  assert.match(scope, /Visitor note: Discuss one agent workflow\./);
  assert.match(scope, /mailbox verification/);
  assert.match(scope, /No review starts/);
  assert.match(scope, /no files, secrets, logs, screenshots/);
});

test("Ask AI contact handoff keeps an omitted note explicit", () => {
  assert.match(buildAskAiContactScope("   "), /Visitor note: not provided/);
});
