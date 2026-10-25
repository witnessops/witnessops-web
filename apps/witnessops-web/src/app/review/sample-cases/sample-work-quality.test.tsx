import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import Index from "./page";
import Launch from "./launch-readiness-review/page";
import Custody from "./custody-wallet-ops-review/page";
import Access from "./access-removed-proof/page";
import Incident from "./incident-readiness-review/page";
import Local from "./local-server-security-review/page";

test("all five historical proofpacks disclose incompatible Bundle V1 and unavailable verifier", () => {
  for (const Page of [Launch, Custody, Access, Incident, Local]) {
    const html = renderToStaticMarkup(<Page />);
    assert.ok(html.includes("earlier proofpack format"));
    assert.match(html, /not compatible with the\s*current Bundle V1 verifier/);
    assert.match(html, /pinned historical verifier is not presently\s*available/);
    assert.match(html, /href="\/samples\/[^" ]+\.proofpack"/);
    assert.ok(!html.includes('href="/proofpack"'));
    assert.ok(!html.includes("Offline product verifier path"));
    if (Page !== Local) assert.ok(!html.includes('href="/verify"'));
  }
});

test("index leads with current-review examples and labels historical service samples", () => {
  const html = renderToStaticMarkup(<Index />);
  assert.ok(html.includes('href="/review/sample-cases/external-exposure-assessment"'));
  assert.ok(html.includes("not live customer evidence"));
  assert.ok(!html.includes("How to use these pages"));
  const firstCard = html.indexOf('href="/review/sample-cases/external-exposure-assessment"');
  const agentCard = html.indexOf('href="/review/sample-cases/ai-agent-action-proof-run"');
  assert.ok(firstCard > 0 && firstCard < agentCard);
  assert.ok(agentCard < html.indexOf("Next steps"));
  for (const withdrawn of [
    "/review/sample-cases/local-server-security-review",
    "/review/sample-cases/launch-readiness-review",
    "/review/sample-cases/custody-wallet-ops-review",
    "/review/sample-cases/incident-readiness-review",
    "/review/sample-cases/customer-security-review-sprint",
  ]) {
    assert.equal(html.includes(`href="${withdrawn}"`), false, withdrawn);
  }
  assert.ok(html.includes("Agent Action Security Review"));
  assert.ok(html.includes("External Attack Surface Review"));
  assert.ok(html.includes("not a complete sample of the current agent review"));
  assert.ok(html.includes("not additional reviews offered for sale"));
  assert.ok(!html.includes("External Exposure assessment"));
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
});
