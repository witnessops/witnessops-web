export type PublicProofBundleStatus = "published";

export interface PublicProofBundle {
  status: PublicProofBundleStatus;
  runId: string;
  target: string;
  workflow: string;
  artifactPath: string;
  manifestSha256: string;
  verifierResult: "valid";
}

export const publicProofBundles: PublicProofBundle[] = [
  {
    status: "published",
    runId: "external-exposure-20260427T140210Z",
    target: "witnessops.com",
    workflow: "external-exposure-proof-run-v1",
    artifactPath:
      "/bundles/external-exposure-proof-bundle-external-exposure-20260427T140210Z.zip",
    manifestSha256:
      "a96cd612c98e6a9875c8f1930a7a2e38d6ac32b6c34fdf04f09461ba9d4b9f4c",
    verifierResult: "valid",
  },
];
