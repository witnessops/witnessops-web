import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const workspace = readFileSync(resolve(__dirname, "external-exposure-workspace.tsx"), "utf8");
const handoff = readFileSync(
  resolve(__dirname, "../docs-assistant/docs-assistant-contact-handoff.tsx"),
  "utf8",
);

test("opening Discuss this result posts no category telemetry", () => {
  assert.match(workspace, /Discuss this result/);
  assert.match(workspace, /onClick=\{\(\) => setDiscuss\(true\)\}/);
  assert.match(workspace, /trackOpen=\{false\}/);
  assert.doesNotMatch(workspace, /trackAskEvent|\/api\/ask-witnessops|fetch\s*\(\s*["']\/api\/ask-witnessops/);
  assert.match(handoff, /if \(trackOpen && expanded && !wasExpandedRef\.current\) \{\s*trackAskEvent\("contact_started"/);
  const route = readFileSync(resolve(__dirname, "../../app/api/ask-witnessops/route.ts"), "utf8");
  assert.match(route, /recordAskTelemetry/);
});
