export const sampleSourceRepository = "witnessops/witnessops-sample-cases";
export const sampleSourceRepositoryUrl = `https://github.com/${sampleSourceRepository}`;
export const sampleSourcePath = "sample-cases/ai-agent-action-proof-run";
export const sampleCommit = "d4ad234bd8152b1a01b9adc913f383d1838850b3";
export const sampleCommitShort = sampleCommit.slice(0, 12);
export const sampleManifestPath = `${sampleSourcePath}/MANIFEST.sha256`;
export const sampleManifestBlobSha = "bbc58adf2f19958bcd8fd7faefe5aea00c0f987d";
export const sampleManifestSha256 =
  "9d8668507f3da027886a1847a92b705671063ed89cbb354d45909c119bb414e7";
export const sampleBundleSha256 =
  "bb921133a6d06db471b0a8f5015fd6f7a734c2c1721de4e0007fa34397c11f9c";
export const sampleSignerFingerprint =
  "sha256:72a03b6fdacaad90dfc58c0e782ec51e111dfecbc1b841b6cb7a68d0a557f6e4";
export const publicVerifierSha256 =
  "7ac872446e384f40d82eaf63e7a0d5ca4604eb06a0fdb8e872a9240400377f41";

export const sampleManifestEntries = [
  {
    file: "ACTION_BOUNDARY.json",
    sha256: "a1eec35e467325bab1d7ff55f6f8ad0b13bfc1bf5f53f0ed42100fb54f3860a7",
  },
  {
    file: "AUTHORITY_MAP.json",
    sha256: "8ea8e4e377164182ca66c1e2e20d225d5595eb4a3648670f9066274e91765b1f",
  },
  {
    file: "BUNDLE.wops.json",
    sha256: sampleBundleSha256,
  },
  {
    file: "BUYER_WALKTHROUGH.md",
    sha256: "d328d2ebd94cf5e1e7d77513054c8b146859d601b5b246f3e39b5b9d6280df61",
  },
  {
    file: "CHALLENGE_PATH.md",
    sha256: "c4abd690bc225bce865d027d16c4458b6c143b44355ca937d968c60466d5ce26",
  },
  {
    file: "DEMO_KEY_REGISTRY.json",
    sha256: "3ed35d7c49ae4e832725bfdc0a63587cafc46d19eaec1c899eead6c79d741c2e",
  },
  {
    file: "DEMO_PUBLIC_KEY.pem",
    sha256: "b2d4416cc3933f43e5dd33f0b64e582928a54044443ea6f998de21e469db02dc",
  },
  {
    file: "EVIDENCE_MANIFEST.json",
    sha256: "6245305362e371e90c2fbc6dd15f4ccc5e834cc249f8b93cfe65e63ba69d65f3",
  },
  {
    file: "README.md",
    sha256: "41331d7e1c5e87fe633d339b5a6e3b3fb4a51331bbeead7ab46e613a86d74f4f",
  },
  {
    file: "RECEIPT.json",
    sha256: "e305f28d82d0dc617f80cf7b7e1cbbffa0e9827606f3e995af1888a59240a65a",
  },
  {
    file: "VERIFY_RESULT.json",
    sha256: "ca397828504fb0a147130fd78c64a2bd2f5c47c1f2c8b13580fd78108b5a8caf",
  },
  {
    file: "evidence/AFTER.json",
    sha256: "b04855340230cad2f4c5de94095591f823f1296d053f36fcaa4b6aac4a282266",
  },
  {
    file: "evidence/ALERT.json",
    sha256: "e0dfb0f2b879398887527d648e465fa61d8122b612ffdb9e23eceef350ad2320",
  },
  {
    file: "evidence/BEFORE.json",
    sha256: "8e53a926c9521bc11663cf793ef171e4cace7bca5c583a0e672c24668502c078",
  },
  {
    file: "evidence/CHECKS.json",
    sha256: "3065e243420256e5f1dd340115e7cfa30fc1565b095c127704b631c1a69e4a28",
  },
  {
    file: "evidence/EVENTS.ndjson",
    sha256: "6de1b0fd44c8f1f592a49930e59ca039dbcea4478c503109b606f0d080332a0f",
  },
] as const;

export type SampleHashedArtifactName = (typeof sampleManifestEntries)[number]["file"];

export const sampleManifestText = `${sampleManifestEntries
  .map((entry) => `${entry.sha256}  ${entry.file}`)
  .join("\n")}\n`;

export const sampleManifestAnchor =
  "e305f28d82d0dc617f80cf7b7e1cbbffa0e9827606f3e995af1888a59240a65a  RECEIPT.json";

export const sampleBaseUrl = `${sampleSourceRepositoryUrl}/tree/${sampleCommit}/${sampleSourcePath}`;
export const sampleBlobBaseUrl = `${sampleSourceRepositoryUrl}/blob/${sampleCommit}/${sampleSourcePath}`;
export const sampleManifestHref = `${sampleSourceRepositoryUrl}/blob/${sampleCommit}/${sampleManifestPath}`;
export const buyerWalkthroughHref = `${sampleBlobBaseUrl}/BUYER_WALKTHROUGH.md`;

export function sampleArtifactHref(name: SampleHashedArtifactName): string {
  return `${sampleBlobBaseUrl}/${name}`;
}
