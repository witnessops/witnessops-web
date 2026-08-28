import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  AEGIS_VERIFIER_ID,
  DEFAULT_SKILL_POLICY_ID,
  GOVERNED_AGENT_VERIFIER_CONTRACT,
  SKILL_CONTRACT_PATH,
  SKILL_MAX_BYTES,
  SKILL_MAX_EVIDENCE_BYTES,
  SKILL_MAX_FINDINGS,
  SKILL_MAX_REPORT_BYTES,
  SKILL_MAX_WORKER_DURATION_MS,
  SKILL_PASS_LIMITATION,
  SKILL_POLICY_PACKS,
} from "./contract";
import {
  getSkill,
  getSkillVersion,
  listSkills,
  listSkillVersions,
} from "../skills/catalog";

const repoRoot = resolve(process.cwd(), "../..");
const sampleRoot = resolve(
  process.cwd(),
  "public/samples/governed-agent-verifier-conformance/v1",
);
const currentSkillPath = resolve(
  repoRoot,
  "content/witnessops/skills/governed-agent-verifier/SKILL.md",
);
const version100Path = resolve(
  sampleRoot,
  "governed-agent-verifier-v1.0.0-SKILL.md",
);
const version101Path = resolve(
  sampleRoot,
  "governed-agent-verifier-v1.0.1-SKILL.md",
);
const contractPath = resolve(sampleRoot, "CONTRACT.json");
const receiptPath = resolve(sampleRoot, "RECEIPT.json");

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

test("v1.0.0 is preserved and v1.0.1 exact bytes match the canonical skill", () => {
  const currentBytes = readFileSync(currentSkillPath);
  const version100Bytes = readFileSync(version100Path);
  const version101Bytes = readFileSync(version101Path);
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));

  assert.deepEqual(currentBytes, version101Bytes);
  assert.equal(sha256(version100Bytes), receipt.artifacts.skillV100Sha256);
  assert.equal(sha256(version101Bytes), receipt.artifacts.skillV101Sha256);
  assert.equal(
    receipt.artifacts.skillV100Sha256,
    "2a0b2309a1785081ecc20c7e325b3d23454b2bfd65d9641ea82164bf9298aad5",
  );
  assert.equal(
    receipt.artifacts.skillV101Sha256,
    "ccc325d40dc89823adff2d10f81fb02aa583a4edb5fd19bb1501b8512510bdb0",
  );
  assert.match(version100Bytes.toString("utf8"), /Bound input to 128 KiB\./);
  assert.match(version101Bytes.toString("utf8"), /Bound input to 16 KiB\./);

  const mutation = Buffer.from(version101Bytes);
  mutation[mutation.length - 2] ^= 1;
  assert.equal(mutation.byteLength, version101Bytes.byteLength);
  assert.notEqual(sha256(mutation), receipt.artifacts.skillV101Sha256);
});

test("runtime, policy metadata, and public skill language consume one contract", () => {
  const contractBytes = readFileSync(contractPath);
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  const skill = readFileSync(currentSkillPath, "utf8");

  assert.equal(sha256(contractBytes), receipt.artifacts.contractSha256);
  assert.equal(GOVERNED_AGENT_VERIFIER_CONTRACT.skill.version, "1.0.1");
  assert.equal(GOVERNED_AGENT_VERIFIER_CONTRACT.input.encoding, "utf-8-strict");
  assert.deepEqual(GOVERNED_AGENT_VERIFIER_CONTRACT.input.acceptedMediaTypes, [
    "text/markdown",
    "text/plain",
    "text/x-markdown",
  ]);
  assert.equal(SKILL_MAX_BYTES, 16 * 1024);
  assert.equal(SKILL_CONTRACT_PATH, "SKILL.md");
  assert.equal(SKILL_MAX_WORKER_DURATION_MS, 30_000);
  assert.equal(SKILL_MAX_FINDINGS, 200);
  assert.equal(SKILL_MAX_EVIDENCE_BYTES, 8192);
  assert.equal(SKILL_MAX_REPORT_BYTES, 262_144);
  assert.equal(DEFAULT_SKILL_POLICY_ID, "standard");
  assert.equal(AEGIS_VERIFIER_ID, receipt.artifacts.aegisVerifierId);
  assert.deepEqual(
    SKILL_POLICY_PACKS.map(({ id, failAt, reviewAt }) => ({ id, failAt, reviewAt })),
    GOVERNED_AGENT_VERIFIER_CONTRACT.policy.packs.map(
      ({ id, failAt, reviewAt }) => ({ id, failAt, reviewAt }),
    ),
  );
  assert.ok(skill.includes(SKILL_PASS_LIMITATION));
  assert.match(skill, /dedicated browser worker with a 30-second timeout/);
  assert.match(skill, /\| research \| critical \| none \(high tooling permitted\) \|/);
});

