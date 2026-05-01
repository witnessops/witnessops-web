import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  buyerWalkthroughHref,
  sampleArtifactHref,
  sampleArtifactNames,
  sampleBaseUrl,
  sampleBlobBaseUrl,
  sampleCommit,
  sampleCommitShort,
  sampleManifestAnchor,
} from "./sample-artifact-contract";

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

test("AI sample artifact contract preserves pinned sample identity", () => {
  assert.equal(sampleCommit, expectedSampleCommit);
  assert.equal(sampleCommitShort, expectedSampleCommit.slice(0, 12));
  assert.equal(sampleManifestAnchor, expectedManifestAnchor);
  assert.equal(
    sampleBaseUrl,
    `https://github.com/witnessops/witnessops-sample-cases/tree/${expectedSampleCommit}/sample-cases/ai-agent-action-proof-run`,
  );
  assert.equal(
    sampleBlobBaseUrl,
    `https://github.com/witnessops/witnessops-sample-cases/blob/${expectedSampleCommit}/sample-cases/ai-agent-action-proof-run`,
  );
  assert.equal(
    buyerWalkthroughHref,
    `${sampleBlobBaseUrl}/BUYER_WALKTHROUGH.md`,
  );
  assert.deepEqual(sampleArtifactNames, expectedArtifacts);

  for (const artifact of sampleArtifactNames) {
    assert.equal(sampleArtifactHref(artifact), `${sampleBlobBaseUrl}/${artifact}`);
  }
});

test("AI sample page renders from the artifact contract", () => {
  const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(source, /from "\.\/sample-artifact-contract"/);
  assert.doesNotMatch(source, /const sampleCommit =/);
  assert.doesNotMatch(source, /const sampleBlobBaseUrl =/);
  assert.match(source, /sampleArtifactHref\(step\.artifact\)/);
  assert.match(source, /sampleArtifactHref\(artifact\.name\)/);

  assert.doesNotMatch(
    source,
    /witnessops-sample-cases\/(tree|blob)\/main\/sample-cases\/ai-agent-action-proof-run/,
    "Sample page must not link to mutable main for artifact inspection.",
  );
});
