import { NextResponse } from "next/server";
import { normalizeAskRequest } from "@/lib/server/ask-witnessops/ask-request-normalizer";
import { classifyQuestion } from "@/lib/server/ask-witnessops/authority-classifier";
import { executePolicy } from "@/lib/server/ask-witnessops/authority-policy-executor";
import { assembleAnswer } from "@/lib/server/ask-witnessops/authority-answer-assembler";
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

    const classification = classifyQuestion(normalized.request.question);
    const decision = executePolicy({ classification });
    const deterministicAnswer = assembleAnswer({ policyDecision: decision });

    if (deterministicAnswer.status === "closed") {
      return NextResponse.json(
        withAnswerMode(deterministicAnswer, "policy_refusal"),
        { headers: NO_STORE_HEADERS },
      );
    }

    const refusalDecision = evaluateDocsAssistantRefusalPolicy(
      normalized.request.question,
    );
    if (refusalDecision.blocked) {
      return NextResponse.json(
        withDocsAssistantRefusal({
          deterministicAnswer,
          docsAnswer: buildDocsAssistantRefusalAnswer({
            question: normalized.request.question,
            decision: refusalDecision,
          }),
        }),
        { headers: NO_STORE_HEADERS },
      );
    }

    const config = readAskWitnessOpsOpenAiRuntimeConfig();
    if (!config.enabled) {
      return NextResponse.json(
        withAnswerMode(deterministicAnswer, "deterministic_fallback"),
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
        withAnswerMode(deterministicAnswer, "deterministic_fallback"),
        { headers: NO_STORE_HEADERS },
      );
    }

    // Public Ask is answer-only. It does not place unauthenticated questions
    // into durable receipt custody or advertise a receipt identifier. The
    // model may confirm retrieved support, but buyer-visible claims, routes,
    // and source labels remain deterministic and policy-owned.
    return NextResponse.json(
      withAnswerMode(deterministicAnswer, "ai_assisted"),
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

function isDocsAssistantSupported(answer: DocsAssistantAnswer) {
  return (
    answer.answer_status === "supported_by_docs" ||
    answer.answer_status === "partially_supported"
  );
}

function withDocsAssistantRefusal(args: {
  deterministicAnswer: ReturnType<typeof assembleAnswer>;
  docsAnswer: DocsAssistantAnswer;
}) {
  return {
    ...args.deterministicAnswer,
    answer_mode: "policy_refusal" satisfies AskWitnessOpsAnswerMode,
    template: {
      template_id: "refuse.public_material_boundary.v1",
      body: docsAssistantAnswerText(args.docsAnswer),
      source_display: "Public WitnessOps material",
    },
    route: null,
    presented_sources: [],
    status: "closed",
    failure_reason: "PUBLIC_MATERIAL_BOUNDARY",
  };
}
