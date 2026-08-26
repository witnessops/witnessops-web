import assert from "node:assert/strict";
import test from "node:test";
import {
  SKILL_CONTRACT_PATH,
  SKILL_MAX_BYTES,
  runSkillScan,
} from "./run-scan";

test("oversized input does not pass", () => {
  const outcome = runSkillScan({ content: "a".repeat(SKILL_MAX_BYTES + 1) });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.code, "OVERSIZED");
  }
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
