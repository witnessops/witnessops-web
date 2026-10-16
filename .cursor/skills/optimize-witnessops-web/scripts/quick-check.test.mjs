import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(import.meta.dirname, "../../../..");
const copies = [
  ".cursor/skills/optimize-witnessops-web/scripts/quick-check.sh",
  ".grok/skills/optimize-witnessops-web/scripts/quick-check.sh",
];

for (const relativePath of copies) {
  test(`${relativePath} runs proof:test without hiding a failure`, () => {
    const script = readFileSync(resolve(repoRoot, relativePath), "utf8");
    assert.match(script, /"\$\{PNPM\[@\]\}" proof:test\n/);
    assert.doesNotMatch(script, /proof:test[^\n]*2>\/dev\/null/);
    assert.doesNotMatch(script, /merkle\.test\.ts/);
    assert.doesNotMatch(script, /if "\$\{PNPM\[@\]\}" proof:test/);
  });
}

test("pnpm optimize:quick-check points at the cursor copy", () => {
  const pkg = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
  assert.equal(
    pkg.scripts["optimize:quick-check"],
    "bash .cursor/skills/optimize-witnessops-web/scripts/quick-check.sh",
  );
});
