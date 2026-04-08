import { NextResponse } from "next/server";

import {
  verifyTokenRequestSchema,
  type VerifyTokenResponse,
  verifyTokenResponseSchema,
} from "@/lib/token-contract";
import { verifyIssuedToken } from "@/lib/server/token-issuance";

export const runtime = "nodejs";

function invalidRequest(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function readPublicOrigin(request: Request): URL {
  const configuredOrigin =
    process.env.WITNESSOPS_VERIFY_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_OS_SITE_URL?.trim();

  return new URL(configuredOrigin || request.url);
}

async function handleVerification(
  payload: unknown,
): Promise<VerifyTokenResponse | NextResponse> {
  const parsed = verifyTokenRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return invalidRequest("issuanceId, email, and token are required.");
  }

  try {
    const verified = await verifyIssuedToken(parsed.data);
    return verifyTokenResponseSchema.parse(verified);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Token verification failed.";
    return invalidRequest(message, 400);
  }
}

export async function POST(request: Request) {
  try {
    const result = await handleVerification(await request.json());
    if (result instanceof NextResponse) return result;
    return NextResponse.json(result);
  } catch {
    return invalidRequest("Invalid request body.");
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const publicOrigin = readPublicOrigin(request);
  const payload = {
    issuanceId: searchParams.get("issuanceId") ?? "",
    email: searchParams.get("email") ?? "",
    token: searchParams.get("token") ?? "",
  };

  const result = await handleVerification(payload);
  if (result instanceof NextResponse) return result;

  if (result.channel === "support") {
    const supportUrl = new URL("/support", publicOrigin);
    supportUrl.searchParams.set("verified", "1");
    supportUrl.searchParams.set("intakeId", result.intakeId);
    if (result.threadId) {
      supportUrl.searchParams.set("threadId", result.threadId);
    }
    supportUrl.searchParams.set("email", result.email);
    return NextResponse.redirect(supportUrl, { status: 302 });
  }

  const assessmentUrl = new URL(
    `/assessment/${encodeURIComponent(result.issuanceId)}`,
    publicOrigin,
  );
  assessmentUrl.searchParams.set("email", result.email);
  return NextResponse.redirect(assessmentUrl, { status: 302 });
}
