import { NextResponse } from "next/server";
import { normalizeAskRequest } from "@/lib/server/ask-witnessops/ask-request-normalizer";
import { classifyQuestion } from "@/lib/server/ask-witnessops/authority-classifier";
import { executePolicy } from "@/lib/server/ask-witnessops/authority-policy-executor";
import { assembleAnswer } from "@/lib/server/ask-witnessops/authority-answer-assembler";
import {
  classifyCommercialFit,
  type AskCommercialFitAssessment,
} from "@/lib/server/ask-witnessops/commercial-fit-classifier";
import { answerText as docsAssistantAnswerText } from "@/components/docs-assistant/docs-assistant-response";
import {
  buildDocsAssistantRefusalAnswer,
  evaluateDocsAssistantRefusalPolicy,
} from "@/lib/docs-assistant/refusal-policy";
import { readAskWitnessOpsOpenAiRuntimeConfig } from "@/lib/docs-assistant/runtime-config";
import {
  isDocsAssistantRuntimeUnavailable,
  runDocsAssistantServerRuntime,
} from "@/lib/docs-assistant/server-runtime";
import type { DocsAssistantAnswer } from "@/lib/docs-assistant/answer-contract";
import { enforcePublicIntakeRateLimit } from "@/lib/server/public-intake-rate-limit";
import {
  findDuplicateJsonObjectKey,
  JsonAmbiguityScanLimitError,
} from "@/lib/json-ambiguity";
import {
  InvalidRequestBodyEncodingError,
  readBoundedRequestText,
  RequestBodyTooLargeError,
} from "@/lib/server/bounded-request-body";

export const runtime = "nodejs";

const ASK_REQUEST_BODY_LIMIT_BYTES = 8 * 1024; // generous for questions + small context
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

type AskWitnessOpsAnswerMode =
  | "ai_assisted"
  | "deterministic_fallback"
  | "policy_refusal";

function invalidRequest(message: string) {
  return NextResponse.json(
    {
      ok: false,
      failureClass: "FAILURE_INPUT_MALFORMED",
      message,
    },
    { status: 400, headers: NO_STORE_HEADERS },
  );
}

function bodyTooLargeRequest() {
  return NextResponse.json(
    {
      ok: false,
      failureClass: "FAILURE_INPUT_MALFORMED",
      message: `request body must not exceed ${ASK_REQUEST_BODY_LIMIT_BYTES} bytes.`,
    },
    { status: 413, headers: NO_STORE_HEADERS },
  );
}

