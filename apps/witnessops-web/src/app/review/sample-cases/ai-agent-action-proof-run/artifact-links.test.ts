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
  sampleManifestEntries,
  sampleManifestText,
} from "./sample-artifact-contract";

const expectedSampleCommit = "99741c8d50cd3adbfdc28bc317ac563a1e8dd1ef";
const expectedManifestAnchor =
  "ed4614932f1b96fa9cc082fb481239ac8655bd49596d846db4da5bf5eb6dca14  RECEIPT.json";

const expectedManifestText = [
  "ede15bd741240b1dbbfa654cfefb458664af4082ce4cedc79caa3f98d2550a07  ACTION_BOUNDARY.json",
  "ae8e868544dbd4aee86a9480c4651c477b754a433d8f7bef924401bc749ddb62  AUTHORITY_MAP.json",
  "5dde8aeb13a51302ccb6880c2444f242b7a9c44c55fd81e1fd7dffcdb9ce7b3d  CHALLENGE_PATH.md",
  "5bd0eae8e0ded738cd841fea082c1515a56a023dfa90c5d49dc3454e7897e99a  EVIDENCE_MANIFEST.json",
  "fc8558070d2b097db52098521e72a8c726a6340e3b1c3ed1a30298ead33ed8e8  README.md",
  "ed4614932f1b96fa9cc082fb481239ac8655bd49596d846db4da5bf5eb6dca14  RECEIPT.json",
  "d719577e1cf3ebd083df7a9017eeacb6ef260662513726e4da01cf83c25e4c4d  VERIFY_RESULT.json",
  "",
].join("\n");

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
  assert.equal(sampleManifestText, expectedManifestText);
  assert.equal(
    sampleManifestAnchor,
    `${sampleManifestEntries.find((entry) => entry.file === "RECEIPT.json")?.sha256}  RECEIPT.json`,
  );
  assert.deepEqual(
    sampleManifestEntries.map((entry) => `${entry.sha256}  ${entry.file}`).join("\n") + "\n",
    sampleManifestText,
  );
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
