export const sampleCommit = "99741c8d50cd3adbfdc28bc317ac563a1e8dd1ef";
export const sampleCommitShort = sampleCommit.slice(0, 12);

export const sampleManifestAnchor =
  "ed4614932f1b96fa9cc082fb481239ac8655bd49596d846db4da5bf5eb6dca14  RECEIPT.json";

export const sampleBaseUrl =
  `https://github.com/witnessops/witnessops-sample-cases/tree/${sampleCommit}/sample-cases/ai-agent-action-proof-run`;

export const sampleBlobBaseUrl =
  `https://github.com/witnessops/witnessops-sample-cases/blob/${sampleCommit}/sample-cases/ai-agent-action-proof-run`;

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
