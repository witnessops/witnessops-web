import { NextResponse } from "next/server";
import {
  getVerifyFailureStatusCode,
  verifyReceiptPayload,
} from "@/lib/verify-adapter";

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
    const response = verifyReceiptPayload(await request.json());
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
