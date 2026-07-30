import type {
  ProofStage,
  VerificationVerdict_,
} from "@witnessops/proof/receipt";

export type VerifyFailureClass =
  | "FAILURE_INPUT_MALFORMED"
  | "FAILURE_INPUT_UNSUPPORTED";

export type VerifyVerdict = "valid" | "invalid" | "indeterminate";

export type VerifyCheckStatus = "verified" | "unverified" | "not_applicable";

export interface VerifyCheckView {
  name: string;
  status: VerifyCheckStatus;
  detail?: string;
  code?: VerificationVerdict_["breaches"][number]["code"];
}

export interface VerifyBreachView {
  code: VerificationVerdict_["breaches"][number]["code"];
  detail: string;
  checkName: string;
}

export type VerifyInputKind =
  | "receipt"
  | "local-server-audit-receipt"
  /** @deprecated Dual-read responses use local-server-audit-receipt */
  | "offsec-shield-receipt"
  | "offsec-swarm-mesh-export";

export interface VerifySuccessResponse {
  ok: true;
  inputKind: VerifyInputKind;
  /** Structural adapters (not PV/QV/WV). */
  adapter?:
    | "witnessops.verify.local_server_audit_receipt.v1"
    /** @deprecated Alias retained for type compatibility; responses emit primary id */
    | "witnessops.verify.offsec_shield_receipt.v1"
    | "witnessops.verify.offsec_swarm_mesh_export.v1";
  verdict: VerifyVerdict;
  scope: VerificationVerdict_["verification_mode"];
  artifactRevalidation: VerificationVerdict_["artifact_revalidation"];
  proofStageClaimed: ProofStage | "unknown";
  proofStageVerified: ProofStage | "unknown";
  summary: string;
  checks: VerifyCheckView[];
  breaches: VerifyBreachView[];
}

export interface VerifyFailureResponse {
  ok: false;
  failureClass: VerifyFailureClass;
  message: string;
}

export type VerifyResponse = VerifySuccessResponse | VerifyFailureResponse;

export interface VerifyFixtureDefinition {
  id: string;
  label: string;
  description: string;
  receiptInput: string;
  provenance: "proof" | "app";
  expected:
    | { kind: "verification"; verdict: Exclude<VerifyVerdict, "indeterminate"> }
    | { kind: "failure"; failureClass: VerifyFailureClass };
}
