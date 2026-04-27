export interface PublicProofBundle {
  id: string;
  title: string;
  workflow: string;
  status: "pending_publication" | "published";
  artifactPath: string | null;
  manifestSha256: string | null;
  verifierMode: string;
  claimBoundary: string;
}

export const publicProofBundles: PublicProofBundle[] = [
  {
    id: "external-exposure-first-run-v1",
    title: "External Exposure Proof Bundle — First Run",
    workflow: "external-exposure-proof-run-v1",
    status: "pending_publication",
    artifactPath: null,
    manifestSha256: null,
    verifierMode: "offline bundle verifier",
    claimBoundary:
      "Pending until a real signed ZIP bundle, MANIFEST.sha256, and valid verification result are published.",
  },
];
