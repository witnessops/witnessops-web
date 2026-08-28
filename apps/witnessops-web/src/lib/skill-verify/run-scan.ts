import { scanSkill } from "aegis-deterministic";
import { reportMarkdown } from "aegis-deterministic/report";
import {
  AEGIS_VERIFIER_ID,
  SKILL_CONTRACT_PATH,
  SKILL_MAX_BYTES,
  SKILL_MAX_EVIDENCE_BYTES,
  SKILL_MAX_FINDINGS,
  SKILL_MAX_REPORT_BYTES,
  SKILL_PASS_LIMITATION,
  SKILL_PASS_SUMMARY,
} from "./contract";
import { encodeSkillUtf8Strict, normalizeSkillSourceName } from "./input";
import { DEFAULT_SKILL_POLICY_ID, isSkillPolicyId } from "./policies";

export {
  AEGIS_VERIFIER_ID,
  SKILL_CONTRACT_PATH,
  SKILL_MAX_BYTES,
  SKILL_MAX_EVIDENCE_BYTES,
  SKILL_MAX_FINDINGS,
  SKILL_MAX_REPORT_BYTES,
  SKILL_PASS_LIMITATION,
  SKILL_PASS_SUMMARY,
};
export {
  decodeSkillUtf8,
  encodeSkillUtf8Strict,
  normalizeSkillSourceName,
} from "./input";

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
    | "OUTPUT_LIMIT_EXCEEDED"
    | "SCAN_TIMEOUT"
    | "WORKER_FAILED"
    | "VERIFIER_EXCEPTION"
    | "REPORT_FAILED";
  message: string;
};

export type SkillScanOutcome = SkillScanSuccess | SkillScanFailure;
export type SkillScanInput = {
  content: string;
  policyId?: string;
  sourceName?: string;
};

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
  verdict: SkillScanResult["verdict"],
): string {
  const sections = [
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
  ];
  if (verdict === "pass") {
    sections.push(
      "",
      "## WitnessOps pass limitation",
      "",
      SKILL_PASS_LIMITATION,
    );
  }
  return sections.join("\n");
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function evidenceByteLength(
  finding: SkillScanResult["findings"][number],
): number {
  return finding.evidence ? utf8ByteLength(JSON.stringify(finding.evidence)) : 0;
}

function labelEngineCodeUnits(report: string): string {
  return report.replace(
    /^- Stats: files=(\d+) lines=(\d+) bytes=(\d+) hidden=(\d+)$/m,
    "- Engine stats: files=$1 lines=$2 UTF-16-code-units=$3 hidden=$4",
  );
}

export async function runSkillScan(input: SkillScanInput): Promise<SkillScanOutcome> {
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

  let contentBytes: Uint8Array;
  try {
    contentBytes = encodeSkillUtf8Strict(content);
  } catch {
    return {
      ok: false,
      code: "UNSUPPORTED_FILE",
      message: "Only well-formed UTF-8 Markdown or plain-text SKILL.md files are accepted.",
    };
  }
  if (contentBytes.byteLength > SKILL_MAX_BYTES) {
    return {
      ok: false,
      code: "OVERSIZED",
      message: `This file is larger than ${SKILL_MAX_BYTES} bytes. Trim the skill and try again.`,
    };
  }
  const inputSha256 = await sha256Hex(contentBytes);

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

  if (
    result.findings.length > SKILL_MAX_FINDINGS ||
    result.findings.some(
      (finding) => evidenceByteLength(finding) > SKILL_MAX_EVIDENCE_BYTES,
    )
  ) {
    return {
      ok: false,
      code: "OUTPUT_LIMIT_EXCEEDED",
      message:
        "The verifier produced more finding evidence than can be safely presented. Split or simplify the skill and try again.",
    };
  }

  let report: string;
  try {
    report = bindReport(
      labelEngineCodeUnits(reportMarkdown(result)),
      {
        sourceName,
        inputSha256,
        inputBytes: contentBytes.byteLength,
        policyId,
      },
      result.verdict,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Report generation failed.";
    return { ok: false, code: "REPORT_FAILED", message };
  }

  if (utf8ByteLength(report) > SKILL_MAX_REPORT_BYTES) {
    return {
      ok: false,
      code: "OUTPUT_LIMIT_EXCEEDED",
      message:
        "The verifier report is larger than the published output boundary. Split or simplify the skill and try again.",
    };
  }

  return {
    ok: true,
    result,
    report,
    inputSha256,
    inputBytes: contentBytes.byteLength,
  };
}
