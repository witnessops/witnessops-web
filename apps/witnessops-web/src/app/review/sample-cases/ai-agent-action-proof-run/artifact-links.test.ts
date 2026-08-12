import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  buyerWalkthroughHref,
  sampleArtifactDigest,
  sampleArtifactHref,
  sampleArtifactNames,
  sampleBaseUrl,
  sampleBlobBaseUrl,
  sampleCommit,
  sampleCommitShort,
  sampleDisplayedArtifactNames,
  sampleDisplayedButNotManifestHashedArtifactNames,
  sampleManifestAnchor,
  sampleManifestBlobSha,
  sampleManifestEntries,
  sampleManifestHashedArtifactNames,
  sampleManifestHashedButNotDisplayedArtifactNames,
  sampleManifestHref,
  sampleManifestPath,
  sampleManifestSha256,
  sampleManifestText,
  sampleSourcePath,
  sampleSourceRepository,
  sampleSourceRepositoryUrl,
} from "./sample-artifact-contract";

const expectedSourceRepository = "witnessops/witnessops-sample-cases";
const expectedSourcePath = "sample-cases/ai-agent-action-proof-run";
const expectedSampleCommit = "99741c8d50cd3adbfdc28bc317ac563a1e8dd1ef";
const expectedManifestPath = `${expectedSourcePath}/MANIFEST.sha256`;
const expectedManifestBlobSha = "efa7181d7575e95cb63673442cfe48671a3bb8a8";
const expectedManifestSha256 = "6c43e87534a4e445321c46d9765efa885d3df5aa8eb8110a214653b0f46d7447";
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

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

test("AI sample artifact contract preserves pinned source provenance", () => {
  assert.equal(sampleSourceRepository, expectedSourceRepository);
  assert.equal(sampleSourceRepositoryUrl, `https://github.com/${expectedSourceRepository}`);
  assert.equal(sampleSourcePath, expectedSourcePath);
  assert.equal(sampleCommit, expectedSampleCommit);
  assert.equal(sampleCommitShort, expectedSampleCommit.slice(0, 12));
  assert.equal(sampleManifestPath, expectedManifestPath);
  assert.equal(sampleManifestBlobSha, expectedManifestBlobSha);
  assert.equal(sampleManifestSha256, expectedManifestSha256);
  assert.equal(sha256(sampleManifestText), sampleManifestSha256);
  assert.equal(
    sampleManifestHref,
    `https://github.com/${expectedSourceRepository}/blob/${expectedSampleCommit}/${expectedManifestPath}`,
  );
});

test("AI sample artifact contract preserves pinned manifest identity", () => {
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
    `https://github.com/${expectedSourceRepository}/tree/${expectedSampleCommit}/${expectedSourcePath}`,
  );
  assert.equal(
    sampleBlobBaseUrl,
    `https://github.com/${expectedSourceRepository}/blob/${expectedSampleCommit}/${expectedSourcePath}`,
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

test("AI sample artifact contract resolves displayed artifact digests", () => {
  for (const entry of sampleManifestEntries) {
    if (sampleDisplayedArtifactNames.includes(entry.file as never)) {
      assert.equal(sampleArtifactDigest(entry.file as never), entry.sha256);
    }
  }

  assert.equal(sampleArtifactDigest("MANIFEST.sha256"), sampleManifestSha256);
});

test("AI sample artifact contract names displayed and manifest-hashed sets explicitly", () => {
  assert.deepEqual(sampleDisplayedArtifactNames, sampleArtifactNames);
  assert.deepEqual(
    sampleManifestHashedArtifactNames,
    sampleManifestEntries.map((entry) => entry.file),
  );
  assert.deepEqual(sampleDisplayedButNotManifestHashedArtifactNames, [
    "MANIFEST.sha256",
  ]);
  assert.deepEqual(sampleManifestHashedButNotDisplayedArtifactNames, ["README.md"]);

  const displayed = new Set<string>(sampleDisplayedArtifactNames);
  const hashed = new Set<string>(sampleManifestHashedArtifactNames);

  for (const artifact of sampleDisplayedArtifactNames) {
    if (!sampleDisplayedButNotManifestHashedArtifactNames.includes(artifact as never)) {
      assert.ok(hashed.has(artifact), `${artifact} should be manifest-hashed.`);
    }
  }

  for (const artifact of sampleManifestHashedArtifactNames) {
    if (!sampleManifestHashedButNotDisplayedArtifactNames.includes(artifact as never)) {
      assert.ok(displayed.has(artifact), `${artifact} should be displayed.`);
    }
  }
});

test("AI sample page renders manifest provenance from the artifact contract", () => {
  const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(source, /Manifest provenance/);
  assert.match(source, /sampleSourceRepository/);
  assert.match(source, /sampleManifestPath/);
  assert.match(source, /sampleManifestBlobSha/);
  assert.match(source, /sampleManifestSha256/);
  assert.match(source, /href={sampleManifestHref}/);
  assert.match(source, /Open pinned manifest/);
});

test("AI sample page renders manifest coverage from the artifact contract", () => {
  const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(source, /Manifest coverage/);
  assert.match(source, /sampleDisplayedArtifactNames/);
  assert.match(source, /sampleManifestHashedArtifactNames/);
  assert.match(source, /sampleDisplayedButNotManifestHashedArtifactNames/);
  assert.match(source, /sampleManifestHashedButNotDisplayedArtifactNames/);
  assert.match(source, /MANIFEST\.sha256 is displayed as the digest-list artifact/);
  assert.match(source, /README\.md is hashed in the/);
});

test("AI sample page renders artifact digests from the contract", () => {
  const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(source, /sampleArtifactDigest\(name\)/);
  assert.match(source, /sampleArtifactDigest\(step\.artifact\)/);
  assert.match(source, /SHA-256:/);
  assert.doesNotMatch(source, /SHA-256:\s*[a-f0-9]{64}/);
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

test("AI sample page keeps the boundary while removing the repeated banner actions", () => {
  const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(source, /<SampleCaseBanner/);
  assert.match(source, /showActions={false}/);
  assert.match(source, /label="Start a review"/);
  assert.match(source, /label="Open sample package"/);
});

test("AI sample page provides stable section navigation", () => {
  const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(source, /aria-label="On this page"/);
  for (const section of [
    "sample-lineage",
    "manifest-provenance",
    "buyer-walkthrough",
    "artifact-set",
    "proof-boundary",
  ]) {
    assert.match(source, new RegExp(`href: "#${section}"`));
    assert.match(source, new RegExp(`id="${section}"`));
  }
});

test("AI sample provenance cards allow long values to reflow", () => {
  const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
  const reflowCards = source.match(
    /className="min-w-0 rounded-xl border border-surface-border bg-surface-bg p-4"/g,
  );

  assert.equal(reflowCards?.length, 3);
});
