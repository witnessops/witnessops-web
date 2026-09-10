import { NextResponse } from "next/server";
import { unsupportedClaimRepair } from "@/lib/docs-assistant/conversation-guidance";
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
import { catalogueClarification, runPublicAskRuntime } from "@/lib/server/ask-witnessops/public-answer-runtime";
import type { DocsAssistantAnswer } from "@/lib/docs-assistant/answer-contract";
import { enforcePublicIntakeRateLimit } from "@/lib/server/public-intake-rate-limit";
import { isAskTelemetryRequest, recordAskTelemetry } from "@/lib/server/ask-witnessops/ask-telemetry";
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

const ASK_REQUEST_BODY_LIMIT_BYTES = 32 * 1024; // bounded question + multilingual recent context
const ASK_TELEMETRY_BODY_LIMIT_BYTES = 2 * 1024;
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

function bodyTooLargeRequest(limit: number) {
  return NextResponse.json(
    {
      ok: false,
      failureClass: "FAILURE_INPUT_MALFORMED",
      message: `request body must not exceed ${limit} bytes.`,
    },
    { status: 413, headers: NO_STORE_HEADERS },
  );
}

export async function POST(request: Request) {
  const telemetryTransport = request.headers.get("X-WitnessOps-Event") === "1";
  const bodyLimit = telemetryTransport ? ASK_TELEMETRY_BODY_LIMIT_BYTES : ASK_REQUEST_BODY_LIMIT_BYTES;
  const rateLimitedResponse = telemetryTransport
    ? enforcePublicIntakeRateLimit(request, "ask-witnessops-telemetry", { limit: 60, windowMs: 60_000 })
    : enforcePublicIntakeRateLimit(request, "ask-witnessops");
  if (rateLimitedResponse) return rateLimitedResponse;

  try {
    const rawBody = await readBoundedRequestText(
      request,
      bodyLimit,
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

    const telemetryBody = isAskTelemetryRequest(parsed);
    if (telemetryTransport !== telemetryBody) {
      return invalidRequest("event transport and request body must match.");
    }
    if (telemetryBody) return recordAskTelemetry(parsed, request);

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

    // Browser-held history is not trusted, including messages labeled
    // "assistant". Screen all history for secrets/unauthorized input, and apply
    // the existing request boundaries to prior visitor questions as well.
    // A history boundary wraps the CURRENT question's unchanged assembly.
    for (const message of normalized.request.history ?? []) {
      const historyClassification = classifyQuestion(message.content);
      const historyFit = classifyCommercialFit({
        question: message.content,
        authorityQuestionClassId: message.role === "user" ? historyClassification.question_class_id : "",
      });
      if (historyFit.result === "blocked" || (message.role === "user" && historyFit.result === "not_fit")) {
        return NextResponse.json(withCommercialFit(withPublicBoundaryResponse({
          deterministicAnswer,
          docsAnswer: buildCommercialInputBoundaryAnswer(historyFit),
          templateId: "boundary.public_input.v1",
          failureReason: "PUBLIC_INPUT_BOUNDARY",
        }), historyFit), { headers: NO_STORE_HEADERS });
      }
      if (message.role === "user") {
        const historyDecision = evaluateDocsAssistantRefusalPolicy(message.content);
        const findings = historyDecision.boundary_findings.filter((finding) => finding !== "customer_specific_claim_not_allowed");
        const priorAnswer = assembleAnswer({ policyDecision: executePolicy({ classification: historyClassification }) });
        if (findings.length > 0 || (priorAnswer.status === "closed" && historyClassification.question_class_id !== "outside_approved_public_context")) {
          return NextResponse.json(withCommercialFit(withPublicBoundaryResponse({
            deterministicAnswer,
            docsAnswer: buildDocsAssistantRefusalAnswer({
              question: "[public input withheld]",
              decision: { ...historyDecision, blocked: true, reason: findings[0] ?? "public_input_boundary", boundary_findings: findings },
            }),
          }), suppressCommercialOffer(commercialFit)), { headers: NO_STORE_HEADERS });
        }
      }
    }

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
            question: commercialFit.result === "not_fit" ? normalized.request.question : undefined,
            docsAnswer: buildCommercialInputBoundaryAnswer(commercialFit),
            templateId: "boundary.public_input.v1",
            failureReason: "PUBLIC_INPUT_BOUNDARY",
          }),
          commercialFit,
        ),
        { headers: NO_STORE_HEADERS },
      );
    }

    // An unmatched V1 phrase is not a safety refusal. The independent public
    // answer may explain current public material without rewriting that V1
    // decline. Actual refusals and broken authority bindings still stop here.
    const unmatchedPublicQuestion =
      authorityClassification.question_class_id === "outside_approved_public_context" &&
      decision.authorized_action === "bounded_decline" &&
      deterministicAnswer.template.template_id === "decline.outside_public_context.v1" &&
      deterministicAnswer.failure_reason === "POLICY_REFUSAL_OR_DECLINE";
    if (deterministicAnswer.status === "closed" && !unmatchedPublicQuestion) {
      return NextResponse.json(
        withCommercialFit(
          withAnswerMode(deterministicAnswer, "policy_refusal"),
          commercialFit,
        ),
        { headers: NO_STORE_HEADERS },
      );
    }

    const docsRefusalDecision = evaluateDocsAssistantRefusalPolicy(
      normalized.request.question,
    );
    // "Our company" is ordinary fit-check context, not itself a request to
    // assert private facts. The staging probe's lexical rule is deliberately
    // omitted; all of its security/proof/claim restrictions remain in force.
    const boundaryFindings = docsRefusalDecision.boundary_findings.filter(
      (finding) => finding !== "customer_specific_claim_not_allowed",
    );
    const refusalDecision = {
      ...docsRefusalDecision,
      blocked: boundaryFindings.length > 0,
      reason: boundaryFindings[0] ?? null,
      boundary_findings: boundaryFindings,
    };
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

    const catalogueAnswer = catalogueClarification(normalized.request);
    const generatedAnswer = catalogueAnswer ?? await runPublicAskRuntime({
      ...normalized.request,
      config,
    });

    if (!generatedAnswer) {
      return NextResponse.json(
        withCommercialFit(
          withAnswerMode(deterministicAnswer, "deterministic_fallback"),
          commercialFit,
        ),
        { headers: NO_STORE_HEADERS },
      );
    }

    // Generated guidance has its own presentation envelope, not a V1 replay
    // identity or a verification receipt. Preserve the original assembly.
    return NextResponse.json(
      withCommercialFit(
        {
          schema: "witnessops.ask.generated-answer.v1",
          status: "success",
          answer_mode: catalogueAnswer ? "deterministic_fallback" : "ai_assisted",
          model: catalogueAnswer ? undefined : config.model,
          authority_answer: deterministicAnswer,
          template: {
            template_id: catalogueAnswer ? "answer.public_catalogue.v1" : "answer.public_ai.v1",
            body: generatedAnswer.text,
            source_display: null,
          },
          presented_sources: generatedAnswer.presented_sources,
          recommendation: generatedAnswer.recommendation,
          route: generatedAnswer.recommendation
            ? { route_id: "route.fit-check", href: generatedAnswer.recommendation.request_href }
            : deterministicAnswer.route,
        },
        commercialFit,
      ),
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return bodyTooLargeRequest(bodyLimit);
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
  return { ...answer, answer_mode: answerMode, ...(answerMode === "deterministic_fallback" ? { fallback_reason: "ai_unavailable" as const } : {}) };
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
  question?: string;
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
      body: (args.question ? unsupportedClaimRepair(args.question) : null) ?? (args.docsAnswer.unsupported_reason === "commercial_fit_boundary"
        ? "That request falls outside our review services. We can assess a defined action or system and explain findings and limitations, but cannot provide a security guarantee, certification or active incident response."
        : docsAssistantAnswerText(args.docsAnswer)),
      source_display: "Public WitnessOps material",
    },
    route: null,
    presented_sources: [],
    status: "closed",
    failure_reason: args.failureReason ?? "PUBLIC_MATERIAL_BOUNDARY",
  };
}
