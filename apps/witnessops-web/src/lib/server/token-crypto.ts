import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

const SHA256_PREFIX = "sha256:";
const HUMAN_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const HUMAN_CODE_LENGTH = 12;
const HUMAN_CODE_GROUP_SIZE = 4;

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

export function generateVerificationContext(): string {
  return randomBytes(24).toString("base64url");
}

export function generateIntakeId(): string {
  return `intk_${randomUUID().replace(/-/g, "")}`;
}

export function generateThreadId(): string {
  return `thr_${randomUUID().replace(/-/g, "")}`;
}

export function generateRawToken(): string {
  let code = "";

  while (code.length < HUMAN_CODE_LENGTH) {
    for (const byte of randomBytes(HUMAN_CODE_LENGTH)) {
      code += HUMAN_CODE_ALPHABET.charAt(byte & 31);
      if (code.length === HUMAN_CODE_LENGTH) break;
    }
  }

  return code
    .match(new RegExp(`.{1,${HUMAN_CODE_GROUP_SIZE}}`, "g"))!
    .join("-");
}

export function digestToken(rawToken: string): string {
  const digest = createHmac("sha256", readSigningSecret())
    .update(rawToken, "utf8")
    .digest("hex");
  return `${SHA256_PREFIX}${digest}`;
}

export function digestVerificationContext(context: string): string {
  const digest = createHmac("sha256", readSigningSecret())
    .update(`verification-context:${context}`, "utf8")
    .digest("hex");
  return `${SHA256_PREFIX}${digest}`;
}

export function tokenDigestMatches(
  rawToken: string,
  expectedDigest: string,
): boolean {
  for (const candidate of tokenCandidates(rawToken)) {
    const actual = digestToken(candidate);
    if (timingSafeEqual(Buffer.from(actual), Buffer.from(expectedDigest))) {
      return true;
    }
  }

  return false;
}

function normalizeHumanCode(rawToken: string): string {
  const compact = rawToken
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  if (compact.length !== HUMAN_CODE_LENGTH) {
    return rawToken.trim();
  }

  return compact
    .match(new RegExp(`.{1,${HUMAN_CODE_GROUP_SIZE}}`, "g"))!
    .join("-");
}

function tokenCandidates(rawToken: string): string[] {
  return Array.from(new Set([rawToken.trim(), normalizeHumanCode(rawToken)]));
}
