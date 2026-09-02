import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const page = readFileSync(resolve(import.meta.dirname, "page.tsx"), "utf8");
const contract = JSON.parse(
  readFileSync(
    resolve(
      import.meta.dirname,
      "../../../../public/samples/governed-agent-verifier-conformance/v1/CONTRACT.json",
    ),
    "utf8",
  ),
);
const consoleSrc = readFileSync(
  resolve(import.meta.dirname, "../../../components/verify/skill-console.tsx"),
  "utf8",
);
const nonDiscoverySurfaces = [
  resolve(import.meta.dirname, "../../../components/marketing/footer.tsx"),
  resolve(import.meta.dirname, "../../../components/shared/navbar.tsx"),
  resolve(import.meta.dirname, "../../sitemap.ts"),
].map((path) => readFileSync(path, "utf8"));
const homepage = readFileSync(
  resolve(import.meta.dirname, "../../../components/marketing/buyer-homepage.tsx"),
  "utf8",
);
const skillDetail = readFileSync(
  resolve(import.meta.dirname, "../../(library)/library/[slug]/page.tsx"),
  "utf8",
);

test("Check a Skill page renders the required product limitation", () => {
  assert.match(page, /Check an agent skill before you trust it/);
  assert.match(page, /SKILL_PASS_LIMITATION/);
  assert.match(contract.claims.passLimitation, /policy-blocking operational pattern/);
  assert.match(contract.claims.passLimitation, /Documentary findings may remain/);
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
  assert.match(consoleSrc, /SKILL_PASS_LIMITATION/);
  assert.match(consoleSrc, /runSkillScanInWorker/);
  assert.match(consoleSrc, /input sha256:/);
  assert.doesNotMatch(consoleSrc, /Verified safe/);
  assert.doesNotMatch(consoleSrc, /localStorage/);
  assert.doesNotMatch(consoleSrc, /sessionStorage/);
});

test("Check a Skill remains noindex and outside active commercial discovery", () => {
  assert.match(page, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false/);
  for (const source of nonDiscoverySurfaces) {
    assert.doesNotMatch(source, /\/verify\/skill/);
  }
  assert.doesNotMatch(homepage, /href:\s*"\/verify\/skill"/);
  assert.match(skillDetail, /Check this exact version/);
  assert.match(skillDetail, /skill=\$\{encodeURIComponent\(skill\.slug\)\}/);
  assert.match(skillDetail, /sha256=\$\{skill\.sha256\}/);
});

test("exact-version prefill is server validated and editing invalidates the bind", () => {
  assert.match(page, /skill\.version === requestedVersion/);
  assert.match(page, /skill\.sha256 === requestedSha256/);
  assert.match(page, /readSkillMarkdown\(exactSkill\.slug, exactSkill\.version\)/);
  assert.match(consoleSrc, /data-ui-proof-id="skill-exact-version-binding"/);
  assert.match(consoleSrc, /setExactBinding\(null\)/);
  assert.match(consoleSrc, /Exact-version binding removed because the input changed/);
});
