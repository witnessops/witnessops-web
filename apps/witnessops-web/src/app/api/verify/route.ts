import { NextResponse } from "next/server";
import {
  getVerifyFailureStatusCode,
  verifyReceiptPayload,
} from "@/lib/verify-adapter";
import {
  findDuplicateJsonObjectKey,
  JsonAmbiguityScanLimitError,
} from "@/lib/json-ambiguity";
import { enforcePublicIntakeRateLimit } from "@/lib/server/public-intake-rate-limit";
import {
  InvalidRequestBodyEncodingError,
  readBoundedRequestText,
  RequestBodyTooLargeError,
} from "@/lib/server/bounded-request-body";

export const runtime = "nodejs";
const VERIFY_REQUEST_BODY_LIMIT_BYTES = 256 * 1024;

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
      message: `request body must not exceed ${VERIFY_REQUEST_BODY_LIMIT_BYTES} bytes.`,
    },
    { status: 413 },
  );
}

export async function POST(request: Request) {
  const rateLimitedResponse = enforcePublicIntakeRateLimit(request, "verify");
  if (rateLimitedResponse) return rateLimitedResponse;

  try {
    const rawBody = await readBoundedRequestText(
      request,
      VERIFY_REQUEST_BODY_LIMIT_BYTES,
    );
    if (findDuplicateJsonObjectKey(rawBody) !== null) {
      return invalidRequest("request body contains duplicate JSON object keys.");
    }

    const response = verifyReceiptPayload(JSON.parse(rawBody) as unknown);
    if (!response.ok) {
      return NextResponse.json(response, {
        status: getVerifyFailureStatusCode(response.failureClass),
      });
    }

    return NextResponse.json(response);
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
