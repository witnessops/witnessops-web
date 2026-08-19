import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { resolveWitnessOpsDocsRoot } from "./docs";

const docsRoot = resolveWitnessOpsDocsRoot();

function readAllMdx(): string {
  const parts: string[] = [];
  function walk(dir: string) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) walk(full);
      else if (name.endsWith(".mdx")) parts.push(fs.readFileSync(full, "utf-8"));
    }
  }
  walk(docsRoot);
  return parts.join("\n");
}

test("public docs MDX forbid dead mesh URL and over-strong issuance claim", () => {
  const corpus = readAllMdx();
  assert.ok(!corpus.includes("hacktheworld.zip"), "hacktheworld link must be removed");
  assert.ok(
    !corpus.includes("proves that WitnessOps issued"),
    "unconditioned issuance claim must be softened",
  );
});

test("buyer-path offer section matches the live catalogue", () => {
  const buyer = fs.readFileSync(
    path.join(docsRoot, "getting-started/proof-run-buyer-path.mdx"),
    "utf-8",
  );
  assert.match(buyer, /Public Exposure Review/);
  assert.match(buyer, /Customer Security Review Sprint/);
  assert.match(buyer, /Launch Readiness Check — listed on the catalogue; \*\*not yet admitted\*\*/);
  assert.match(buyer, /pinned AI-agent public sample only/i);
  assert.doesNotMatch(buyer, /six active services/);
  assert.doesNotMatch(buyer, /Proof-Backed Security Workflow/);
  assert.doesNotMatch(buyer, /\bCodex\b/);
});
