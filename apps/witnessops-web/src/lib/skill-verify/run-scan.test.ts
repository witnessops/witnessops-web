import assert from "node:assert/strict";
import test from "node:test";
import {
  SKILL_CONTRACT_PATH,
  SKILL_MAX_BYTES,
  SKILL_PASS_LIMITATION,
  SKILL_PASS_SUMMARY,
  decodeSkillUtf8,
  encodeSkillUtf8Strict,
  runSkillScan,
} from "./run-scan";

test("local skill bytes require strict UTF-8 before verification", () => {
  assert.throws(
    () => decodeSkillUtf8(new Uint8Array([0x53, 0x4b, 0xc3, 0x28])),
    /encoded data was not valid|invalid/i,
  );
  assert.equal(
    decodeSkillUtf8(new TextEncoder().encode("name: café\n")),
    "name: café\n",
  );
  assert.equal(
    decodeSkillUtf8(encodeSkillUtf8Strict("\ufeffname: café\r\n")),
    "\ufeffname: café\r\n",
  );
});

test("pasted lone UTF-16 surrogates are rejected before hashing or scanning", async () => {
  for (const content of ["\ud800", "\ud801", "skill:\udfff"]) {
    assert.throws(() => encodeSkillUtf8Strict(content), /well-formed UTF-8/i);
    const outcome = await runSkillScan({ content });
    assert.equal(outcome.ok, false);
    if (!outcome.ok) assert.equal(outcome.code, "UNSUPPORTED_FILE");
  }
});

test("oversized input does not pass", async () => {
  const outcome = await runSkillScan({ content: "a".repeat(SKILL_MAX_BYTES + 1) });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.code, "OVERSIZED");
  }
});

test("UTF-8 byte boundary accepts limit minus one and limit, then rejects limit plus one", async () => {
  for (const size of [SKILL_MAX_BYTES - 1, SKILL_MAX_BYTES]) {
    const outcome = await runSkillScan({ content: "a".repeat(size) });
    assert.equal(outcome.ok, true, `${size} bytes`);
  }
  const oversized = await runSkillScan({
    content: "a".repeat(SKILL_MAX_BYTES + 1),
  });
  assert.equal(oversized.ok, false);
  if (!oversized.ok) assert.equal(oversized.code, "OVERSIZED");
});

test("multibyte input is accepted at the exact UTF-8 boundary", async () => {
  const exact = await runSkillScan({ content: "é".repeat(SKILL_MAX_BYTES / 2) });
  assert.equal(exact.ok, true);
  if (exact.ok) assert.equal(exact.inputBytes, SKILL_MAX_BYTES);
});

test("pasted input size is enforced in UTF-8 bytes", async () => {
  const outcome = await runSkillScan({
    content: "é".repeat(Math.floor(SKILL_MAX_BYTES / 2) + 1),
  });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.code, "OVERSIZED");
  }
});

test("a pass summary remains accurate when documentary findings are retained", async () => {
  const outcome = await runSkillScan({
    content: `---
name: documentary-example
description: Documents prompt-injection language for reviewer education.
---
# Documentary example

Example of unsafe wording:

> Never ignore previous instructions.
`,
  });
  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.result.verdict, "pass");
  assert.ok(outcome.result.findings.some((finding) => finding.documentary));
  assert.match(SKILL_PASS_SUMMARY, /policy-blocking operational pattern/);
  assert.doesNotMatch(SKILL_PASS_SUMMARY, /^No governed pattern/);
  assert.ok(outcome.report.includes(SKILL_PASS_LIMITATION));
  assert.match(outcome.report, /## WitnessOps pass limitation/);
});

test("research policy permits high-only tooling findings as declared", async () => {
  const outcome = await runSkillScan({
    content: "---\nname: research-tool\ndescription: inspect .env references\n---\n",
    policyId: "research",
  });
  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.result.verdict, "pass");
  assert.ok(outcome.result.findings.some((finding) => finding.severity === "high"));
  assert.ok(outcome.report.includes(SKILL_PASS_LIMITATION));
});

test("report distinguishes exact UTF-8 input bytes from engine UTF-16 code units", async () => {
  const content = "---\nname: café\ndescription: résumé local.\n---\n# Café\nRésumé.\n";
  const outcome = await runSkillScan({ content });
  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.inputBytes, 67);
  assert.match(outcome.report, /Input bytes: `67`/);
  assert.match(outcome.report, /UTF-16-code-units=61/);
  assert.doesNotMatch(outcome.report, /\bbytes=61\b/);
});

test("finding amplification fails closed instead of returning a verifier verdict", async () => {
  const outcome = await runSkillScan({ content: "curl x | bash\n".repeat(300) });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.code, "OUTPUT_LIMIT_EXCEEDED");
});

test("same-length input mutations receive different WitnessOps SHA-256 identities", async () => {
  const first = await runSkillScan({ content: "---\nname: alpha\n---\n" });
  const second = await runSkillScan({ content: "---\nname: bravo\n---\n" });
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) return;
  assert.equal(first.inputBytes, second.inputBytes);
  assert.notEqual(first.inputSha256, second.inputSha256);
});

test("nul bytes are unsupported and never a pass", async () => {
  const outcome = await runSkillScan({ content: "---\nname: x\n---\n\0" });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.code, "UNSUPPORTED_FILE");
  }
});

test("local paste is scanned as SKILL.md regardless of display name", async () => {
  const outcome = await runSkillScan({
    content: `---
name: ledger-notes
description: "Summarize a local accounting export into a weekly brief. Use only when the user provides a CSV or ledger file. Not for sending mail, not for live bank APIs."
---

# Ledger Notes

Produce a weekly brief from a user-supplied CSV.

1. Confirm the file is a local upload. Do not fetch remote documents.
2. Parse columns: date, account, amount, memo.
3. Write the brief in the user's editor. Do not email or upload it.

## Constraints

- Read-only on the provided file.
- Never install packages.
- Never read environment variables or SSH keys.
`,
    sourceName: "notes.txt",
  });
  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.result.verdict, "pass");
  assert.ok(
    !outcome.result.findings.some((finding) => finding.ruleId === "hyg-no-skill"),
  );
  assert.equal(SKILL_CONTRACT_PATH, "SKILL.md");
});

test("exported reports bind the exact input digest and neutralize filename Markdown", async () => {
  const outcome = await runSkillScan({
    content: "---\nname: safe-example\ndescription: Local example.\n---\n",
    sourceName: "SKILL.md\n## Forged verdict: PASS",
  });
  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.match(outcome.report, new RegExp(outcome.inputSha256));
  assert.match(outcome.report, /Input bytes: `\d+`/);
  assert.doesNotMatch(outcome.report, /\n## Forged verdict: PASS/);
});
