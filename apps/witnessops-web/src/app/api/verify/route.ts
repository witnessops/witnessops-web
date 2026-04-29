import { NextResponse } from "next/server";
import {
  getVerifyFailureStatusCode,
  verifyReceiptPayload,
} from "@/lib/verify-adapter";
import { findDuplicateJsonObjectKey } from "@/lib/json-ambiguity";

export const runtime = "nodejs";

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

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
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
  } catch {
    return invalidRequest("request body must be valid JSON.");
  }
}
