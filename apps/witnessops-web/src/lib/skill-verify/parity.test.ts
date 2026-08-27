import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { DEFAULT_SKILL_POLICY_ID, SKILL_POLICY_PACKS } from "./policies";
import { AEGIS_VERIFIER_ID, runSkillScan } from "./run-scan";

type SampleSkill = {
  id: string;
  files: { path: string; content: string }[];
};

async function loadPackagedSamples(): Promise<SampleSkill[]> {
  const require = createRequire(import.meta.url);
  const scanEntry = require.resolve("aegis-deterministic");
  const samplesUrl = pathToFileURL(resolve(dirname(scanEntry), "samples.js")).href;
  const mod = (await import(samplesUrl)) as { SAMPLES: SampleSkill[] };
  return mod.SAMPLES;
}

async function sampleContent(id: string): Promise<string> {
  const samples = await loadPackagedSamples();
  const sample = samples.find((item) => item.id === id);
  assert.ok(sample, `missing packaged sample ${id}`);
  return sample.files[0]?.content ?? "";
}

test("Standard is the default policy and all Aegis packs are selectable", () => {
  assert.equal(DEFAULT_SKILL_POLICY_ID, "standard");
  assert.deepEqual(
    SKILL_POLICY_PACKS.map((pack) => pack.id),
    ["standard", "enterprise", "restricted", "research"],
  );
});

test("empty input does not pass", async () => {
  const outcome = await runSkillScan({ content: "   " });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.code, "EMPTY_INPUT");
});

test("ledger-notes passes Standard with packaged identity", async () => {
  const outcome = await runSkillScan({
    content: await sampleContent("ledger-notes"),
    policyId: "standard",
    sourceName: "ledger-notes.md",
  });
  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.result.verdict, "pass");
  assert.equal(outcome.result.policyId, "standard");
  assert.equal(outcome.result.verifier, AEGIS_VERIFIER_ID);
  assert.match(outcome.report, /aegis-deterministic@2\.0\.0-cleanroom\.3/);
  assert.match(outcome.report, /- Policy: standard/);
  assert.match(outcome.report, /- Verdict: \*\*pass\*\*/);
});

test("cluster-ops fails Standard and includes sc-pipe-shell", async () => {
  const outcome = await runSkillScan({
    content: await sampleContent("cluster-ops"),
    policyId: "standard",
  });
  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.result.verdict, "fail");
  assert.ok(outcome.result.findings.some((finding) => finding.ruleId === "sc-pipe-shell"));
  const pipe = outcome.result.findings.find((finding) => finding.ruleId === "sc-pipe-shell");
  assert.equal(pipe?.severity, "critical");
});

test("glyph-override fails with inj-ignore-prev and confusable evidence", async () => {
  const outcome = await runSkillScan({
    content: await sampleContent("glyph-override"),
    policyId: "standard",
  });
  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.result.verdict, "fail");
  const ignore = outcome.result.findings.find((finding) => finding.ruleId === "inj-ignore-prev");
  const homo = outcome.result.findings.find((finding) => finding.ruleId === "obf-homo");
  assert.ok(ignore);
  assert.equal(ignore?.severity, "critical");
  assert.ok(homo);
  assert.match(homo?.evidence?.transform ?? "", /GREEK SMALL LETTER OMICRON/i);
});

test("paste-exfil fails with exfil-sensitive-transfer components", async () => {
  const outcome = await runSkillScan({
    content: await sampleContent("paste-exfil"),
    policyId: "standard",
  });
  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.result.verdict, "fail");
  const transfer = outcome.result.findings.find(
    (finding) => finding.ruleId === "exfil-sensitive-transfer",
  );
  assert.ok(transfer);
  assert.equal(transfer?.severity, "critical");
  assert.match(transfer?.evidence?.components?.source ?? "", /credentials/i);
  assert.match(transfer?.evidence?.components?.action ?? "", /paste/i);
  assert.match(transfer?.evidence?.components?.destination ?? "", /chatgpt\.com/i);
});

test("policy switching uses the selected pack without changing scanner identity", async () => {
  const content = await sampleContent("cluster-ops");
  for (const pack of SKILL_POLICY_PACKS) {
    const outcome = await runSkillScan({ content, policyId: pack.id });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) continue;
    assert.equal(outcome.result.policyId, pack.id);
    assert.equal(outcome.result.verifier, AEGIS_VERIFIER_ID);
    assert.equal(outcome.result.verdict, "fail");
  }
});
