import { scanSkill } from "aegis-deterministic";
import { reportMarkdown } from "aegis-deterministic/report";
import { DEFAULT_SKILL_POLICY_ID, isSkillPolicyId } from "./policies";

/** Bounded SKILL.md size. 128 KiB scanned in well under a second on the package engine. */
export const SKILL_MAX_BYTES = 128 * 1024;

/** Hygiene in Aegis keys off this path. Always scan paste/upload as SKILL.md. */
export const SKILL_CONTRACT_PATH = "SKILL.md";

export const AEGIS_VERIFIER_ID = "aegis-deterministic@2.0.0-cleanroom.3";

export const SKILL_PASS_LIMITATION =
  "Aegis checks a SKILL.md against explicit deterministic policy rules. A pass means no governed pattern was detected under the selected policy; it does not prove the skill is safe.";

export const SKILL_PASS_SUMMARY =
  "No policy-blocking operational pattern was detected under the selected policy.";

export type SkillScanResult = ReturnType<typeof scanSkill>;

export type SkillScanSuccess = {
  ok: true;
  result: SkillScanResult;
  report: string;
};

export type SkillScanFailure = {
  ok: false;
  code:
    | "EMPTY_INPUT"
    | "OVERSIZED"
    | "UNSUPPORTED_FILE"
    | "VERIFIER_EXCEPTION"
    | "REPORT_FAILED";
  message: string;
};

export type SkillScanOutcome = SkillScanSuccess | SkillScanFailure;

export function runSkillScan(input: {
  content: string;
  policyId?: string;
  sourceName?: string;
}): SkillScanOutcome {
  const content = input.content;
  if (typeof content !== "string") {
    return {
      ok: false,
      code: "EMPTY_INPUT",
      message: "Paste a SKILL.md or choose a local Markdown file first.",
    };
  }
  if (
    content.length > SKILL_MAX_BYTES ||
    new TextEncoder().encode(content).byteLength > SKILL_MAX_BYTES
  ) {
    return {
      ok: false,
      code: "OVERSIZED",
      message: `This file is larger than ${SKILL_MAX_BYTES} bytes. Trim the skill and try again.`,
    };
  }
  if (content.trim().length === 0) {
    return {
      ok: false,
      code: "EMPTY_INPUT",
      message: "Paste a SKILL.md or choose a local Markdown file first.",
    };
  }
  if (content.includes("\u0000")) {
    return {
      ok: false,
      code: "UNSUPPORTED_FILE",
      message: "Only local Markdown or plain-text SKILL.md files are accepted.",
    };
  }

  const policyId = isSkillPolicyId(input.policyId ?? "")
    ? input.policyId!
    : DEFAULT_SKILL_POLICY_ID;
  const sourceName = input.sourceName?.trim() || SKILL_CONTRACT_PATH;

  let result: SkillScanResult;
  try {
    result = scanSkill(
      [{ path: SKILL_CONTRACT_PATH, content }],
      policyId,
      sourceName,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verifier failed.";
    return { ok: false, code: "VERIFIER_EXCEPTION", message };
  }

  let report: string;
  try {
    report = reportMarkdown(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Report generation failed.";
    return { ok: false, code: "REPORT_FAILED", message };
  }

  return { ok: true, result, report };
}
