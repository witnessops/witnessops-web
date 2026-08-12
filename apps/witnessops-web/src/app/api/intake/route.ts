import { NextResponse } from "next/server";
import { PUBLIC_JSON_BODY_LIMIT_BYTES, readBoundedRequestJson, RequestBodyTooLargeError } from "@/lib/server/bounded-request-body";

interface IntakePayload {
  name: string;
  email: string;
  company?: string;
  message: string;
}

export async function POST(request: Request) {
  try {
    const body = (await readBoundedRequestJson(
      request,
      PUBLIC_JSON_BODY_LIMIT_BYTES,
    )) as Partial<IntakePayload>;

    if (!body.name || !body.email || !body.message) {
      return NextResponse.json(
        { ok: false, error: "name, email, and message are required" },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { ok: false, error: "Request body is too large" },
        { status: 413 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "Invalid request body" },
      { status: 400 },
    );
  }
}
