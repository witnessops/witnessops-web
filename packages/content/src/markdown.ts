/**
 * Drop a single leading ATX H1 line from markdown body text.
 * Implemented without multi-quantifier regex to avoid ReDoS class findings.
 */
export function normalizeMarkdownBody(body: string): string {
  const normalized = body.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!normalized.startsWith("#") || normalized.startsWith("##")) {
    return normalized.trim();
  }

  // Require whitespace after a single `#` (ATX H1), not `##` headings.
  const afterHash = normalized.charAt(1);
  if (afterHash !== " " && afterHash !== "\t") {
    return normalized.trim();
  }

  const nl = normalized.indexOf("\n");
  if (nl === -1) {
    return "";
  }

  let rest = normalized.slice(nl + 1);
  // Drop one following blank line when present (common MD title spacing).
  if (rest.startsWith("\n")) {
    rest = rest.slice(1);
  }
  return rest.trim();
}
