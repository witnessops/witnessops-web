import { NextResponse } from "next/server";

import { buildDocsAssistantDisabledResponse } from "@/lib/docs-assistant/disabled-response";
import { buildDocsAssistantRefusalAnswer, evaluateDocsAssistantRefusalPolicy } from "@/lib/docs-assistant/refusal-policy";
import { readDocsAssistantRuntimeConfig } from "@/lib/docs-assistant/runtime-config";
import {
  runDocsAssistantServerRuntime,
  validateDocsAssistantAskPayload,
} from "@/lib/docs-assistant/server-runtime";
import { enforcePublicIntakeRateLimit } from "@/lib/server/public-intake-rate-limit";
import { PUBLIC_JSON_BODY_LIMIT_BYTES, readBoundedRequestJson, RequestBodyTooLargeError } from "@/lib/server/bounded-request-body";

export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

function disabledResponse() {
  return NextResponse.json(buildDocsAssistantDisabledResponse(), {
    status: 503,
    headers: NO_STORE_HEADERS,
  });
}

function invalidRequestResponse(error: string) {
  return NextResponse.json(
    { ok: false, error },
    {
      status: 400,
      headers: NO_STORE_HEADERS,
    },
  );
}

export async function POST(request: Request) {
  const config = readDocsAssistantRuntimeConfig();
  if (!config.enabled) {
    return disabledResponse();
  }

  const rateLimitResponse = enforcePublicIntakeRateLimit(
    request,
    "docs-assistant",
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let rawPayload: unknown;
  try {
    rawPayload = await readBoundedRequestJson(request, PUBLIC_JSON_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { ok: false, error: "request_body_too_large" },
        { status: 413, headers: NO_STORE_HEADERS },
      );
    }
    return invalidRequestResponse("request_body_must_be_valid_json");
  }

  const validatedPayload = validateDocsAssistantAskPayload(rawPayload);
  if (!validatedPayload.ok || !validatedPayload.payload) {
    return invalidRequestResponse(validatedPayload.error ?? "invalid_request");
  }

  const refusalDecision = evaluateDocsAssistantRefusalPolicy(
    validatedPayload.payload.question,
  );
  if (refusalDecision.blocked) {
    return NextResponse.json(
      buildDocsAssistantRefusalAnswer({
        question: validatedPayload.payload.question,
        decision: refusalDecision,
      }),
      { headers: NO_STORE_HEADERS },
    );
  }

  const answer = await runDocsAssistantServerRuntime({
    payload: validatedPayload.payload,
    config,
  });

  return NextResponse.json(answer, { headers: NO_STORE_HEADERS });
}
