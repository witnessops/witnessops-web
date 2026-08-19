import { NextResponse } from "next/server";
import { logUnexpectedRouteError } from "./route-error-boundary";
import { PublicIssuanceAdmissionError } from "./public-issuance-admission";

const PUBLIC_ISSUANCE_ERROR = "Unable to issue verification token.";
const PUBLIC_ISSUANCE_UNAVAILABLE = "Verification requests are temporarily unavailable.";

export function publicIssuanceErrorResponse(
  route: string,
  error: unknown,
): NextResponse {
  if (error instanceof PublicIssuanceAdmissionError) {
    return NextResponse.json(
      { ok: false, error: PUBLIC_ISSUANCE_UNAVAILABLE },
      { status: 503 },
    );
  }

  logUnexpectedRouteError(`[${route}] public issuance failed`, error);
  return NextResponse.json(
    { ok: false, error: PUBLIC_ISSUANCE_ERROR },
    { status: 500 },
  );
}

export { PUBLIC_ISSUANCE_ERROR, PUBLIC_ISSUANCE_UNAVAILABLE };
