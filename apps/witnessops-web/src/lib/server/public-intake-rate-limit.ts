import { NextResponse } from "next/server";
import {
  checkRateLimit,
  getClientIp,
  scheduleRateLimitCleanup,
  VERIFY_RATE_LIMIT_CONFIG,
} from "@witnessops/config/rate-limit";

const PUBLIC_INTAKE_RATE_LIMIT_NAMESPACE = "public-intake";
type PublicIntakeRateLimitConfig = Parameters<typeof checkRateLimit>[2];

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
  config: PublicIntakeRateLimitConfig = VERIFY_RATE_LIMIT_CONFIG,
): NextResponse | null {
  const clientIp = getClientIp(request);
  const result = checkRateLimit(
    PUBLIC_INTAKE_RATE_LIMIT_NAMESPACE,
    `${routeNamespace}:${clientIp}`,
    config,
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
