import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

const SHA256_PREFIX = "sha256:";

function readSigningSecret(): string {
  const secret = process.env.WITNESSOPS_TOKEN_SIGNING_SECRET;
  if (!secret) {
    throw new Error("WITNESSOPS_TOKEN_SIGNING_SECRET is required");
  }
  return secret;
}

export function generateIssuanceId(): string {
  return `iss_${randomUUID().replace(/-/g, "")}`;
}

export function generateIntakeId(): string {
  return `intk_${randomUUID().replace(/-/g, "")}`;
}

export function generateThreadId(): string {
  return `thr_${randomUUID().replace(/-/g, "")}`;
}

export function generateRawToken(): string {
  return randomBytes(24).toString("base64url");
}

export function digestToken(rawToken: string): string {
  const digest = createHmac("sha256", readSigningSecret())
    .update(rawToken, "utf8")
    .digest("hex");
  return `${SHA256_PREFIX}${digest}`;
}

export function tokenDigestMatches(
  rawToken: string,
  expectedDigest: string,
): boolean {
  const actual = digestToken(rawToken);
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expectedDigest));
}
