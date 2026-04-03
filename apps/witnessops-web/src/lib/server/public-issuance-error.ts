import { NextResponse } from "next/server";

const PUBLIC_ISSUANCE_ERROR = "Unable to issue verification token.";

export function publicIssuanceErrorResponse(
  route: string,
  error: unknown,
): NextResponse {
  console.error(`[${route}] public issuance failed:`, error);
  return NextResponse.json(
    { ok: false, error: PUBLIC_ISSUANCE_ERROR },
    { status: 500 },
  );
}

export { PUBLIC_ISSUANCE_ERROR };
