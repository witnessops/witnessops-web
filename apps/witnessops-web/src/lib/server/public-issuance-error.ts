import { NextResponse } from "next/server";
import { logUnexpectedRouteError } from "./route-error-boundary";

const PUBLIC_ISSUANCE_ERROR = "Unable to issue verification token.";

export function publicIssuanceErrorResponse(
  route: string,
  error: unknown,
): NextResponse {
  logUnexpectedRouteError(`[${route}] public issuance failed`, error);
  return NextResponse.json(
    { ok: false, error: PUBLIC_ISSUANCE_ERROR },
    { status: 500 },
  );
}

export { PUBLIC_ISSUANCE_ERROR };