export async function POST(request: Request) {
  const rateLimitedResponse = enforcePublicIntakeRateLimit(request, "ask-witnessops");
  if (rateLimitedResponse) return rateLimitedResponse;

  try {
    const rawBody = await readBoundedRequestText(
      request,
      ASK_REQUEST_BODY_LIMIT_BYTES,
    );

    if (findDuplicateJsonObjectKey(rawBody) !== null) {
      return invalidRequest("request body contains duplicate JSON object keys.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return invalidRequest("request body must be valid JSON.");
    }

    const normalized = normalizeAskRequest(parsed);
    if (!normalized.ok) {
      return NextResponse.json(
        {
          ok: false,
          failureClass: normalized.failureClass,
          message: normalized.message,
        },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const authorityClassification = classifyQuestion(normalized.request.question);
    const commercialFit = classifyCommercialFit({
      question: normalized.request.question,
      authorityQuestionClassId: authorityClassification.question_class_id,
    });

    // Commercial fit is an additive, versioned sales signal. It never mutates
    // the approved V1 question classification or its receipt provenance.
    const decision = executePolicy({ classification: authorityClassification });
    const deterministicAnswer = assembleAnswer({ policyDecision: decision });

    // Commercial-fit matching has deliberately broader secret, unauthorized,
    // certification, and active-incident boundaries than the immutable V1
    // phrase classifier. If one fires, wrap the actual V1 decision in a public
    // input refusal and stop before the provider path. The wrapper must not
    // substitute a classification from a different, canned question.
    if (
      commercialFit.result === "blocked" ||
      commercialFit.result === "not_fit"
    ) {
      return NextResponse.json(
        withCommercialFit(
          withPublicBoundaryResponse({
            deterministicAnswer,
            docsAnswer: buildCommercialInputBoundaryAnswer(commercialFit),
            templateId: "boundary.public_input.v1",
            failureReason: "PUBLIC_INPUT_BOUNDARY",
          }),
          commercialFit,
        ),
        { headers: NO_STORE_HEADERS },
      );
    }

    if (deterministicAnswer.status === "closed") {
      return NextResponse.json(
        withCommercialFit(
          withAnswerMode(deterministicAnswer, "policy_refusal"),
          commercialFit,
        ),
        { headers: NO_STORE_HEADERS },
      );
    }

    const refusalDecision = evaluateDocsAssistantRefusalPolicy(
      normalized.request.question,
    );
    if (refusalDecision.blocked) {
      return NextResponse.json(
        withCommercialFit(
          withPublicBoundaryResponse({
            deterministicAnswer,
            docsAnswer: buildDocsAssistantRefusalAnswer({
              question: normalized.request.question,
              decision: refusalDecision,
            }),
          }),
          suppressCommercialOffer(commercialFit),
        ),
        { headers: NO_STORE_HEADERS },
      );
    }

    const config = readAskWitnessOpsOpenAiRuntimeConfig();
    if (!config.enabled) {
      return NextResponse.json(
        withCommercialFit(
          withAnswerMode(deterministicAnswer, "deterministic_fallback"),
          commercialFit,
        ),
        { headers: NO_STORE_HEADERS },
      );
    }

    const docsAnswer = await runDocsAssistantServerRuntime({
      payload: { question: normalized.request.question },
      config,
    });

    if (
      isDocsAssistantRuntimeUnavailable(docsAnswer) ||
      !isDocsAssistantSupported(docsAnswer)
    ) {
      return NextResponse.json(
        withCommercialFit(
          withAnswerMode(deterministicAnswer, "deterministic_fallback"),
          commercialFit,
        ),
        { headers: NO_STORE_HEADERS },
      );
    }

    // Public Ask is answer-only. It does not place unauthenticated questions
    // into durable receipt custody or advertise a receipt identifier. The
    // model may confirm retrieved support, but buyer-visible claims, routes,
    // and source labels remain deterministic and policy-owned.
    return NextResponse.json(
      withCommercialFit(
        withAnswerMode(deterministicAnswer, "ai_assisted"),
        commercialFit,
      ),
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return bodyTooLargeRequest();
    }
    if (error instanceof InvalidRequestBodyEncodingError) {
      return invalidRequest("request body must be valid UTF-8.");
    }
    if (error instanceof JsonAmbiguityScanLimitError) {
      return invalidRequest("request body exceeds supported JSON parser limits.");
    }
    return invalidRequest("request body must be valid JSON.");
  }
}

function withAnswerMode<T extends object>(
  answer: T,
  answerMode: AskWitnessOpsAnswerMode,
) {
  return { ...answer, answer_mode: answerMode };
}

function withCommercialFit<T extends object>(
  answer: T,
  commercialFit: AskCommercialFitAssessment,
) {
  return { ...answer, commercial_fit: commercialFit };
}

function suppressCommercialOffer(
  commercialFit: AskCommercialFitAssessment,
): AskCommercialFitAssessment {
  return {
    ...commercialFit,
    result: "not_fit",
    intent: "other",
    offer_id: null,
    offer: null,
    matching_specimen_id: null,
  };
}

function isDocsAssistantSupported(answer: DocsAssistantAnswer) {
  return (
    answer.answer_status === "supported_by_docs" ||
    answer.answer_status === "partially_supported"
  );
}

function buildCommercialInputBoundaryAnswer(
  commercialFit: AskCommercialFitAssessment,
): DocsAssistantAnswer {
  const blocked = commercialFit.result === "blocked";
  return {
    schema_version: "docs-assistant.answer.v1",
    answer_status: "cannot_claim",
    question: "[public input withheld]",
    documented_facts: [],
    inference: [],
    citations: [],
    unsupported_reason: blocked
      ? "sensitive_or_unauthorized_input_not_allowed"
      : "commercial_fit_boundary",
    human_review_required: true,
    not_proven: [
      "general_answer_correctness",
      "security_posture",
      "source_system_truth",
    ],
    boundary_findings: [
      blocked
        ? "public_input_blocked_before_provider"
        : "request_not_suitable_for_paid_review",
    ],
  };
}

function withPublicBoundaryResponse(args: {
  deterministicAnswer: ReturnType<typeof assembleAnswer>;
  docsAnswer: DocsAssistantAnswer;
  templateId?: string;
  failureReason?: string;
}) {
  return {
    schema: "witnessops.ask.public-boundary-response.v1" as const,
    answer_mode: "policy_refusal" satisfies AskWitnessOpsAnswerMode,
    // The immutable V1 assembly remains byte-for-byte coherent and nested.
    // The independent public boundary owns the replacement presentation below,
    // so no V1 template/hash/route provenance is rewritten in place.
    authority_answer: args.deterministicAnswer,
    template: {
      template_id: args.templateId ?? "refuse.public_material_boundary.v1",
      body: docsAssistantAnswerText(args.docsAnswer),
      source_display: "Public WitnessOps material",
    },
    route: null,
    presented_sources: [],
    status: "closed",
    failure_reason: args.failureReason ?? "PUBLIC_MATERIAL_BOUNDARY",
  };
}
