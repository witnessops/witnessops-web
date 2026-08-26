import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const page = readFileSync(resolve(import.meta.dirname, "page.tsx"), "utf8");
const consoleSrc = readFileSync(
  resolve(import.meta.dirname, "../../../components/verify/skill-console.tsx"),
  "utf8",
);

test("Check a Skill page renders the required product limitation", () => {
  assert.match(page, /Check an agent skill before you trust it/);
  assert.match(
    page,
    /Aegis checks a SKILL\.md against explicit deterministic policy rules\. A pass means no governed pattern was detected under the selected policy; it does not prove the skill is safe\./,
  );
  assert.match(page, /robots:\s*\{\s*index:\s*false/);
  assert.doesNotMatch(page, /Verified safe/);
  assert.doesNotMatch(page, /\bSafe\b/);
});

test("skill console exposes paste, file, policy, verdict, report controls", () => {
  assert.match(consoleSrc, /Paste SKILL\.md/);
  assert.match(consoleSrc, /Choose local file/);
  assert.match(consoleSrc, /SKILL_POLICY_PACKS\.map/);
  assert.match(consoleSrc, /\{busy \? "Checking…" : "Verify"\}/);
  assert.match(consoleSrc, /Copy Markdown/);
  assert.match(consoleSrc, /Download \.md/);
  assert.match(consoleSrc, /SKILL_PASS_SUMMARY/);
  assert.match(consoleSrc, /AEGIS_VERIFIER_ID/);
  assert.match(consoleSrc, /onDragOver=\{handleDragOver\}/);
  assert.match(consoleSrc, /onDrop=\{handleDrop\}/);
  assert.doesNotMatch(consoleSrc, /Verified safe/);
  assert.doesNotMatch(consoleSrc, /localStorage/);
});
