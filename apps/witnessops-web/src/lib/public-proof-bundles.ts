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
    title: "External Exposure Proof Bundle — First Run",
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
  {
    id: "api-authorization-first-run-v1",
    title: "API Authorization Proof Bundle — First Run",
    status: "published",
    runId: "api-authorization-20260427T161038Z",
    target: "witnessops.com",
    workflow: "api-authorization-proof-run-v1",
    artifactPath:
      "/bundles/api-authorization-proof-bundle-api-authorization-20260427T161038Z.zip",
    manifestSha256:
      "1e567ef2b5cd10f5edbe3b46309ebfdae49d53fd33583b915a9f704fccf3620a",
    verifierResult: "valid",
  },
];
