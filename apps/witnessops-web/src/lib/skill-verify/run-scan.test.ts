import assert from "node:assert/strict";
import test from "node:test";
import {
  SKILL_CONTRACT_PATH,
  SKILL_MAX_BYTES,
  SKILL_PASS_SUMMARY,
  runSkillScan,
} from "./run-scan";

test("oversized input does not pass", () => {
  const outcome = runSkillScan({ content: "a".repeat(SKILL_MAX_BYTES + 1) });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.code, "OVERSIZED");
  }
});

test("pasted input size is enforced in UTF-8 bytes", () => {
  const outcome = runSkillScan({
    content: "é".repeat(Math.floor(SKILL_MAX_BYTES / 2) + 1),
  });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.code, "OVERSIZED");
  }
});

test("a pass summary remains accurate when documentary findings are retained", () => {
  const outcome = runSkillScan({
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
});

test("nul bytes are unsupported and never a pass", () => {
  const outcome = runSkillScan({ content: "---\nname: x\n---\n\0" });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.code, "UNSUPPORTED_FILE");
  }
});

test("local paste is scanned as SKILL.md regardless of display name", () => {
  const outcome = runSkillScan({
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
