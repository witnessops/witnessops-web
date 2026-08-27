import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const en = readFileSync(resolve(__dirname, "library/page.tsx"), "utf-8");
const pl = readFileSync(
  resolve(__dirname, "../pl/library/page.tsx"),
  "utf-8",
);

test("EN canonical library exposes exact-byte first-party skill contracts", () => {
  assert.match(en, /All Skills Library/);
  assert.match(en, /WitnessOps skills/);
  assert.match(en, /listSkills\(\)/);
  assert.match(en, /\/library\/governed-agent-verifier/);
  assert.match(en, /className=\{`\$\{styles\.frame\} \$\{styles\.catalog\}`\}/);
  assert.match(en, /href=\{`\/library\/\$\{skill\.slug\}`\}/);
  assert.doesNotMatch(en, /https:\/\/witnessops\.com\/library/);
  assert.match(en, /Inspect exact bytes/);
  assert.match(en, /Apache-2\.0/);
  assert.match(en, /no marketplace, ratings, accounts, remote fetching, or cloud skill storage/);
  assert.match(en, /does not establish that a resulting workflow/);
});

test("PL library mirrors the short map structure", () => {
  assert.match(pl, /Publiczne punkty wejścia/);
  assert.match(pl, /Przeglądaj usługi/);
  assert.match(pl, /Zweryfikuj zapis/);
  assert.match(pl, /href: "\/pl\/verify"/);
  assert.match(pl, /Rozpocznij przegląd/);
  assert.doesNotMatch(pl, /border-2 border-black bg-white/);
});
