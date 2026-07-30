import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const sampleCasePages = [
  "approval-gated-containment/page.tsx",
  "privileged-access-grant/page.tsx",
] as const;

test("secondary sample cases use normalized security-workflow CTA labels", () => {
  for (const page of sampleCasePages) {
    const source = readFileSync(resolve(__dirname, page), "utf-8");

    assert.match(
      source,
      /label=\"Start a review\"/,
      `${page} should link to the request path with normalized CTA copy`,
    );
    assert.doesNotMatch(
      source,
      /label=\"Request Proof Run\"/,
      `${page} should not use the old title-case request label`,
    );
  }
});
