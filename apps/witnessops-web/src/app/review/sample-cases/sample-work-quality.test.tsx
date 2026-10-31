import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import Index from "./page";
import Launch from "./launch-readiness-review/page";
import Custody from "./custody-wallet-ops-review/page";
import Access from "./access-removed-proof/page";
import Incident from "./incident-readiness-review/page";
import Local from "./local-server-security-review/page";
import CustomerSecurityReview from "./customer-security-review-sprint/page";

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

test("index leads with the agent specimen and labels the parked external sample", () => {
  const html = renderToStaticMarkup(<Index />);
  assert.ok(html.includes('href="/review/sample-cases/external-exposure-assessment"'));
  assert.ok(html.includes("not live customer evidence"));
  assert.ok(!html.includes("How to use these pages"));
  const agentCard = html.indexOf('href="/review/sample-cases/ai-agent-action-proof-run"');
  const externalCard = html.indexOf('href="/review/sample-cases/external-exposure-assessment"');
  assert.ok(agentCard > 0 && agentCard < externalCard);
  assert.ok(externalCard < html.indexOf("Next steps"));
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
  assert.ok(html.includes("no longer available for new engagements"));
  assert.ok(html.includes("not a complete sample of the current agent review"));
  assert.ok(html.includes("not additional reviews offered for sale"));
  assert.ok(!html.includes("compare the two reviews"));
  assert.ok(!html.includes("External Exposure assessment"));
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
});

test("withdrawn customer review sample links only to the current review", () => {
  const html = renderToStaticMarkup(<CustomerSecurityReview />);
  assert.match(html, /Historical sample, offer withdrawn/);
  assert.equal((html.match(/href="\/reviews\/agent-action-security-review"/g) ?? []).length, 2);
  assert.ok(!html.includes('href="/review/request'));
  assert.ok(!html.includes("Ask about this review"));
  assert.ok(!html.includes("Start a review"));
});
