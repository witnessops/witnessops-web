import verifierContract from "../../../public/samples/governed-agent-verifier-conformance/v1/CONTRACT.json";

export type SkillPolicyId = "standard" | "enterprise" | "restricted" | "research";

export const GOVERNED_AGENT_VERIFIER_CONTRACT = verifierContract;
export const SKILL_MAX_BYTES = verifierContract.input.maxBytes;
export const SKILL_MAX_FINDINGS = verifierContract.outputBounds.maxFindings;
export const SKILL_MAX_EVIDENCE_BYTES =
  verifierContract.outputBounds.maxEvidenceBytesPerFinding;
export const SKILL_MAX_REPORT_BYTES = verifierContract.outputBounds.maxReportBytes;
export const SKILL_MAX_WORKER_DURATION_MS =
  verifierContract.processing.maxWorkerDurationMs;
export const SKILL_CONTRACT_PATH = verifierContract.input.canonicalPath;
export const AEGIS_VERIFIER_ID = verifierContract.engine.id;
export const DEFAULT_SKILL_POLICY_ID =
  verifierContract.policy.defaultId as SkillPolicyId;
export const SKILL_POLICY_PACKS = verifierContract.policy
  .packs as readonly {
    id: SkillPolicyId;
    name: string;
    tagline: string;
    failAt: string;
    reviewAt: string;
  }[];
export const SKILL_PASS_SUMMARY = verifierContract.claims.passSummary;
export const SKILL_PASS_LIMITATION = verifierContract.claims.passLimitation;
