import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const webRoot = resolve(__dirname, "../..");

test("child titles do not already include the root WitnessOps suffix", () => {
  const verify = readFileSync(resolve(webRoot, "src/app/verify-ui/page.tsx"), "utf8");
  assert.match(verify, /title: "Homepage Hero UI Proof"/);
  assert.doesNotMatch(verify, /Homepage Hero UI Proof \| WitnessOps/);

  for (const page of [
    "src/app/docs/assistant/page.tsx",
    "src/app/pl/docs/assistant/page.tsx",
  ]) {
    const source = readFileSync(resolve(webRoot, page), "utf8");
    assert.match(source, /title: "Ask Sovereign"/);
    assert.match(source, /title: \{ absolute: "Page not found · WitnessOps" \}/);
    assert.doesNotMatch(source, /Ask Sovereign \| WitnessOps/);
  }
});
