import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const expectedSampleCommit = "99741c8d50cd3adbfdc28bc317ac563a1e8dd1ef";
const expectedManifestAnchor =
  "ed4614932f1b96fa9cc082fb481239ac8655bd49596d846db4da5bf5eb6dca14  RECEIPT.json";

const expectedArtifacts = [
  "ACTION_BOUNDARY.json",
  "AUTHORITY_MAP.json",
  "EVIDENCE_MANIFEST.json",
  "RECEIPT.json",
  "VERIFY_RESULT.json",
  "CHALLENGE_PATH.md",
  "MANIFEST.sha256",
] as const;

test("AI sample page keeps pinned artifact links and manifest anchor in sync", () => {
  const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(
    source,
    new RegExp(`const sampleCommit = \"${expectedSampleCommit}\"`),
    "Sample page must pin GitHub artifact links to the expected immutable sample commit.",
  );
  assert.match(
    source,
    new RegExp(expectedManifestAnchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    "Sample page must display the expected RECEIPT.json manifest anchor.",
  );
  assert.match(source, /sampleCommitShort = sampleCommit\.slice\(0, 12\)/);
  assert.match(source, /sampleBaseUrl =\s*`https:\/\/github\.com\/witnessops\/witnessops-sample-cases\/tree\/\$\{sampleCommit\}\/sample-cases\/ai-agent-action-proof-run`/);
  assert.match(source, /sampleBlobBaseUrl =\s*`https:\/\/github\.com\/witnessops\/witnessops-sample-cases\/blob\/\$\{sampleCommit\}\/sample-cases\/ai-agent-action-proof-run`/);

  for (const artifact of expectedArtifacts) {
    assert.match(
      source,
      new RegExp(`artifact: \"${artifact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&\")}\"|name: \"${artifact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&\")}\"`),
      `${artifact} should remain listed in the sample inspection or artifact set.`,
    );
  }

  assert.doesNotMatch(
    source,
    /witnessops-sample-cases\/(tree|blob)\/main\/sample-cases\/ai-agent-action-proof-run/,
    "Sample page must not link to mutable main for artifact inspection.",
  );
});
