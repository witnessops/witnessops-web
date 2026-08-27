import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const page = readFileSync(resolve(import.meta.dirname, "page.tsx"), "utf8");
const consoleSrc = readFileSync(
  resolve(import.meta.dirname, "../../../components/verify/skill-console.tsx"),
  "utf8",
);
const discoverySurfaces = [
  resolve(import.meta.dirname, "../../../components/marketing/buyer-homepage.tsx"),
  resolve(import.meta.dirname, "../../../components/marketing/footer.tsx"),
  resolve(import.meta.dirname, "../../../components/shared/navbar.tsx"),
  resolve(import.meta.dirname, "../../sitemap.ts"),
  resolve(import.meta.dirname, "../../../../../../content/witnessops/landing/home.yaml"),
].map((path) => readFileSync(path, "utf8"));

test("Check a Skill page renders the required product limitation", () => {
  assert.match(page, /Check an agent skill before you trust it/);
  assert.match(
    page,
    /Aegis checks a SKILL\.md against explicit deterministic policy rules\. A pass means no governed pattern was detected under the selected policy; it does not prove the skill is safe\./,
  );
  assert.match(page, /robots:\s*\{\s*index:\s*false/);
  assert.match(page, /Local verification boundary/);
  assert.match(page, /Deterministic policy output · bounded to declared instructions/);
  assert.match(page, /data-ui-proof-id="skill-local-boundary"/);
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
  assert.match(consoleSrc, /Evaluation workspace/);
  assert.match(consoleSrc, /Policy result/);
  assert.match(consoleSrc, /Bounded result · not a safety verdict/);
  assert.match(consoleSrc, /Declared instructions only/);
  assert.match(consoleSrc, /No upload/);
  assert.match(consoleSrc, /No model call/);
  assert.match(consoleSrc, /data-ui-proof-id="skill-result"/);
  assert.doesNotMatch(consoleSrc, /Verified safe/);
  assert.doesNotMatch(consoleSrc, /localStorage/);
});

test("Check a Skill remains noindex and absent from public discovery surfaces", () => {
  assert.match(page, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false/);
  for (const source of discoverySurfaces) {
    assert.doesNotMatch(source, /\/verify\/skill/);
    assert.doesNotMatch(source, /Check a skill/i);
  }
});
