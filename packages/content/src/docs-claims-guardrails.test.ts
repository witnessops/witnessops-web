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

test("Security Systems buyer index does not surface Mesh Federation or VaultMesh", () => {
  const index = fs.readFileSync(
    path.join(docsRoot, "security-systems/index.mdx"),
    "utf-8",
  );
  assert.doesNotMatch(index, /mesh-federation-and-vmesh/);
  assert.doesNotMatch(index, /Mesh Federation/);
  assert.doesNotMatch(index, /VaultMesh/);
});

test("buyer-path offer section matches the live catalogue", () => {
  const buyer = fs.readFileSync(
    path.join(docsRoot, "getting-started/proof-run-buyer-path.mdx"),
    "utf-8",
  );
  assert.match(buyer, /Public Exposure Review/);
  assert.match(buyer, /Customer Security Review Sprint/);
  assert.match(buyer, /pinned AI-agent public sample only/i);
  assert.match(buyer, /does not duplicate its inventory or commercial status/i);
  assert.match(buyer, /intentionally contains no receipt/i);
  assert.doesNotMatch(buyer, /six active services/);
  assert.doesNotMatch(buyer, /not yet admitted/);
  assert.doesNotMatch(buyer, /Proof-Backed Security Workflow/);
  assert.doesNotMatch(buyer, /\bCodex\b/);
});

test("public verification docs preserve current indeterminate semantics", () => {
  const corpus = readAllMdx();
  const receiptSpec = fs.readFileSync(
    path.join(docsRoot, "evidence/receipt-spec.mdx"),
    "utf-8",
  );
  const verification = fs.readFileSync(
    path.join(docsRoot, "how-it-works/verification.mdx"),
    "utf-8",
  );

  assert.doesNotMatch(
    corpus,
    /limited-pass`?\s*(?:→|maps? to)\s*(?:public\s+)?`?valid`?/i,
  );
  assert.match(verification, /limited-pass[^\n]+public `indeterminate`/i);
  assert.match(verification, /not independently (?:checked|completed)/i);
  assert.match(verification, /production_signing\.v1/);
  assert.match(verification, /public_exposure_review\.production\.v1/);
  assert.match(verification, /OFFSEC-EXTERNAL-EXPOSURE/);
  assert.match(verification, /external-exposure-assessment/);
  assert.match(verification, /verification_method_definition|method definition/i);
  assert.match(verification, /public_exposure_review_receipt_signing/);
  assert.match(verification, /production` trust scope/);
  assert.match(verification, /no production signing keys are allowlisted/i);

  assert.match(receiptSpec, /witnessops\.receipt\.v0/);
  assert.match(receiptSpec, /witnessops\.verification_context\.v1/);
  assert.match(receiptSpec, /public_exposure_review/);
  assert.match(receiptSpec, /offsec_<24 lowercase hex>/);
  assert.doesNotMatch(receiptSpec, /Receipt v2 is the canonical/i);
});
