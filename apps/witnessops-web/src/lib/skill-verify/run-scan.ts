import { scanSkill } from "aegis-deterministic";
import { reportMarkdown } from "aegis-deterministic/report";
import { DEFAULT_SKILL_POLICY_ID, isSkillPolicyId } from "./policies";

/**
 * Bounded SKILL.md size. The pinned scanner remains synchronous, so keep the
 * accepted input below the measured multi-second main-thread range.
 */
export const SKILL_MAX_BYTES = 16 * 1024;

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
  inputSha256: string;
  inputBytes: number;
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

export function decodeSkillUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
}

export function normalizeSkillSourceName(value?: string): string {
  const basename = (value ?? SKILL_CONTRACT_PATH)
    .replaceAll("\\", "/")
    .split("/")
    .at(-1) ?? SKILL_CONTRACT_PATH;
  const normalized = basename
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[^A-Za-z0-9._ -]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return normalized || SKILL_CONTRACT_PATH;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function bindReport(
  report: string,
  identity: {
    sourceName: string;
    inputSha256: string;
    inputBytes: number;
    policyId: string;
  },
): string {
  return [
    "<!-- witnessops-skill-report-binding:v1 -->",
    "## WitnessOps input binding",
    "",
    `- Source: \`${identity.sourceName}\``,
    `- Input SHA-256: \`${identity.inputSha256}\``,
    `- Input bytes: \`${identity.inputBytes}\``,
    `- Verifier: \`${AEGIS_VERIFIER_ID}\``,
    `- Policy: \`${identity.policyId}\``,
    "",
    report,
  ].join("\n");
}

export async function runSkillScan(input: {
  content: string;
  policyId?: string;
  sourceName?: string;
}): Promise<SkillScanOutcome> {
  const content = input.content;
  if (typeof content !== "string") {
    return {
      ok: false,
      code: "EMPTY_INPUT",
      message: "Paste a SKILL.md or choose a local Markdown file first.",
    };
  }
  if (content.length > SKILL_MAX_BYTES) {
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

  const contentBytes = new TextEncoder().encode(content);
  if (contentBytes.byteLength > SKILL_MAX_BYTES) {
    return {
      ok: false,
      code: "OVERSIZED",
      message: `This file is larger than ${SKILL_MAX_BYTES} bytes. Trim the skill and try again.`,
    };
  }

  const policyId = isSkillPolicyId(input.policyId ?? "")
    ? input.policyId!
    : DEFAULT_SKILL_POLICY_ID;
  const sourceName = normalizeSkillSourceName(input.sourceName);

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

  const inputSha256 = await sha256Hex(contentBytes);
  return {
    ok: true,
    result,
    report: bindReport(report, {
      sourceName,
      inputSha256,
      inputBytes: contentBytes.byteLength,
      policyId,
    }),
    inputSha256,
    inputBytes: contentBytes.byteLength,
  };
}