test("only governed-agent-verifier advances and both immutable releases resolve", () => {
  const current = getSkill("governed-agent-verifier");
  const historical = getSkillVersion("governed-agent-verifier", "1.0.0");
  assert.ok(current);
  assert.ok(historical);
  assert.equal(current.version, "1.0.1");
  assert.equal(current.sha256, "ccc325d40dc89823adff2d10f81fb02aa583a4edb5fd19bb1501b8512510bdb0");
  assert.equal(historical.version, "1.0.0");
  assert.equal(historical.sha256, "2a0b2309a1785081ecc20c7e325b3d23454b2bfd65d9641ea82164bf9298aad5");
  assert.deepEqual(
    listSkillVersions(current.slug).map(({ version }) => version),
    ["1.0.1", "1.0.0"],
  );
  assert.ok(
    listSkills()
      .filter(({ slug }) => slug !== current.slug)
      .every(({ version }) => version === "1.0.0"),
  );
});

test("engine identity and package digest match vendored provenance", () => {
  const manifest = JSON.parse(
    readFileSync(resolve(repoRoot, "vendor/aegis/manifest.json"), "utf8"),
  );
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  assert.equal(manifest.verifier, AEGIS_VERIFIER_ID);
  assert.equal(manifest.sha256, receipt.artifacts.aegisPackageSha256);
});

test("browser client uses the worker boundary and build executes this gate", () => {
  const consoleSource = readFileSync(
    resolve(process.cwd(), "src/components/verify/skill-console.tsx"),
    "utf8",
  );
  const workerClient = readFileSync(
    resolve(process.cwd(), "src/lib/skill-verify/run-scan-in-worker.ts"),
    "utf8",
  );
  const appPackage = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));

  assert.match(consoleSource, /runSkillScanInWorker/);
  assert.doesNotMatch(consoleSource, /import\s+\{[^}]*\brunSkillScan\b/);
  assert.doesNotMatch(consoleSource, /from ["']aegis-deterministic/);
  const verifyIndex = consoleSource.indexOf("async function verify");
  const clearOutcomeIndex = consoleSource.indexOf("setOutcome(null)", verifyIndex);
  const workerCallIndex = consoleSource.indexOf("runSkillScanInWorker", verifyIndex);
  assert.ok(
    clearOutcomeIndex > verifyIndex && clearOutcomeIndex < workerCallIndex,
    "a previous verdict must be cleared before a new worker scan starts",
  );
  assert.match(consoleSource, /fileReadGeneration\.current !== generation/);
  assert.match(consoleSource, /file\.type === "text\/x-markdown"/);
  assert.match(consoleSource, /accept="[^"]*text\/x-markdown"/);
  assert.match(workerClient, /new Worker\(new URL\("\.\/skill-scan\.worker\.ts", import\.meta\.url\)/);
  assert.match(workerClient, /worker\.terminate\(\)/);
  assert.match(workerClient, /code: "SCAN_TIMEOUT"/);
  assert.match(appPackage.scripts.build, /test:skill-contract/);

  const canaryWorkflow = readFileSync(
    resolve(repoRoot, ".github/workflows/canary-receipt-emit.yml"),
    "utf8",
  );
  const gateIndex = canaryWorkflow.indexOf("pnpm verify:skill-contract");
  const signIndex = canaryWorkflow.indexOf("cosign sign-blob", gateIndex);
  assert.ok(gateIndex >= 0, "signing workflow must run the repository gate");
  assert.ok(signIndex > gateIndex, "receipt signing must happen after the repository gate");
  assert.match(canaryWorkflow, /sourceRevision: process\.env\.GITHUB_SHA/);
  assert.match(
    canaryWorkflow,
    /verifiedSourceRevision: process\.env\.VERIFIED_SOURCE_REVISION/,
  );
  assert.match(canaryWorkflow, /needs: verify-conformance/);
  assert.match(canaryWorkflow, /test "\$\{VERIFIED_SOURCE_REVISION\}" = "\$\{GITHUB_SHA\}"/);
  const signingJob = canaryWorkflow.slice(canaryWorkflow.indexOf("\n  emit-receipt:"));
  assert.doesNotMatch(
    signingJob,
    /pnpm install/,
    "the OIDC-enabled signing job must not install repository dependencies",
  );
  assert.match(canaryWorkflow, /SOURCE_BINDING_BASENAME/);
  assert.match(
    canaryWorkflow,
    /Binds the exact receipt bytes and named passing checks to this GitHub source revision/,
  );
});

test("public receipt manifest and offline verifier reproduce the bounded verdict", () => {
  const manifestLines = readFileSync(resolve(sampleRoot, "MANIFEST.sha256"), "utf8")
    .trim()
    .split("\n");
  for (const line of manifestLines) {
    const [expected, filename] = line.split(/\s{2}/);
    assert.equal(sha256(readFileSync(resolve(sampleRoot, filename))), expected, filename);
  }
  const receiptSha256 = sha256(readFileSync(receiptPath));
  const publicManifest = readFileSync(
    resolve(repoRoot, "PUBLIC_PROOF_SURFACE_MANIFEST.v1.yaml"),
    "utf8",
  );
  assert.match(publicManifest, new RegExp(receiptSha256));

  const verification = spawnSync(
    process.execPath,
    [resolve(sampleRoot, "verify.mjs")],
    { encoding: "utf8" },
  );
  assert.equal(verification.status, 0, verification.stderr);
  assert.match(verification.stdout, /"verdict": "ARTIFACT_SET_CONSISTENT"/);
  assert.doesNotMatch(verification.stdout, /runtime constants.*agree/i);
});
