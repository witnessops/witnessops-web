export type PublicProofBundleStatus = "published";

export interface PublicProofBundle {
  id: string;
  title: string;
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
    id: "external-exposure-first-run-v1",
    title: "External Exposure Proof Bundle: First Run",
    status: "published",
    runId: "external-exposure-20260427T140210Z",
    target: "witnessops.com",
    workflow: "external-exposure-proof-run-v1",
    artifactPath:
      "/bundles/external-exposure-proof-bundle-external-exposure-20260427T140210Z.zip",
    manifestSha256:
      "d9702c5f3b8479d94949e025d15715094535a437535f7c6f8d5a26c2623d0453",
    verifierResult: "valid",
  },
  {
    id: "api-authorization-first-run-v1",
    title: "API Authorization Proof Bundle: First Run",
    status: "published",
    runId: "api-authorization-20260427T161038Z",
    target: "witnessops.com",
    workflow: "api-authorization-proof-run-v1",
    artifactPath:
      "/bundles/api-authorization-proof-bundle-api-authorization-20260427T161038Z.zip",
    manifestSha256:
      "67916b84a85862e274698f2036f9b8e6421fffaf71a39bd5e087ead7b3e954db",
    verifierResult: "valid",
  },
];
