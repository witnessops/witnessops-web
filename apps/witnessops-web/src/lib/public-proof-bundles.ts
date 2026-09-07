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
      "1f98b08d0e2c28b7b92c7fcf41b8b612955bf09c428008f88f587977079cf478",
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
      "4c17cc84b7b0766cc29dc30e765fd263b4b20c31e1bf905bcef8daea3ae23e96",
    verifierResult: "valid",
  },
];
