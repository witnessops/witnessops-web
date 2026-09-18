import "server-only";

const SECRET_PATTERNS = [
  /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----/i,
  /\bAuthorization\s*:\s*Basic\s+[A-Za-z0-9+/=]{4,}/i,
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,
  /\b(?:sk|rk|pk)[_-](?:live|test|proj)?[_-]?[A-Za-z0-9_-]{16,}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/i,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/,
  /\b(?:aws[_-]?)?(?:secret[_-]?access[_-]?key|access[_-]?key|client[_-]?secret|password|passwd|secret|token|api[_ -]?key|private[_ -]?key)["']?\s*[:=]\s*["']?[A-Za-z0-9_./+=:-]{8,}/i,
] as const;

export function hasLikelySecret(input: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(input));
}
