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

export const runtime = "nodejs";

const ASK_REQUEST_BODY_LIMIT_BYTES = 8 * 1024; // generous for questions + small context

type BoundedBodyReadResult =
  | { ok: true; rawBody: string }
  | { ok: false; reason: "too_large" };

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

async function readBoundedRequestText(
  request: Request,
): Promise<BoundedBodyReadResult> {
  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > ASK_REQUEST_BODY_LIMIT_BYTES
  ) {
    return { ok: false, reason: "too_large" };
  }

  if (!request.body) return { ok: true, rawBody: "" };

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let rawBody = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    bytesRead += value.byteLength;
    if (bytesRead > ASK_REQUEST_BODY_LIMIT_BYTES) {
      await reader.cancel().catch(() => undefined);
      return { ok: false, reason: "too_large" };
    }

    rawBody += decoder.decode(value, { stream: true });
  }

  rawBody += decoder.decode();
  return { ok: true, rawBody };
}

export async function POST(request: Request) {
  const rateLimitedResponse = enforcePublicIntakeRateLimit(request, "ask-witnessops");
  if (rateLimitedResponse) return rateLimitedResponse;

  try {
    const body = await readBoundedRequestText(request);
    if (!body.ok) return bodyTooLargeRequest();

    const rawBody = body.rawBody;

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
    if (error instanceof JsonAmbiguityScanLimitError) {
      return invalidRequest("request body exceeds supported JSON parser limits.");
    }
    return invalidRequest("request body must be valid JSON.");
  }
}
