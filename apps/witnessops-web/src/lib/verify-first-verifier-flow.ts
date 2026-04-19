export type SharedVerifierFlowStepId =
  | "inspect-operation-claim"
  | "inspect-raw-receipt"
  | "verify-signature-and-timestamp"
  | "verify-manifest-bundle-completeness"
  | "inspect-chain-continuity"
  | "review-remaining-trust-assumptions";

export type SharedVerifierFlowStepName =
  | "inspect operation claim"
  | "inspect raw receipt"
  | "verify signature and timestamp"
  | "verify manifest/bundle completeness"
  | "inspect chain continuity"
  | "review remaining trust assumptions";

export interface SharedVerifierFlowStep {
  id: SharedVerifierFlowStepId;
  name: SharedVerifierFlowStepName;
  detail: string;
}

export const SHARED_VERIFIER_FLOW_STEPS = [
  {
    id: "inspect-operation-claim",
    name: "inspect operation claim",
    detail:
      "Read the claimed operation fields (actor, target, scope, action, and policy identifiers) and confirm they match the event under review.",
  },
  {
    id: "inspect-raw-receipt",
    name: "inspect raw receipt",
    detail:
      "Inspect the unmodified receipt payload, including proof stage, schema version, and signed body bytes before any normalization.",
  },
  {
    id: "verify-signature-and-timestamp",
    name: "verify signature and timestamp",
    detail:
      "Verify receipt signature material and validate timestamp token binding, issuer chain, and accepted time window.",
  },
  {
    id: "verify-manifest-bundle-completeness",
    name: "verify manifest/bundle completeness",
    detail:
      "Check that every manifest or bundle entry referenced by the receipt is present, hash-matching, and not silently omitted.",
  },
  {
    id: "inspect-chain-continuity",
    name: "inspect chain continuity",
    detail:
      "Follow predecessor links across receipts to confirm continuity, expected ordering, and absence of chain breaks.",
  },
  {
    id: "review-remaining-trust-assumptions",
    name: "review remaining trust assumptions",
    detail:
      "List unresolved assumptions (key custody, timestamp authority trust, host/tool integrity, identity binding) before relying on the result.",
  },
] as const satisfies readonly SharedVerifierFlowStep[];

export type SharedVerifierFlowCopyKey =
  | "whatThisProves"
  | "whatThisDoesNotProve"
  | "trustAssumptions";

export interface SharedVerifierFlowCopyBlock {
  heading: string;
  points: readonly string[];
}

export const SHARED_VERIFIER_FLOW_COPY_BLOCKS = {
  whatThisProves: {
    heading: "What this proves",
    points: [
      "The receipt can be inspected as claimed input, including raw fields used by the verifier.",
      "Signature, timestamp, manifest/bundle completeness, and continuity checks passed under the configured verification policy.",
    ],
  },
  whatThisDoesNotProve: {
    heading: "What this does not prove",
    points: [
      "It does not prove the operation was correct, safe, or authorized beyond evidence represented in the receipt and referenced artifacts.",
      "It does not prove external organizations, identity providers, or infrastructure are trustworthy.",
    ],
  },
  trustAssumptions: {
    heading: "Remaining trust assumptions",
    points: [
      "Signing key custody, rotation, and revocation handling remain trusted.",
      "Timestamp authority operation and certificate trust remain trusted.",
      "Verifier implementation, hash/signature primitives, and runtime integrity remain trusted.",
      "Identity-to-subject mapping and policy configuration remain trusted.",
    ],
  },
} as const satisfies Record<SharedVerifierFlowCopyKey, SharedVerifierFlowCopyBlock>;

export const SHARED_VERIFIER_FLOW_COPY_ORDER = [
  "whatThisProves",
  "whatThisDoesNotProve",
  "trustAssumptions",
] as const satisfies readonly SharedVerifierFlowCopyKey[];
