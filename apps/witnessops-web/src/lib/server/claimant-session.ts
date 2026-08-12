import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const CLAIMANT_SESSION_COOKIE_PREFIX = "witnessops_claimant_session";
export const CLAIMANT_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

interface ClaimantSessionPayload {
  v: 1;
  issuanceId: string;
  email: string;
  exp: number;
}

interface ClaimantSessionSubject {
  issuanceId: string;
  email: string;
}

function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function claimantSessionCookieName(issuanceId: string): string {
  const suffix = createHash("sha256").update(issuanceId).digest("hex").slice(0, 16);
  return `${CLAIMANT_SESSION_COOKIE_PREFIX}_${suffix}`;
}

function readSecret(): string {
  const secret =
    process.env.WITNESSOPS_CLAIMANT_SESSION_SECRET?.trim() ||
    process.env.WITNESSOPS_TOKEN_SIGNING_SECRET?.trim();
  if (!secret) {
    throw new Error("Claimant session secret is not configured.");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", readSecret()).update(payload).digest("base64url");
}

function signaturesMatch(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) {
    return null;
  }
  for (const part of header.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName !== name) {
      continue;
    }
    const value = rawValue.join("=");
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

export function createClaimantSessionCookieValue(
  subject: ClaimantSessionSubject,
): string {
  const payload: ClaimantSessionPayload = {
    v: 1,
    issuanceId: subject.issuanceId,
    email: normaliseEmail(subject.email),
    exp: Date.now() + CLAIMANT_SESSION_MAX_AGE_SECONDS * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function claimantSessionCookieOptions(requestUrl: string) {
  return {
    httpOnly: true,
    maxAge: CLAIMANT_SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "strict" as const,
    secure: new URL(requestUrl).protocol === "https:",
  };
}

export function verifyClaimantSessionCookie(
  cookieValue: string | null | undefined,
  expected: ClaimantSessionSubject,
): boolean {
  if (!cookieValue) {
    return false;
  }

  const [encoded, signature, extra] = cookieValue.split(".");
  if (!encoded || !signature || extra !== undefined) {
    return false;
  }
  if (!signaturesMatch(sign(encoded), signature)) {
    return false;
  }

  let payload: ClaimantSessionPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as ClaimantSessionPayload;
  } catch {
    return false;
  }

  if (
    payload.v !== 1 ||
    typeof payload.issuanceId !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.exp !== "number"
  ) {
    return false;
  }

  return (
    payload.exp >= Date.now() &&
    payload.issuanceId === expected.issuanceId &&
    normaliseEmail(payload.email) === normaliseEmail(expected.email)
  );
}

export function isClaimantSessionAuthorized(
  request: Request,
  expected: ClaimantSessionSubject,
): boolean {
  const cookieValue = readCookie(
    request.headers.get("cookie"),
    claimantSessionCookieName(expected.issuanceId),
  );
  return verifyClaimantSessionCookie(cookieValue, expected);
}
