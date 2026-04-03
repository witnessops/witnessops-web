import { NextResponse } from "next/server";

interface IntakePayload {
  name: string;
  email: string;
  company?: string;
  message: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<IntakePayload>;

    if (!body.name || !body.email || !body.message) {
      return NextResponse.json(
        { ok: false, error: "name, email, and message are required" },
        { status: 400 },
      );
    }

    // Stub: persist intake submission
    console.log("[intake]", body.email, body.name);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body" },
      { status: 400 },
    );
  }
}
