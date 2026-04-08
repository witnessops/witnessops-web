import { NextResponse } from "next/server";
import {
  checkRateLimit,
  getClientIp,
  scheduleRateLimitCleanup,
  VERIFY_RATE_LIMIT_CONFIG,
} from "@witnessops/config/rate-limit";

const PUBLIC_INTAKE_RATE_LIMIT_NAMESPACE = "public-intake";

scheduleRateLimitCleanup(VERIFY_RATE_LIMIT_CONFIG.windowMs);

export function buildPublicIntakeRateLimitKey(
  routeNamespace: string,
  request: Request,
): string {
  return `${routeNamespace}:${getClientIp(request)}`;
}

export function enforcePublicIntakeRateLimit(
  request: Request,
  routeNamespace: string,
): NextResponse | null {
  const clientIp = getClientIp(request);
  if (clientIp === "unknown") {
    return null;
  }

  const result = checkRateLimit(
    PUBLIC_INTAKE_RATE_LIMIT_NAMESPACE,
    `${routeNamespace}:${clientIp}`,
    VERIFY_RATE_LIMIT_CONFIG,
  );

  if (result.allowed) {
    return null;
  }

  return NextResponse.json(
    {
      ok: false,
      error: "Rate limit exceeded",
      code: "RATE_LIMITED",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    },
  );
}
