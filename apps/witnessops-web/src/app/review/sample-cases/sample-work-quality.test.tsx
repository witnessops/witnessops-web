import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WITHDRAWN_SAMPLE_PATHS } from "@/lib/withdrawn-offer-routes";
import Index from "./page";

const agentSamples = [
  "ai-agent-action-proof-run",
  "witnessed-crm-status-change",
  "privileged-access-grant",
  "approval-gated-containment",
];

test("sample index exposes only four agent-action examples with their limits", () => {
  const html = renderToStaticMarkup(<Index />);
  const linkedCases = [...html.matchAll(/href="(\/review\/sample-cases\/[^"#?]+)"/g)]
    .map((match) => match[1]);
  assert.deepEqual(linkedCases, agentSamples.map((slug) => `/review/sample-cases/${slug}`));
  for (const route of WITHDRAWN_SAMPLE_PATHS) {
    assert.equal(html.includes(`href="${route}"`), false, route);
  }
  assert.match(html, /Agent Action Security Review/);
  assert.match(html, /not live customer evidence/);
  assert.match(html, /not a complete sample of the current agent review/);
  assert.match(html, /not complete deliverables from the current paid review/);
  assert.match(html, /Explanatory example only/);
  assert.doesNotMatch(html, /External Attack Surface Review|SBOM field checklist|Access removed proof/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
});

test("public sample downloads are limited to the retained agent examples and verifier conformance", () => {
  const folders = readdirSync(resolve(__dirname, "../../../../public/samples"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(folders, [
    "api-key-rotation",
    "governed-agent-verifier-conformance",
    "witnessed-crm-status-change",
  ]);
});
