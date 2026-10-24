import "server-only";

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE = /(?:\+\d{1,3}[\s.-])?(?:\(\d{3}\)[\s.-]?|\d{3}[\s.-])\d{3}[\s.-]\d{4}|\+\d{10,15}/;
const URL = /(?:https?:\/\/|www\.)[^\s<>"']+/i;
const KEY = /wo_mcp_[A-Za-z0-9_-]+|(?:AKIA|ASIA)[0-9A-Z]{16}|(?:sk|rk|pk)[_-](?:live|test|proj)?[_-]?[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/;

function stripFormatChars(input: string): { text: string; stripped: boolean } {
  const text = input.replace(/\p{Cc}|\p{Cf}/gu, "");
  return { text, stripped: text !== input };
}

function replacePatterns(input: string): { text: string; replacements: number } {
  let replacements = 0;
  const text = input.replace(
    new RegExp(
      `${EMAIL.source}|${PHONE.source}|${URL.source}|${KEY.source}`,
      "gi",
    ),
    () => {
      replacements += 1;
      return "[redacted]";
    },
  );
  return { text, replacements };
}

export function sanitizeText(input: string): { text: string; redactions: number } {
  const stripped = stripFormatChars(input);
  const replaced = replacePatterns(stripped.text);
  return {
    text: replaced.text,
    redactions: (stripped.stripped ? 1 : 0) + replaced.replacements,
  };
}

export function hasSensitiveText(input: string): boolean {
  return sanitizeText(input).redactions > 0;
}

/**
 * Backstop for a serialized tool result. Replaces sensitive substrings.
 * The caller must parse the result again with the output schema.
 */
export function redactSerialized(input: string): { text: string; redactions: number } {
  return sanitizeText(input);
}
