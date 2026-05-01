export const sampleSourceRepository = "witnessops/witnessops-sample-cases";
export const sampleSourceRepositoryUrl = `https://github.com/${sampleSourceRepository}`;
export const sampleSourcePath = "sample-cases/ai-agent-action-proof-run";
export const sampleCommit = "99741c8d50cd3adbfdc28bc317ac563a1e8dd1ef";
export const sampleCommitShort = sampleCommit.slice(0, 12);
export const sampleManifestPath = `${sampleSourcePath}/MANIFEST.sha256`;
export const sampleManifestBlobSha = "efa7181d7575e95cb63673442cfe48671a3bb8a8";

export const sampleManifestEntries = [
  {
    file: "ACTION_BOUNDARY.json",
    sha256: "ede15bd741240b1dbbfa654cfefb458664af4082ce4cedc79caa3f98d2550a07",
  },
  {
    file: "AUTHORITY_MAP.json",
    sha256: "ae8e868544dbd4aee86a9480c4651c477b754a433d8f7bef924401bc749ddb62",
  },
  {
    file: "CHALLENGE_PATH.md",
    sha256: "5dde8aeb13a51302ccb6880c2444f242b7a9c44c55fd81e1fd7dffcdb9ce7b3d",
  },
  {
    file: "EVIDENCE_MANIFEST.json",
    sha256: "5bd0eae8e0ded738cd841fea082c1515a56a023dfa90c5d49dc3454e7897e99a",
  },
  {
    file: "README.md",
    sha256: "fc8558070d2b097db52098521e72a8c726a6340e3b1c3ed1a30298ead33ed8e8",
  },
  {
    file: "RECEIPT.json",
    sha256: "ed4614932f1b96fa9cc082fb481239ac8655bd49596d846db4da5bf5eb6dca14",
  },
  {
    file: "VERIFY_RESULT.json",
    sha256: "d719577e1cf3ebd083df7a9017eeacb6ef260662513726e4da01cf83c25e4c4d",
  },
] as const;

export type SampleHashedArtifactName = (typeof sampleManifestEntries)[number]["file"];

export const sampleManifestText = `${sampleManifestEntries
  .map((entry) => `${entry.sha256}  ${entry.file}`)
  .join("\n")}\n`;

export const sampleManifestAnchor =
  "ed4614932f1b96fa9cc082fb481239ac8655bd49596d846db4da5bf5eb6dca14  RECEIPT.json";

export const sampleBaseUrl = `${sampleSourceRepositoryUrl}/tree/${sampleCommit}/${sampleSourcePath}`;

export const sampleBlobBaseUrl = `${sampleSourceRepositoryUrl}/blob/${sampleCommit}/${sampleSourcePath}`;

export const sampleManifestHref = `${sampleSourceRepositoryUrl}/blob/${sampleCommit}/${sampleManifestPath}`;

export const buyerWalkthroughHref = `${sampleBlobBaseUrl}/BUYER_WALKTHROUGH.md`;

export const sampleArtifactNames = [
  "ACTION_BOUNDARY.json",
  "AUTHORITY_MAP.json",
  "EVIDENCE_MANIFEST.json",
  "RECEIPT.json",
  "VERIFY_RESULT.json",
  "CHALLENGE_PATH.md",
  "MANIFEST.sha256",
] as const;

export type SampleArtifactName = (typeof sampleArtifactNames)[number];

export function sampleArtifactHref(name: SampleArtifactName): string {
  return `${sampleBlobBaseUrl}/${name}`;
}
