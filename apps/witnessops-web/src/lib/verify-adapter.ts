import { z } from "zod";
import {
  verifyReceiptVerdict,
  type ProofStage,
  type VerificationCheck,
} from "@public-surfaces/proof/receipt";
import type {
  VerifyBreachView,
  VerifyCheckStatus,
  VerifyCheckView,
  VerifyFailureClass,
  VerifyFailureResponse,
  VerifyResponse,
  VerifySuccessResponse,
  VerifyVerdict,
} from "@/lib/verify-contract";

const verifyRequestSchema = z.object({
  receipt: z.union([z.string().min(1), z.record(z.unknown())]),
});

const SUPPORTED_SCHEMA_VERSIONS: Record<ProofStage, string[]> = {
  PV: ["1.0.0", "1.1.0"],
  QV: ["2.0.0"],
  WV: ["2.1.0"],
};

const UNSUPPORTED_BUNDLE_KEYS = [
  "artifacts",
  "bundle_id",
  "bundleId",
  "files",
  "proofs",
  "receipts",
] as const;

function malformed(message: string): VerifyFailureResponse {
  return {
    ok: false,
    failureClass: "FAILURE_INPUT_MALFORMED",
    message,
  };
}

function unsupported(message: string): VerifyFailureResponse {
  return {
    ok: false,
    failureClass: "FAILURE_INPUT_UNSUPPORTED",
    message,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVerifyFailureResponse(
  value: unknown,
): value is VerifyFailureResponse {
  return (
    isRecord(value) &&
    value.ok === false &&
    typeof value.failureClass === "string" &&
    typeof value.message === "string"
  );
}

function isSupportedProofStage(value: string): value is ProofStage {
  return value === "PV" || value === "QV" || value === "WV";
}

function parseReceiptInput(
  receipt: string | Record<string, unknown>,
): Record<string, unknown> | VerifyFailureResponse {
  if (typeof receipt !== "string") {
    return receipt;
  }

  try {
    const parsed = JSON.parse(receipt) as unknown;
    if (!isRecord(parsed)) {
      return malformed("Receipt payload must decode to a JSON object.");
    }
    return parsed;
  } catch {
    return malformed("Receipt payload is not valid JSON.");
  }
}

function looksLikeUnsupportedBundle(receipt: Record<string, unknown>): boolean {
  return UNSUPPORTED_BUNDLE_KEYS.some((key) => key in receipt);
}

function validateSupportedReceipt(
  receipt: Record<string, unknown>,
): VerifyFailureResponse | null {
  if (receipt.type === "R0") {
    return unsupported("tier1 R0 artifacts are not supported on /verify v1.");
  }

  if (!("proof_stage" in receipt)) {
    return looksLikeUnsupportedBundle(receipt)
      ? unsupported("proof bundles are not supported on /verify v1.")
      : malformed("receipt.proof_stage is required.");
  }

  if (typeof receipt.proof_stage !== "string") {
    return malformed("receipt.proof_stage must be a string.");
  }

  if (!isSupportedProofStage(receipt.proof_stage)) {
    return unsupported(
      `receipt proof stage \"${receipt.proof_stage}\" is not supported on /verify v1.`,
    );
  }

  if (!("schema_version" in receipt)) {
    return malformed("receipt.schema_version is required.");
  }

  if (typeof receipt.schema_version !== "string") {
    return malformed("receipt.schema_version must be a string.");
  }

  if (
    !SUPPORTED_SCHEMA_VERSIONS[receipt.proof_stage].includes(
      receipt.schema_version,
    )
  ) {
    return unsupported(
      `receipt schema version \"${receipt.schema_version}\" is not supported for stage ${receipt.proof_stage}.`,
    );
  }

  return null;
}

function toCheckStatus(status: VerificationCheck["status"]): VerifyCheckStatus {
  switch (status) {
    case "pass":
      return "verified";
    case "fail":
      return "unverified";
    case "skip":
      return "not_applicable";
  }
}

function toCheckView(check: VerificationCheck): VerifyCheckView {
  return {
    name: check.name,
    status: toCheckStatus(check.status),
    detail: check.detail,
    code: check.breach_code,
  };
}

function toBreachView(
  breach: VerifySuccessResponse["breaches"][number],
): VerifyBreachView {
  return breach;
}

function toVerdict(result: "pass" | "fail" | "limited-pass"): VerifyVerdict {
  switch (result) {
    case "fail":
      return "invalid";
    case "pass":
    case "limited-pass":
      return "valid";
  }
}

function buildSummary(response: {
  verdict: VerifyVerdict;
  proofStageClaimed: VerifySuccessResponse["proofStageClaimed"];
  scope: VerifySuccessResponse["scope"];
  artifactRevalidation: VerifySuccessResponse["artifactRevalidation"];
  breaches: VerifySuccessResponse["breaches"];
}): string {
  if (response.verdict === "valid") {
    return `${response.proofStageClaimed} receipt verified in ${response.scope} mode; artifact revalidation was ${response.artifactRevalidation.replaceAll("_", " ")}.`;
  }

  if (response.breaches.length > 0) {
    return response.breaches[0].detail;
  }

  return `${response.proofStageClaimed} receipt verification failed.`;
}

function normalizeVerdict(
  receipt: Record<string, unknown>,
): VerifySuccessResponse {
  const verdict = verifyReceiptVerdict(receipt, "receipt-only");
  const checks = Object.values(verdict.detail.checks).map(toCheckView);
  const breaches = verdict.breaches.map((breach) =>
    toBreachView({
      code: breach.code,
      detail: breach.detail,
      checkName: breach.check_name,
    }),
  );

  const response: VerifySuccessResponse = {
    ok: true,
    inputKind: "receipt",
    verdict: toVerdict(verdict.result),
    scope: verdict.verification_mode,
    artifactRevalidation: verdict.artifact_revalidation,
    proofStageClaimed: verdict.proof_stage_claimed,
    proofStageVerified: verdict.proof_stage_verified,
    summary: "",
    checks,
    breaches,
  };

  response.summary = buildSummary(response);
  return response;
}

export function verifyReceiptPayload(payload: unknown): VerifyResponse {
  const parsedRequest = verifyRequestSchema.safeParse(payload);
  if (!parsedRequest.success) {
    return malformed("request body must be JSON with a receipt field.");
  }

  const parsedReceipt = parseReceiptInput(parsedRequest.data.receipt);
  if (isVerifyFailureResponse(parsedReceipt)) {
    return parsedReceipt;
  }

  if (!isRecord(parsedReceipt)) {
    return malformed("Receipt payload must decode to a JSON object.");
  }

  const supportFailure = validateSupportedReceipt(parsedReceipt);
  if (supportFailure) {
    return supportFailure;
  }

  try {
    return normalizeVerdict(parsedReceipt);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "receipt verification failed to execute.";
    return malformed(message);
  }
}

export function getVerifyFailureStatusCode(
  failureClass: VerifyFailureClass,
): number {
  switch (failureClass) {
    case "FAILURE_INPUT_MALFORMED":
      return 400;
    case "FAILURE_INPUT_UNSUPPORTED":
      return 422;
  }
}
