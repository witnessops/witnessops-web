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

export const runtime = "nodejs";
const VERIFY_REQUEST_BODY_LIMIT_BYTES = 256 * 1024;

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
      message: `request body must not exceed ${VERIFY_REQUEST_BODY_LIMIT_BYTES} bytes.`,
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
    contentLength > VERIFY_REQUEST_BODY_LIMIT_BYTES
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
    if (bytesRead > VERIFY_REQUEST_BODY_LIMIT_BYTES) {
      await reader.cancel().catch(() => undefined);
      return { ok: false, reason: "too_large" };
    }

    rawBody += decoder.decode(value, { stream: true });
  }

  rawBody += decoder.decode();
  return { ok: true, rawBody };
}

export async function POST(request: Request) {
  const rateLimitedResponse = enforcePublicIntakeRateLimit(request, "verify");
  if (rateLimitedResponse) return rateLimitedResponse;

  try {
    const body = await readBoundedRequestText(request);
    if (!body.ok) return bodyTooLargeRequest();

    const rawBody = body.rawBody;
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
    if (error instanceof JsonAmbiguityScanLimitError) {
      return invalidRequest("request body exceeds supported JSON parser limits.");
    }
    return invalidRequest("request body must be valid JSON.");
  }
}
