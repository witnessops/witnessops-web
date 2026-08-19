import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
  checkRateLimit,
  getClientIp,
  scheduleRateLimitCleanup,
  VERIFY_RATE_LIMIT_CONFIG,
} from "@witnessops/config/rate-limit";

const PUBLIC_INTAKE_RATE_LIMIT_NAMESPACE = "public-intake";
const PUBLIC_ISSUANCE_GLOBAL_NAMESPACE = "public-issuance-global";
const PUBLIC_ISSUANCE_RECIPIENT_NAMESPACE = "public-issuance-recipient";
const PUBLIC_ISSUANCE_GLOBAL_CONFIG = {
  limit: 30,
  windowMs: 60_000,
} as const;
const PUBLIC_ISSUANCE_RECIPIENT_CONFIG = {
  limit: 3,
  windowMs: 15 * 60_000,
} as const;
type PublicIntakeRateLimitConfig = Parameters<typeof checkRateLimit>[2];

function rateLimitedResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { ok: false, error: "Rate limit exceeded", code: "RATE_LIMITED" },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    },
  );
}

const PUBLIC_INTAKE_OPERATION_BY_ROUTE: Readonly<Record<string, string>> = {
  contact: "review-request-issuance",
  engage: "review-request-issuance",
  "review-request": "review-request-issuance",
  support: "support-issuance",
  "support-message": "support-issuance",
};

scheduleRateLimitCleanup(VERIFY_RATE_LIMIT_CONFIG.windowMs);

export function buildPublicIntakeRateLimitKey(
  routeNamespace: string,
  request: Request,
): string {
  const operationNamespace =
    PUBLIC_INTAKE_OPERATION_BY_ROUTE[routeNamespace] ?? routeNamespace;
  return `${operationNamespace}:${getClientIp(request)}`;
}

export function enforcePublicIntakeRateLimit(
  request: Request,
  routeNamespace: string,
  config: PublicIntakeRateLimitConfig = VERIFY_RATE_LIMIT_CONFIG,
): NextResponse | null {
  const result = checkRateLimit(
    PUBLIC_INTAKE_RATE_LIMIT_NAMESPACE,
    buildPublicIntakeRateLimitKey(routeNamespace, request),
    config,
  );

  if (result.allowed) {
    return null;
  }

  return rateLimitedResponse(result.retryAfterSeconds);
}

export function enforcePublicIssuanceRecipientRateLimit(
  email: string,
  operationNamespace: string,
  config: PublicIntakeRateLimitConfig = PUBLIC_ISSUANCE_RECIPIENT_CONFIG,
): NextResponse | null {
  const recipientDigest = createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
  const result = checkRateLimit(
    PUBLIC_ISSUANCE_RECIPIENT_NAMESPACE,
    `${operationNamespace}:${recipientDigest}`,
    config,
  );

  if (result.allowed) return null;

  return rateLimitedResponse(result.retryAfterSeconds);
}

export function enforcePublicIssuanceRateLimits(
  email: string,
  operationNamespace: string,
  globalConfig: PublicIntakeRateLimitConfig = PUBLIC_ISSUANCE_GLOBAL_CONFIG,
  recipientConfig: PublicIntakeRateLimitConfig = PUBLIC_ISSUANCE_RECIPIENT_CONFIG,
): NextResponse | null {
  const globalResult = checkRateLimit(
    PUBLIC_ISSUANCE_GLOBAL_NAMESPACE,
    operationNamespace,
    globalConfig,
  );
  if (!globalResult.allowed) {
    return rateLimitedResponse(globalResult.retryAfterSeconds);
  }

  return enforcePublicIssuanceRecipientRateLimit(
    email,
    operationNamespace,
    recipientConfig,
  );
}
