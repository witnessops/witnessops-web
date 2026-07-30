export const sampleSourceRepository = "witnessops/witnessops-sample-cases";
export const sampleSourceRepositoryUrl = `https://github.com/${sampleSourceRepository}`;
export const sampleSourcePath = "sample-cases/sbom-cisa-2026-minimum-elements";
export const sampleCommit = "8552357268a310c3aeea0ca60e744aa2bf8c52ba";
export const sampleCommitShort = sampleCommit.slice(0, 12);

export const sampleTreeUrl = `${sampleSourceRepositoryUrl}/tree/${sampleCommit}/${sampleSourcePath}`;
export const sampleManifestPath = `${sampleSourcePath}/MANIFEST.sha256`;
export const sampleManifestBlobUrl = `${sampleSourceRepositoryUrl}/blob/${sampleCommit}/${sampleManifestPath}`;
export const sampleBuyerWalkthroughUrl = `${sampleSourceRepositoryUrl}/blob/${sampleCommit}/${sampleSourcePath}/BUYER_WALKTHROUGH.md`;

export const sampleId = "SBOM_CISA_2026_MIN_ELEMENTS_SAMPLE_V1";

export const cisaResourceUrl =
  "https://www.cisa.gov/resources-tools/resources/2026-minimum-elements-software-bill-materials-sbom";
export const cisaNewsUrl =
  "https://www.cisa.gov/news-events/news/cisa-and-partners-unveil-updated-software-bill-materials-resource-improves-transparency-security-and";

export const packageFiles = [
  "README.md",
  "BUYER_WALKTHROUGH.md",
  "AUTHORITY_MAP.json",
  "ACTION_BOUNDARY.json",
  "artifacts/synthetic_sbom.cdx.json",
  "artifacts/generation_context.json",
  "artifacts/min_elements_checklist.json",
  "EVIDENCE_MANIFEST.json",
  "RECEIPT.json",
  "VERIFY_RESULT.json",
  "CHALLENGE_PATH.md",
  "SAMPLE_DELIVERABLE_PLAN.md",
  "MANIFEST.sha256",
] as const;

export const intentionalGaps = [
  {
    component: "gap-demo-lib@0.9.0",
    issue: "Component license missing",
  },
  {
    component: "license-only-lib@2.0.1",
    issue: "Component hash missing",
  },
] as const;

export const presentHighlights = [
  "SBOM author",
  "Timestamp",
  "SBOM tool name",
  "SBOM generation context",
  "Component name, version, and producer",
  "Dependency relationships",
] as const;
