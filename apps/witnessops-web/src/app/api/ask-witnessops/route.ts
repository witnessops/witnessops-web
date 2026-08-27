import { NextResponse } from "next/server";
import { normalizeAskRequest } from "@/lib/server/ask-witnessops/ask-request-normalizer";
import { classifyQuestion } from "@/lib/server/ask-witnessops/authority-classifier";
import { executePolicy } from "@/lib/server/ask-witnessops/authority-policy-executor";
import { assembleAnswer } from "@/lib/server/ask-witnessops/authority-answer-assembler";
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

function invalidRequest(message: string) {
  return NextResponse.json(
    {
      ok: false,
      failureClass: "FAILURE_INPUT_MALFORMED",
      message,
    },
    { status: 400 },
  );
}

function bodyTooLargeRequest() {
  return NextResponse.json(
    {
      ok: false,
      failureClass: "FAILURE_INPUT_MALFORMED",
      message: `request body must not exceed ${ASK_REQUEST_BODY_LIMIT_BYTES} bytes.`,
    },
    { status: 413 },
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
        { status: 400 },
      );
    }

    const classification = classifyQuestion(normalized.request.question);
    const decision = executePolicy({ classification });
    const assembled = assembleAnswer({ policyDecision: decision });

    // Public Ask is answer-only. It does not place unauthenticated questions
    // into durable receipt custody or advertise a receipt identifier.
    return NextResponse.json(assembled);
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
